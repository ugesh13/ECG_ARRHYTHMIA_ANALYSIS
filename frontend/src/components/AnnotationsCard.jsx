/** Shows annotations for the visible window. Symbols are shown as stored in the record. */
export default function AnnotationsCard({ annotations }) {
  if (!annotations) return null;
  if (!annotations.available) {
    return <section className="card"><h2>Annotations</h2><p className="muted">Not available for this record.</p></section>;
  }
  const counts = Object.entries(annotations.symbol_counts);
  return (
    <section className="card">
      <h2>Annotations</h2>
      <p className="muted">
        {annotations.total.toLocaleString()} annotations in the current window
        {annotations.total > annotations.annotations.length ? ` (showing first ${annotations.annotations.length})` : ''}.
      </p>
      <div className="chips">
        {counts.map(([sym, n]) => (
          <span key={sym} className="chip" title={annotations.symbol_descriptions[sym] || 'No description'}>
            {sym}: {n}
          </span>
        ))}
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead><tr><th>Time (s)</th><th>Sample</th><th>Symbol</th><th>Description</th><th>Note</th></tr></thead>
          <tbody>
            {annotations.annotations.map((a, i) => (
              <tr key={`${a.sample}-${a.symbol}-${i}`}>
                <td>{a.time.toFixed(3)}</td><td>{a.sample}</td><td>{a.symbol}</td>
                <td>{annotations.symbol_descriptions[a.symbol] || '—'}</td><td>{a.aux_note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
