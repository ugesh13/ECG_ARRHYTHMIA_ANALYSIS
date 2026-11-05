export default function LoadingState({
  label = 'Processing ECG telemetry and model data…',
  subtext = null,
}) {
  return (
    <div className="state-container" aria-busy="true">
      <div className="spinner-ecg" />
      <p className="state-message" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      {subtext && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
          {subtext}
        </p>
      )}
    </div>
  );
}
