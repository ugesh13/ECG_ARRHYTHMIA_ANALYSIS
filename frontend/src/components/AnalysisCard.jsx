/**
 * Analysis Dashboard card displaying execution controls, model metadata,
 * aggregate category breakdown (N/S/V/F/Edge), and clinical/academic disclaimer.
 */

export default function AnalysisCard({
  recordId,
  analysis = null,
  loading = false,
  error = null,
  onRunAnalysis,
  onForceRefresh,
}) {
  const counts = analysis?.aggregate_counts;
  const pcts = analysis?.percentages;

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Automated Arrhythmia Analysis</h2>
          <p className="muted" style={{ margin: '0.2rem 0 0', fontSize: '0.85rem' }}>
            Powered by the frozen Phase 8 Random Forest classifier (209 features: 200 morphology + 9 bidirectional RR).
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

          <button
            type="button"
            className="btn"
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
        </div>
      </div>

      {loading && (
        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '6px', textAlign: 'center', margin: '1rem 0', border: '1px solid var(--line)' }}>
          <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }} />
          <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>Executing arrhythmia classification on Record {recordId}…</p>
          <p className="muted" style={{ fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
            Extracting 200-sample morphology windows and computing 9-D bidirectional timing intervals.
          </p>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '1rem', background: '#fdf2f2', border: '1px solid #f8b4b4', borderRadius: '6px', margin: '1rem 0' }} role="alert">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="error-text" style={{ fontWeight: 600 }}>Analysis Request Failed:</span>
            <button type="button" className="btn btn-secondary" onClick={onRunAnalysis} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>
              Retry Analysis
            </button>
          </div>
          <p className="error-text" style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{error}</p>
        </div>
      )}

      {analysis && !loading && (
        <>
          {/* Executive Metadata Overview */}
          <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '6px', border: '1px solid var(--line)', margin: '1rem 0' }}>
            <dl className="meta">
              <div>
                <dt>Record / Lead</dt>
                <dd>{analysis.record_id} ({analysis.lead_name})</dd>
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
            <strong>Notice:</strong> {analysis.disclaimer || 'Research prototype for educational/academic evaluation only. Not a clinical diagnostic device.'}
          </div>
        </>
      )}

      {!analysis && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fafbfc', borderRadius: '6px', border: '1px dashed var(--line)', margin: '1rem 0' }}>
          <p className="muted" style={{ margin: 0 }}>
            Click <strong>"Analyze ECG Record"</strong> above to extract 209-D morphological and bidirectional RR features
            and run classification across all heartbeats in Record {recordId}.
          </p>
        </div>
      )}
    </section>
  );
}
