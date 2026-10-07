export default function ErrorState({ message, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <p>{message || 'Something went wrong.'}</p>
      {onRetry && <button className="btn btn-secondary" onClick={onRetry}>Retry</button>}
    </div>
  );
}
