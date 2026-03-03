export function createPeerConnection({ initiator, onSignal, onConnect, onData, onError, onClose }) {
  const SimplePeer = window.SimplePeer;
  if (!SimplePeer) {
    throw new Error('SimplePeer nao foi carregado. Verifique o script CDN no index.html.');
  }

  const peer = new SimplePeer({
    initiator,
    trickle: true,
  });

  peer.on('signal', onSignal);
  peer.on('connect', onConnect);
  peer.on('data', onData);
  peer.on('error', onError);
  peer.on('close', onClose);

  return peer;
}