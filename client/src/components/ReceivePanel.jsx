import ProgressBar from './shared/ProgressBar';

function ReceivePanel({ session }) {
  const { recvProgress, history } = session;

  return (
    <article className="card">
      <h2>Recebimento</h2>
      <p className="muted small">Arquivos recebidos sao baixados automaticamente no dispositivo receptor.</p>

      <ProgressBar label={recvProgress.label} percent={recvProgress.percent} />

      <h3>Historico da sessao</h3>
      <ul className="history-list">
        {history.map((entry, index) => (
          <li key={`${entry.at}-${index}`}>
            <span>{entry.message}</span>
            <span className="small muted">{entry.at}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default ReceivePanel;
