import { Link } from 'react-router-dom';

/**
 * Analysis Dashboard card displaying execution controls, model metadata,
 * aggregate category breakdown (N/S/V/F/Edge), and clinical/academic disclaimer.
 */

export default function AnalysisCard({
  recordId,
  analysis = null,
  loading = false,
  error = null,
  hasAnnotations = true,
  onRunAnalysis,
  onForceRefresh,
}) {
  const counts = analysis?.aggregate_counts;
  const pcts = analysis?.percentages;
  const isNoAnnotations = hasAnnotations === false;

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Offline Beat-Level Arrhythmia Classification</h2>
          <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
            Frozen Phase 8 Random Forest (209 features: 200 morphology from preferred lead + 9 retrospective bidirectional RR intervals).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {analysis && !loading && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onForceRefresh}
              style={{ fontSize: '0.85rem' }}
              title="Bypass server cache and recompute analysis"
            >
              ↻ Re-run Analysis
            </button>
          )}

          {isNoAnnotations ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={true}
              title="Beat-level classification requires an expert reference annotation file (.atr)"
            >
              ⚠️ Requires .atr Annotations
            </button>
          ) : (
            <button
              type="button"
              className={`btn ${analysis ? 'btn-secondary' : 'btn-primary'}`}
              onClick={onRunAnalysis}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ marginRight: '6px' }} />
                  Analyzing ECG…
                </>
              ) : analysis ? (
                '✓ Analysis Completed'
              ) : (
                '▶ Analyze ECG Record'
              )}
            </button>
          )}
        </div>
      </div>

      {isNoAnnotations && (
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid var(--color-class-S-border)',
          borderRadius: 'var(--radius-md)',
          margin: '1rem 0',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>⚠️</div>
          <div style={{ fontWeight: 700, color: 'var(--color-class-S)', fontSize: '0.98rem', marginBottom: '0.35rem' }}>
            Annotation File (.atr) Not Available — Waveform Only Mode
          </div>
          <p style={{ margin: '0 auto 1rem', maxWidth: '640px', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            This recording does not have an expert reference annotation file (<code>.atr</code>). Because this system performs beat-level classification anchored to expert clinical fiducial markers (and does not implement an independent automated QRS/R-peak detector), automated heartbeat classification is unavailable for this file. You can still inspect the full multi-lead continuous ECG signal in Waveform Studio.
          </p>
          <Link to={`/waveform/${recordId}`} className="btn btn-secondary btn-sm">
            Open in Waveform Studio →
          </Link>
        </div>
      )}

      {loading && (
        <div style={{ padding: '1.5rem', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', textAlign: 'center', margin: '1rem 0', border: '1px solid var(--border-default)' }}>
          <span className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px' }} />
          <p style={{ margin: '0.5rem 0 0', fontWeight: 600, color: 'var(--text-primary)' }}>Executing arrhythmia classification on Record {recordId}…</p>
          <p className="muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            Slicing 200-sample morphology windows around expert fiducial points and computing 9-D bidirectional timing intervals.
          </p>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--color-class-V-border)', borderRadius: 'var(--radius-md)', margin: '1rem 0' }} role="alert">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="error-text" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {error.toLowerCase().includes('failed to fetch') || error.toLowerCase().includes('networkerror')
                ? '⚠️ Backend Server Offline'
                : '⚠️ Analysis Request Notice:'}
            </span>
            {!isNoAnnotations && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onRunAnalysis}>
                Retry Analysis
              </button>
            )}
          </div>
          <p className="error-text" style={{ margin: '0.35rem 0 0.5rem', fontSize: '0.88rem' }}>{error}</p>
          {(error.toLowerCase().includes('failed to fetch') || error.toLowerCase().includes('networkerror')) && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-2)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
              <strong>Presentation Action:</strong> The FastAPI backend server is not running on port 8000. Open a terminal and run:
              <code style={{ display: 'block', margin: '0.25rem 0 0', color: 'var(--accent-cyan)' }}>python -m uvicorn app.main:app --reload --port 8000</code>
            </div>
          )}
        </div>
      )}

      {analysis && !loading && (
        <>
          {/* Executive Metadata Overview */}
          <div style={{ background: 'var(--bg-surface-2)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', margin: '1rem 0' }}>
            <dl className="meta">
              <div>
                <dt>Analyzed Lead</dt>
                <dd>{analysis.lead_name} <span className="muted" style={{ fontSize: '0.72rem' }}>(Preferred single lead)</span></dd>
              </div>
              <div>
                <dt>Sampling Rate</dt>
                <dd>{analysis.sampling_rate} Hz</dd>
              </div>
              <div>
                <dt>Signal Duration</dt>
                <dd>{(analysis.duration_seconds / 60.0).toFixed(1)} min ({analysis.duration_seconds.toFixed(0)} s)</dd>
              </div>
              <div>
                <dt>Model Pipeline</dt>
                <dd>{analysis.model_name} <span className="muted" style={{ fontSize: '0.75rem' }}>({analysis.model_version})</span></dd>
              </div>
            </dl>
          </div>

          {/* Scientific Pipeline Reconciliation Note for Record 100 */}
          {recordId === '100' && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(0, 229, 255, 0.04)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: '0.75rem 0 1rem',
            }}>
              <strong style={{ color: 'var(--accent-cyan)' }}>Scientific Pipeline Note on Record 100 Beat Counts:</strong> Live analysis classifies <strong>2,271 beats</strong> (2,273 continuous WFDB annotations minus 2 boundary edge beats without complete bidirectional context). In the frozen precomputed DS2 benchmark table, Record 100 lists <strong>2,270 evaluated beats</strong>. This exact 1-beat difference occurs because the offline dataset builder excluded Beat 0 (at sample 18) due to recording-start boundary limits (18 - 90 pre-samples &lt; 0), after which the offline Phase 8 evaluator dropped the first and last beats of the preprocessed NPZ array. Both authoritative counts are mathematically accounted for and preserved.
            </div>
          )}

          {/* Arrhythmia Category Aggregate Breakdown */}
          <h3 style={{ fontSize: '0.95rem', margin: '1.25rem 0 0.5rem', fontWeight: 600 }}>
            Detected Heartbeat Categories & Burden (ANSI/AAMI EC57)
          </h3>
          <div className="stats-grid">
            <div className="stat-box stat-total">
              <div className="stat-title">Detected Beats</div>
              <div className="stat-value">{analysis.total_detected_beats.toLocaleString()}</div>
              <div className="stat-sub">{analysis.total_classified_beats.toLocaleString()} classified</div>
            </div>

            <div className="stat-box stat-N">
              <div className="stat-title">Class N (Normal)</div>
              <div className="stat-value">{counts?.normal_count.toLocaleString() || 0}</div>
              <div className="stat-sub">{pcts?.normal_percentage ?? 0}% of beats</div>
            </div>

            <div className="stat-box stat-S">
              <div className="stat-title">Class S (Supravent.)</div>
              <div className="stat-value">{counts?.supraventricular_count.toLocaleString() || 0}</div>
              <div className="stat-sub">{pcts?.supraventricular_percentage ?? 0}% of beats</div>
            </div>

            <div className="stat-box stat-V">
              <div className="stat-title">Class V (Ventricular)</div>
              <div className="stat-value">{counts?.ventricular_count.toLocaleString() || 0}</div>
              <div className="stat-sub">{pcts?.ventricular_percentage ?? 0}% of beats</div>
            </div>

            <div className="stat-box stat-F">
              <div className="stat-title">Class F (Fusion)</div>
              <div className="stat-value">{counts?.fusion_count.toLocaleString() || 0}</div>
              <div className="stat-sub">{pcts?.fusion_percentage ?? 0}% of beats</div>
            </div>

            <div className="stat-box stat-edge">
              <div className="stat-title">Boundary Edge Beats</div>
              <div className="stat-value">{counts?.unclassified_edge_count.toLocaleString() || 0}</div>
              <div className="stat-sub">{pcts?.unclassified_edge_percentage ?? 0}% (excluded)</div>
            </div>
          </div>

          {/* Medical/Academic Disclaimer */}
          <div className="disclaimer-box">
            <strong>Academic Research Notice:</strong> {analysis.disclaimer || 'Academic engineering demonstration for educational and scientific analysis only. Not an approved medical diagnostic device.'}
          </div>
        </>
      )}

      {!analysis && !loading && !error && !isNoAnnotations && (
        <div style={{
          textAlign: 'center',
          padding: '2rem 1.5rem',
          background: 'rgba(0, 229, 255, 0.03)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed rgba(0, 229, 255, 0.25)',
          margin: '1rem 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '580px', lineHeight: 1.5 }}>
            Click <strong>"Analyze ECG Record"</strong> above to extract 209-D morphological & bidirectional RR features from expert fiducial points and classify heartbeats across Record {recordId}.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRunAnalysis}
            style={{ marginTop: '0.25rem' }}
          >
            ▶ Analyze ECG Record
          </button>
        </div>
      )}
    </section>
  );
}
