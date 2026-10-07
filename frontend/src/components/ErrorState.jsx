export default function ErrorState({
  title = 'System Alert',
  message = 'An unexpected error occurred while communicating with the ECG backend.',
  onRetry = null,
}) {
  return (
    <div className="state-container" role="alert">
      <div className="state-icon" style={{ color: 'var(--status-offline)' }}>
        ⚠
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message" style={{ marginBottom: onRetry ? '1rem' : 0 }}>
        {message}
      </p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          ↻ Retry Connection
        </button>
      )}
    </div>
  );
}
