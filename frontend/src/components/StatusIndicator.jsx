export default function StatusIndicator({ status = 'checking', label, showDot = true }) {
  const isOnline = status === 'online' || status === true;
  const isOffline = status === 'offline' || status === false;

  const dotClass = isOnline ? 'online' : isOffline ? 'offline' : '';
  const text = label || (isOnline ? 'System Online' : isOffline ? 'Offline' : 'Checking…');

  return (
    <div className="status-indicator">
      {showDot && <span className={`status-dot ${dotClass}`} />}
      <span style={{ color: isOnline ? 'var(--status-online)' : isOffline ? 'var(--status-offline)' : 'var(--text-muted)' }}>
        {text}
      </span>
    </div>
  );
}
