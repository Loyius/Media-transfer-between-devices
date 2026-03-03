import { useMemo, useState } from 'react';

function RoomPanel({ session }) {
  const {
    roomCode,
    roomCodeInput,
    setRoomCodeInput,
    status,
    transportMode,
    createRoom,
    joinRoom,
    copyRoomCode,
    leaveRoom,
  } = session;
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const transportLabel = useMemo(() => {
    const labels = {
      waiting: 'Aguardando pareamento',
      webrtc: 'WebRTC P2P',
      relay: 'WebSocket Relay (fallback)',
    };
    return labels[transportMode] || transportMode;
  }, [transportMode]);

  async function onCopyRoomCode() {
    const copied = await copyRoomCode();
    if (!copied) return;

    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 1400);
  }

  return (
    <section className="card">
      <h2>Pareamento</h2>
      <div className="row">
        <button onClick={createRoom}>Criar sala</button>
        <input
          type="text"
          maxLength={4}
          inputMode="numeric"
          placeholder="Codigo da sala"
          value={roomCodeInput}
          onChange={(event) => setRoomCodeInput(event.target.value.replace(/\D/g, '').slice(0, 4))}
        />
        <button className="secondary" onClick={joinRoom}>Entrar na sala</button>

        <div className="copy-wrap">
          <button className="secondary" disabled={roomCode === '----'} onClick={onCopyRoomCode}>Copiar codigo</button>
          {showCopiedToast && <span className="copy-toast">texto copiado</span>}
        </div>

        <button className="secondary" disabled={roomCode === '----'} onClick={leaveRoom}>Sair</button>
      </div>

      <div className="room-code">{roomCode}</div>
      <div className={`status ${status.tone}`}>{status.message}</div>
      <div className="muted small">Modo de transferencia: {transportLabel}</div>
    </section>
  );
}

export default RoomPanel;