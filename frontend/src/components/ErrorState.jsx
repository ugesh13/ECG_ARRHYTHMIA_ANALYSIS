import { Link } from 'react-router-dom';

export default function ErrorState({
  title = 'System Notice',
  message = 'An unexpected error occurred while communicating with the ECG backend.',
  onRetry = null,
  nextStep = null,
  actionLabel = null,
  actionLink = null,
}) {
  const isOffline =
    message?.toLowerCase().includes('failed to fetch') ||
    message?.toLowerCase().includes('networkerror') ||
    message?.toLowerCase().includes('offline');

  return (
    <div className="state-container" role="alert" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
      <div className="state-icon" style={{ color: 'var(--status-offline)', fontSize: '2rem', marginBottom: '0.5rem' }}>
        ⚠️
      </div>
      <h3 className="state-title" style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
        {title}
      </h3>
      <p className="state-message" style={{ color: 'var(--text-secondary)', maxWidth: '580px', margin: '0 auto 1rem', fontSize: '0.88rem' }}>
        {message}
      </p>

      {/* Suggested next steps / troubleshooting */}
      <div
        style={{
          maxWidth: '520px',
          margin: '0 auto 1.25rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-surface-2)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.82rem',
          textAlign: 'left',
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          Suggested Next Step:
        </div>
        {nextStep ? (
          <div>{nextStep}</div>
        ) : isOffline ? (
          <div>
            The backend API appears unreachable on port 8000. In a terminal, run:
            <code style={{ display: 'block', margin: '0.35rem 0', padding: '0.3rem 0.5rem', backgroundColor: 'var(--bg-surface-1)', color: 'var(--accent-cyan)' }}>
              python -m uvicorn app.main:app --reload --port 8000
            </code>
            Then click &ldquo;Retry Connection&rdquo; below.
          </div>
        ) : (
          <div>
            Check backend console logs for specific error details. If an artifact or record annotation is missing, verify file presence in <code>backend/data/</code>.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        {onRetry && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
            ↻ Retry Connection
          </button>
        )}
        {actionLink && actionLabel && (
          <Link to={actionLink} className="btn btn-primary btn-sm">
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
