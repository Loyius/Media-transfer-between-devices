import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSocketClient } from '../services/socketService';
import { createPeerConnection } from '../services/peerService';
import {
  base64ToUint8Array,
  sendFileInChunks,
  triggerDownload,
} from '../utils/transferUtils';
import { parsePeerMessage } from '../utils/uiUtils';

const RTC_TIMEOUT_MS = 7000;

export function useTransferSession() {
  const [roomCode, setRoomCode] = useState('----');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [status, setStatus] = useState({ message: 'Desconectado', tone: '' });
  const [transportMode, setTransportMode] = useState('waiting');
  const [connectionReady, setConnectionReady] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sendProgress, setSendProgress] = useState({ percent: 0, label: 'Sem transferencia em andamento.' });
  const [recvProgress, setRecvProgress] = useState({ percent: 0, label: 'Aguardando arquivos...' });
  const [history, setHistory] = useState([]);
  const [textPayload, setTextPayload] = useState('');
  const [receivedText, setReceivedText] = useState('');

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const roomCodeRef = useRef(null);
  const targetPeerIdRef = useRef(null);
  const transportRef = useRef('waiting');
  const receiveStateRef = useRef({ meta: null, chunks: [] });

  const previewItems = useMemo(() => {
    return selectedFiles.map((file, index) => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      return {
        id: `${file.name}-${index}`,
        file,
        kind: isImage ? 'image' : isVideo ? 'video' : 'file',
      };
    });
  }, [selectedFiles]);

  const addHistory = useCallback((message) => {
    setHistory((prev) => {
      const next = [{ message, at: new Date().toLocaleTimeString() }, ...prev];
      return next.slice(0, 20);
    });
  }, []);

  const updateStatus = useCallback((message, tone = '') => {
    setStatus({ message, tone });
  }, []);

  const syncReadyState = useCallback(() => {
    const hasPair = Boolean(roomCodeRef.current && targetPeerIdRef.current);
    if (!hasPair) {
      setConnectionReady(false);
      return;
    }

    if (transportRef.current === 'webrtc') {
      setConnectionReady(Boolean(peerRef.current && peerRef.current.connected));
      return;
    }

    if (transportRef.current === 'relay') {
      setConnectionReady(true);
      return;
    }

    setConnectionReady(false);
  }, []);

  const changeTransportMode = useCallback((mode) => {
    transportRef.current = mode;
    setTransportMode(mode);
    syncReadyState();
  }, [syncReadyState]);

  const destroyPeer = useCallback(() => {
    if (!peerRef.current) return;
    try {
      peerRef.current.destroy();
    } catch (error) {
      console.error(error);
    }
    peerRef.current = null;
  }, []);

  const sendPayload = useCallback((payload) => {
    if (transportRef.current === 'webrtc' && peerRef.current && peerRef.current.connected) {
      peerRef.current.send(JSON.stringify(payload));
      return;
    }

    if (!socketRef.current || !roomCodeRef.current || !targetPeerIdRef.current) {
      throw new Error('Sem peer conectado para envio.');
    }

    socketRef.current.emit('file-chunk', {
      roomCode: roomCodeRef.current,
      target: targetPeerIdRef.current,
      payload,
    });
  }, []);

  const handleIncomingPayload = useCallback((payload, source = 'relay') => {
    if (!payload || !payload.type) return;

    if (source === 'relay' && transportRef.current !== 'webrtc') {
      changeTransportMode('relay');
      syncReadyState();
    }

    if (payload.type === 'file-meta') {
      receiveStateRef.current = {
        meta: {
          fileName: payload.fileName,
          fileType: payload.fileType,
          fileSize: payload.fileSize,
          totalChunks: payload.totalChunks,
        },
        chunks: [],
      };
      setRecvProgress({ percent: 0, label: `Recebendo ${payload.fileName}...` });
      return;
    }

    if (payload.type === 'file-chunk' && receiveStateRef.current.meta) {
      const bytes = base64ToUint8Array(payload.data);
      receiveStateRef.current.chunks[payload.chunkIndex] = bytes;

      const progress = ((payload.chunkIndex + 1) / receiveStateRef.current.meta.totalChunks) * 100;
      setRecvProgress({
        percent: progress,
        label: `${receiveStateRef.current.meta.fileName}: ${progress.toFixed(1)}%`,
      });
      return;
    }

    if (payload.type === 'file-end' && receiveStateRef.current.meta) {
      const { fileName, fileType } = receiveStateRef.current.meta;
      triggerDownload(fileName, fileType, receiveStateRef.current.chunks);
      addHistory(`Recebido: ${fileName}`);
      setRecvProgress({ percent: 100, label: `${fileName}: download iniciado` });
      receiveStateRef.current = { meta: null, chunks: [] };
      return;
    }

    if (payload.type === 'text') {
      const value = payload.value || '';
      setReceivedText(value);
      addHistory('Texto recebido');
    }
  }, [addHistory, changeTransportMode, syncReadyState]);

  const ensurePeer = useCallback((initiator) => {
    destroyPeer();

    const rtcTimer = setTimeout(() => {
      if (transportRef.current !== 'webrtc' && targetPeerIdRef.current) {
        changeTransportMode('relay');
        updateStatus('WebRTC indisponivel, relay habilitado.', 'warn');
      }
    }, RTC_TIMEOUT_MS);

    const peer = createPeerConnection({
      initiator,
      onSignal: (signal) => {
        if (!socketRef.current || !roomCodeRef.current || !targetPeerIdRef.current) return;
        socketRef.current.emit('signal', {
          roomCode: roomCodeRef.current,
          target: targetPeerIdRef.current,
          signal,
        });
      },
      onConnect: () => {
        clearTimeout(rtcTimer);
        changeTransportMode('webrtc');
        updateStatus('Conexao P2P ativa.', 'ok');
      },
      onData: (raw) => {
        try {
          const payload = parsePeerMessage(raw);
          handleIncomingPayload(payload, 'webrtc');
        } catch (error) {
          console.error('Falha ao interpretar mensagem P2P', error);
        }
      },
      onError: () => {
        clearTimeout(rtcTimer);
        if (targetPeerIdRef.current && transportRef.current !== 'webrtc') {
          changeTransportMode('relay');
          updateStatus('Falha no WebRTC, relay habilitado.', 'warn');
        }
      },
      onClose: () => {
        clearTimeout(rtcTimer);
        if (roomCodeRef.current) {
          updateStatus('Conexao P2P encerrada.', 'warn');
        }
        if (targetPeerIdRef.current) {
          changeTransportMode('relay');
        } else {
          changeTransportMode('waiting');
        }
      },
    });

    peerRef.current = peer;
  }, [changeTransportMode, destroyPeer, handleIncomingPayload, updateStatus]);

  useEffect(() => {
    roomCodeRef.current = roomCode !== '----' ? roomCode : null;
  }, [roomCode]);

  useEffect(() => {
    const socket = createSocketClient();
    socketRef.current = socket;

    socket.on('peer-joined', ({ peerId }) => {
      targetPeerIdRef.current = peerId;
      updateStatus('Dispositivo pareado. Inicializando WebRTC...', 'ok');
      changeTransportMode('waiting');
      ensurePeer(true);
    });

    socket.on('signal', ({ from, signal }) => {
      targetPeerIdRef.current = from;
      if (!peerRef.current) {
        ensurePeer(false);
      }

      try {
        peerRef.current.signal(signal);
      } catch (error) {
        console.error('Erro ao aplicar signal', error);
      }
    });

    socket.on('file-chunk', ({ from, payload }) => {
      targetPeerIdRef.current = from;
      handleIncomingPayload(payload, 'relay');
      syncReadyState();
    });

    socket.on('peer-left', () => {
      targetPeerIdRef.current = null;
      destroyPeer();
      changeTransportMode('waiting');
      updateStatus('O outro dispositivo saiu da sala.', 'warn');
      syncReadyState();
    });

    return () => {
      if (roomCodeRef.current) {
        socket.emit('leave-room', { roomCode: roomCodeRef.current });
      }
      destroyPeer();
      socket.disconnect();
    };
  }, [changeTransportMode, destroyPeer, ensurePeer, handleIncomingPayload, syncReadyState, updateStatus]);

  useEffect(() => {
    function handleBeforeUnload() {
      if (roomCodeRef.current && socketRef.current) {
        socketRef.current.emit('leave-room', { roomCode: roomCodeRef.current });
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const createRoom = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.emit('create-room', (response) => {
      if (!response?.ok) {
        updateStatus('Falha ao criar sala.', 'warn');
        return;
      }

      setRoomCode(response.roomCode);
      setRoomCodeInput(response.roomCode);
      roomCodeRef.current = response.roomCode;
      targetPeerIdRef.current = null;
      changeTransportMode('waiting');
      updateStatus('Sala criada. Aguarde o outro dispositivo.', 'ok');
      syncReadyState();
    });
  }, [changeTransportMode, syncReadyState, updateStatus]);

  const joinRoom = useCallback(() => {
    const code = roomCodeInput.trim();
    if (!/^\d{4}$/.test(code)) {
      updateStatus('Use um codigo de 4 digitos.', 'warn');
      return;
    }

    socketRef.current.emit('join-room', { roomCode: code }, (response) => {
      if (!response?.ok) {
        updateStatus(response?.error || 'Falha ao entrar na sala.', 'warn');
        return;
      }

      setRoomCode(code);
      roomCodeRef.current = code;
      targetPeerIdRef.current = null;
      changeTransportMode('waiting');
      updateStatus('Conectado na sala. Aguardando handshake...', 'ok');
      syncReadyState();
    });
  }, [roomCodeInput, changeTransportMode, syncReadyState, updateStatus]);

  const onFileSelection = useCallback((files) => {
    setSelectedFiles(files);
  }, []);

  const sendSelectedFiles = useCallback(async () => {
    if (!selectedFiles.length) return;
    try {
      for (const file of selectedFiles) {
        addHistory(`Enviado: ${file.name}`);
        await sendFileInChunks({
          file,
          mode: transportRef.current,
          sendPayload,
          getBufferedAmount: () => peerRef.current?._channel?.bufferedAmount || 0,
          onProgress: (ratio) => {
            const percent = ratio * 100;
            setSendProgress({ percent, label: `${file.name}: ${percent.toFixed(1)}%` });
          },
        });
      }

      setSendProgress({ percent: 100, label: 'Todos os arquivos enviados.' });
    } catch (error) {
      console.error(error);
      updateStatus('Erro durante o envio.', 'warn');
    }
  }, [addHistory, selectedFiles, sendPayload, updateStatus]);

  const sendText = useCallback(() => {
    const value = textPayload.trim();
    if (!value) return;

    sendPayload({ type: 'text', value });
    addHistory('Texto enviado');
  }, [addHistory, sendPayload, textPayload]);

  const leaveRoom = useCallback(() => {
    if (roomCodeRef.current && socketRef.current) {
      socketRef.current.emit('leave-room', { roomCode: roomCodeRef.current });
    }

    setRoomCode('----');
    setRoomCodeInput('');
    roomCodeRef.current = null;
    targetPeerIdRef.current = null;
    setSelectedFiles([]);
    destroyPeer();
    changeTransportMode('waiting');
    setSendProgress({ percent: 0, label: 'Sem transferencia em andamento.' });
    setRecvProgress({ percent: 0, label: 'Aguardando arquivos...' });
    updateStatus('Desconectado', '');
    syncReadyState();
  }, [changeTransportMode, destroyPeer, syncReadyState, updateStatus]);

  const copyRoomCode = useCallback(async () => {
    if (roomCode === '----') return false;

    try {
      await navigator.clipboard.writeText(roomCode);
      updateStatus('Codigo copiado.', 'ok');
      return true;
    } catch (error) {
      updateStatus('Nao foi possivel copiar o codigo.', 'warn');
      return false;
    }
  }, [roomCode, updateStatus]);

  const copyReceivedText = useCallback(async () => {
    if (!receivedText) return false;

    try {
      await navigator.clipboard.writeText(receivedText);
      updateStatus('Texto recebido copiado.', 'ok');
      return true;
    } catch (error) {
      updateStatus('Falha ao copiar texto.', 'warn');
      return false;
    }
  }, [receivedText, updateStatus]);

  return {
    roomCode,
    roomCodeInput,
    setRoomCodeInput,
    status,
    transportMode,
    connectionReady,
    selectedFiles,
    previewItems,
    sendProgress,
    recvProgress,
    history,
    textPayload,
    setTextPayload,
    receivedText,
    createRoom,
    joinRoom,
    leaveRoom,
    copyRoomCode,
    onFileSelection,
    sendSelectedFiles,
    sendText,
    copyReceivedText,
  };
}
