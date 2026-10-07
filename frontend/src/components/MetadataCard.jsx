const na = 'N/A';
const fmt = (v, suffix = '') => (v === undefined || v === null ? na : `${v}${suffix}`);

export default function MetadataCard({ metadata }) {
  const m = metadata;
  const rows = [
    ['Record ID', fmt(m?.record_id)],
    ['Source', fmt(m?.source)],
    ['Sampling frequency', fmt(m?.sampling_frequency, ' Hz')],
    ['Number of samples', m ? m.n_samples.toLocaleString() : na],
    ['Number of channels', fmt(m?.n_channels)],
    ['Channels', m ? m.channel_names.join(', ') || na : na],
    ['Duration', m ? `${m.duration_seconds.toFixed(1)} s` : na],
    ['Annotations', m ? (m.has_annotations ? 'Available' : 'Not available') : na],
  ];
  return (
    <section className="card">
      <h2>Record information</h2>
      <dl className="meta">
        {rows.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
      </dl>
      {m?.header_comments?.length > 0 && (
        <details>
          <summary>Header comments (raw text from .hea)</summary>
          <ul>{m.header_comments.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </details>
      )}
    </section>
  );
}
