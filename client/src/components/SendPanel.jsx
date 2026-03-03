import { useMemo } from 'react';
import ProgressBar from './shared/ProgressBar';
import FilePreview from './shared/FilePreview';

function SendPanel({ session }) {
  const {
    connectionReady,
    previewItems,
    sendProgress,
    onFileSelection,
    sendSelectedFiles,
  } = session;

  const canSend = useMemo(() => connectionReady && previewItems.length > 0, [connectionReady, previewItems.length]);

  function onInputChange(event) {
    onFileSelection(Array.from(event.target.files || []));
  }

  function onDrop(event) {
    event.preventDefault();
    if (!connectionReady) return;
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) {
      onFileSelection(files);
    }
  }

  function onDragOver(event) {
    event.preventDefault();
  }

  return (
    <article className="card">
      <h2>Envio</h2>

      <div className="drop-zone" onDrop={onDrop} onDragOver={onDragOver}>
        Arraste arquivos aqui ou selecione abaixo.
        <div className="row center">
          <input type="file" multiple disabled={!connectionReady} onChange={onInputChange} />
          <button disabled={!canSend} onClick={sendSelectedFiles}>Enviar selecionados</button>
        </div>
      </div>

      <ProgressBar label={sendProgress.label} percent={sendProgress.percent} />
      <FilePreview items={previewItems} />
    </article>
  );
}

export default SendPanel;
