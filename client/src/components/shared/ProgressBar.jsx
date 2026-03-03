function ProgressBar({ label, percent }) {
  return (
    <div className="progress-wrap">
      <div className="small muted">{label}</div>
      <div className="progress-track">
        <span className="progress-value" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}

export default ProgressBar;
