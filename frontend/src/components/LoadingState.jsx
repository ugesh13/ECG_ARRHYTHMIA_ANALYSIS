export default function LoadingState({
  label = 'Processing ECG telemetry and model data…',
}) {
  return (
    <div className="state-container" aria-busy="true">
      <div className="spinner-ecg" />
      <p className="state-message" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
    </div>
  );
}
