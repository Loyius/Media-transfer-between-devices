import { useState } from 'react';

function TextSyncPanel({ session }) {
  const {
    connectionReady,
    textPayload,
    setTextPayload,
    sendText,
    receivedText,
    copyReceivedText,
  } = session;
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  async function onCopyReceivedText() {
    const copied = await copyReceivedText();
    if (!copied) return;

    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 1400);
  }

  return (
    <section className="grid two-col">
      <article className="card">
        <h2>Texto rapido</h2>
        <p className="small muted">Sincronizacao de clipboard entre dispositivos na sessao ativa.</p>
        <textarea
          rows={6}
          value={textPayload}
          onChange={(event) => setTextPayload(event.target.value)}
          placeholder="Digite o texto para enviar"
        />
        <div className="row">
          <button disabled={!connectionReady || !textPayload.trim()} onClick={sendText}>Enviar texto</button>
        </div>
      </article>

      <article className="card">
        <h2>Texto recebido</h2>
        <pre className="received-box">{receivedText}</pre>
        <div className="copy-wrap">
          <button className="secondary" disabled={!receivedText} onClick={onCopyReceivedText}>Copiar texto recebido</button>
          {showCopiedToast && <span className="copy-toast">texto copiado</span>}
        </div>
      </article>
    </section>
  );
}

export default TextSyncPanel;