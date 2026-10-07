/**
 * Detailed single-beat prediction inspector.
 * Displays predicted class, confidence, calibrated class probabilities,
 * ground truth annotation comparison, and electrophysiological descriptions.
 */

import { Link } from 'react-router-dom';

const CLASS_DESCRIPTIONS = {
  N: 'Non-ectopic / Normal Sinus: Regular rhythm, normal sinus beats, or bundle branch blocks (LBBB/RBBB).',
  S: 'Supraventricular Ectopic: Premature contraction originating above ventricles (atrial/nodal premature).',
  V: 'Ventricular Ectopic: Premature contraction originating in ventricular myocardium (PVC/ventricular escape).',
  F: 'Fusion Beat: Cardiac cycle resulting from simultaneous ventricular and supraventricular depolarization.',
  unclassified_edge_beat: 'Boundary Beat: First or last beat in recording lacking preceding/succeeding RR interval.',
};

export default function PredictionCard({ beat = null, recordId = null }) {
  if (!beat) {
    return (
      <section className="card card-disabled">
        <h2>Beat Prediction Details</h2>
        <p className="muted">
          Select any heartbeat row from the beat table below to inspect its individual
          prediction, confidence, and 4-class probability distribution.
        </p>
      </section>
    );
  }

  const isEdge = !beat.is_valid || beat.predicted_class === 'unclassified_edge_beat';
  const badgeClass = isEdge ? 'badge-edge' : `badge-${beat.predicted_class}`;
  const probs = beat.probabilities || { N: 0, S: 0, V: 0, F: 0 };
  const description = CLASS_DESCRIPTIONS[beat.predicted_class] || 'Arrhythmia category';
  const targetRecord = beat.record_id || recordId;

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>
          Beat #{beat.beat_index} Prediction <span className="muted">— t = {beat.time_seconds.toFixed(3)} s (Sample {beat.sample_index})</span>
        </h2>
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`badge ${badgeClass}`} style={{ fontSize: '0.85rem', padding: '0.25rem 0.65rem' }}>
            {isEdge ? 'Excluded Edge Beat' : `Predicted: Class ${beat.predicted_class}`}
          </span>
          {targetRecord && (
            <>
              <Link
                to={`/beat/${targetRecord}/${beat.beat_index}`}
                className="btn btn-secondary btn-sm"
              >
                Beat Inspector →
              </Link>
              <Link
                to={`/prediction/${targetRecord}/${beat.beat_index}`}
                className="btn btn-outline btn-sm"
              >
                Confidence Studio →
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid" style={{ marginBottom: '1rem' }}>
        <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
          <div className="stat-title">Model Prediction</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Georgia, serif' }}>
              {isEdge ? 'Edge Beat' : `Class ${beat.predicted_class}`}
            </span>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              {isEdge ? '(Excluded)' : `(${(beat.confidence * 100).toFixed(1)}% confidence)`}
            </span>
          </div>
          <p className="muted" style={{ fontSize: '0.85rem', margin: '0.4rem 0 0' }}>
            {description}
          </p>
          {isEdge && beat.exclusion_reason && (
            <p className="error-text" style={{ fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
              Reason: {beat.exclusion_reason}
            </p>
          )}
        </div>

        <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
          <div className="stat-title">Reference Annotation (Ground Truth)</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Georgia, serif' }}>
              Symbol: '{beat.symbol || '?'}'
            </span>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              {beat.ground_truth_class ? `(AAMI Class ${beat.ground_truth_class})` : '(No AAMI class)'}
            </span>
          </div>
          <p className="muted" style={{ fontSize: '0.85rem', margin: '0.4rem 0 0' }}>
            PhysioNet cardiologist expert reference annotation from MIT-BIH dataset.
          </p>
          {!isEdge && beat.ground_truth_class && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>
              {beat.predicted_class === beat.ground_truth_class ? (
                <span className="ok" style={{ fontWeight: 600 }}>✓ Model agrees with expert annotation</span>
              ) : (
                <span className="error-text" style={{ fontWeight: 600 }}>≠ Model divergence from expert annotation</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.75rem', fontWeight: 600 }}>
          Class Probabilities Distribution [P(N), P(S), P(V), P(F)]
        </h3>
        {isEdge ? (
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Class probabilities are not computed for boundary edge beats due to undefined temporal interval boundaries.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {[
              { key: 'N', name: 'Normal (N)', fill: 'fill-N' },
              { key: 'S', name: 'Supraventricular (S)', fill: 'fill-S' },
              { key: 'V', name: 'Ventricular (V)', fill: 'fill-V' },
              { key: 'F', name: 'Fusion (F)', fill: 'fill-F' },
            ].map(({ key, name, fill }) => {
              const val = probs[key] || 0;
              const pct = (val * 100).toFixed(1);
              return (
                <div key={key} className="prob-meter-wrap">
                  <div className="prob-meter-label">
                    <span style={{ fontWeight: 600 }}>{name}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="prob-meter-track">
                    <div className={`prob-meter-fill ${fill}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
