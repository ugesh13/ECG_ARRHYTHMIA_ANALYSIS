import { useMemo, useState } from 'react';

const PAGE_SIZES = [25, 50, 100];

export default function BeatTableCard({ beats = [], selectedBeatIndex = null, onSelectBeat }) {
  const [filterClass, setFilterClass] = useState('ALL');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

  // Filter beats according to selection
  const filteredBeats = useMemo(() => {
    if (!beats || beats.length === 0) return [];
    if (filterClass === 'ALL') return beats;
    if (filterClass === 'ECTOPIC') {
      return beats.filter((b) => b.is_valid && ['S', 'V', 'F'].includes(b.predicted_class));
    }
    if (filterClass === 'EDGE') {
      return beats.filter((b) => !b.is_valid || b.predicted_class === 'unclassified_edge_beat');
    }
    return beats.filter((b) => b.predicted_class === filterClass);
  }, [beats, filterClass]);

  const totalPages = Math.ceil(filteredBeats.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const startIdx = currentPage * pageSize;
  const currentBeats = filteredBeats.slice(startIdx, startIdx + pageSize);

  const jumpToFirstEctopic = () => {
    const ectopicIdx = beats.findIndex((b) => b.is_valid && ['S', 'V', 'F'].includes(b.predicted_class));
    if (ectopicIdx !== -1) {
      setFilterClass('ALL');
      const targetPage = Math.floor(ectopicIdx / pageSize);
      setPage(targetPage);
      onSelectBeat?.(beats[ectopicIdx]);
    }
  };

  if (!beats || beats.length === 0) return null;

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Beat-by-Beat Arrhythmia Table</h2>
          <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
            Showing {filteredBeats.length.toLocaleString()} of {beats.length.toLocaleString()} detected heartbeats.
            Click any row to inspect calibrated probabilities.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={jumpToFirstEctopic}
            style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
          >
            ⚡ Jump to Ectopic Beat
          </button>

          <label style={{ fontSize: '0.85rem' }}>
            Filter:&nbsp;
            <select
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setPage(0); }}
              style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid var(--line)' }}
            >
              <option value="ALL">All Beats ({beats.length})</option>
              <option value="ECTOPIC">Ectopic Only (S, V, F)</option>
              <option value="N">Class N — Normal Sinus</option>
              <option value="S">Class S — Supraventricular</option>
              <option value="V">Class V — Ventricular Ectopic</option>
              <option value="F">Class F — Fusion</option>
              <option value="EDGE">Edge / Excluded Beats</option>
            </select>
          </label>

          <label style={{ fontSize: '0.85rem' }}>
            Rows:&nbsp;
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid var(--line)' }}
            >
              {PAGE_SIZES.map((sz) => <option key={sz} value={sz}>{sz} / page</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="table-scroll" style={{ maxHeight: '420px' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Beat #</th>
              <th>Time (s)</th>
              <th>Ground Truth</th>
              <th>Model Prediction</th>
              <th>Confidence</th>
              <th>P(N)</th>
              <th>P(S)</th>
              <th>P(V)</th>
              <th>P(F)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentBeats.map((b) => {
              const isSelected = selectedBeatIndex === b.beat_index;
              const isEdge = !b.is_valid || b.predicted_class === 'unclassified_edge_beat';
              const badgeClass = isEdge ? 'badge-edge' : `badge-${b.predicted_class}`;
              const probs = b.probabilities || { N: 0, S: 0, V: 0, F: 0 };

              return (
                <tr
                  key={b.beat_index}
                  className={isSelected ? 'tr-selectable tr-selected' : 'tr-selectable'}
                  onClick={() => onSelectBeat?.(b)}
                  title="Click to view full probabilities and morphology details"
                >
                  <td style={{ fontWeight: 600 }}>#{b.beat_index}</td>
                  <td>{b.time_seconds.toFixed(3)}s</td>
                  <td>
                    <span className="badge badge-muted">
                      {b.symbol || '?'} {b.ground_truth_class ? `(${b.ground_truth_class})` : ''}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${badgeClass}`}>
                      {isEdge ? 'Edge Beat' : `Class ${b.predicted_class}`}
                    </span>
                  </td>
                  <td style={{ fontWeight: isEdge ? 400 : 600 }}>
                    {isEdge ? '0.0%' : `${(b.confidence * 100).toFixed(1)}%`}
                  </td>
                  <td>{isEdge ? '—' : `${(probs.N * 100).toFixed(1)}%`}</td>
                  <td>{isEdge ? '—' : `${(probs.S * 100).toFixed(1)}%`}</td>
                  <td>{isEdge ? '—' : `${(probs.V * 100).toFixed(1)}%`}</td>
                  <td>{isEdge ? '—' : `${(probs.F * 100).toFixed(1)}%`}</td>
                  <td>
                    {isEdge ? (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>Excluded</span>
                    ) : (
                      <span className="ok" style={{ fontSize: '0.8rem' }}>Classified</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {currentBeats.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }} className="muted">
                  No beats found matching the filter "{filterClass}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          Page {currentPage + 1} of {totalPages} (Rows {startIdx + 1}–{Math.min(startIdx + pageSize, filteredBeats.length)})
        </span>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={currentPage <= 0}
            onClick={() => setPage(Math.max(0, currentPage - 1))}
            style={{ padding: '0.35rem 0.75rem' }}
          >
            ← Previous
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage(currentPage + 1)}
            style={{ padding: '0.35rem 0.75rem' }}
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}
