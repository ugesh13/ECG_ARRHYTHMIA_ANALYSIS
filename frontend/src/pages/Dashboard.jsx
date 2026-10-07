import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkHealth, getBenchmark, getErrorMessage, getModelInfo, listRecords } from '../services/api.js';
import Card from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import ECGLegend from '../components/ECGLegend.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageContainer from '../components/PageContainer.jsx';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [records, setRecords] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [benchmark, setBenchmark] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      checkHealth().catch(() => ({ status: 'unavailable', model_loaded: false })),
      listRecords().catch(() => ({ count: 0, records: [] })),
      getModelInfo().catch(() => null),
      getBenchmark().catch(() => null),
    ])
      .then(([h, r, m, b]) => {
        if (!active) return;
        setHealth(h);
        setRecords(r);
        setModelInfo(m);
        setBenchmark(b);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState label="Connecting to ECG Analysis Engine and retrieving experimental benchmarks…" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const isModelReady = health?.model_loaded || modelInfo?.model_loaded;
  const metrics = benchmark?.metrics;

  return (
    <PageContainer
      title="ECG Arrhythmia Telemetry & Diagnostic Platform"
      subtitle="Academic research and engineering prototype for automated multi-lead electrocardiogram signal processing, morphology extraction, and ANSI/AAMI EC57 arrhythmia detection."
      actions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/records" className="btn btn-secondary btn-sm">Browse Records</Link>
          <Link to="/analysis/100" className="btn btn-primary btn-sm">Analyze Record 100</Link>
        </div>
      }
    >
      {/* Real-time System & Benchmark KPI Grid */}
      <div className="stats-grid">
        <StatCard
          label="Available ECG Records"
          value={records?.count ?? 0}
          subtext="MIT-BIH + Verified Uploads"
          accentColor="var(--accent-cyan)"
          badge={<span className="badge badge-cyan">WFDB</span>}
        />

        <StatCard
          label="Inference Architecture"
          value={modelInfo?.model_type ? 'RF-200' : 'Random Forest'}
          subtext={`${modelInfo?.feature_dimension ?? 209}-D Pipeline (${modelInfo?.morphology_dimension ?? 200} Morph + ${modelInfo?.rr_dimension ?? 9} RR)`}
          accentColor="var(--color-class-N)"
          badge={
            <span className={`badge ${isModelReady ? 'badge-success' : 'badge-warning'}`}>
              {isModelReady ? '● Operational' : '○ Standby'}
            </span>
          }
        />

        <StatCard
          label="Locked DS2 Accuracy"
          value={metrics ? `${(metrics.accuracy * 100).toFixed(2)}%` : '—'}
          subtext={`Balanced: ${metrics ? (metrics.balanced_accuracy * 100).toFixed(2) + '%' : '—'}`}
          accentColor="var(--color-class-N)"
          badge={<span className="badge badge-default">Held-Out Test</span>}
        />

        <StatCard
          label="Locked DS2 Macro F1"
          value={metrics ? metrics.macro_f1.toFixed(4) : '—'}
          subtext={`Weighted: ${metrics ? metrics.weighted_f1.toFixed(4) : '—'}`}
          accentColor="var(--color-class-S)"
          badge={<span className="badge badge-default">Phase 8</span>}
        />

        <StatCard
          label="Evaluated Test Beats"
          value={metrics ? metrics.evaluated_beats.toLocaleString() : '—'}
          subtext="22 Inter-Patient Records"
          accentColor="var(--color-class-F)"
          badge={<span className="badge badge-default">AAMI DS2</span>}
        />
      </div>

      {/* Main Operational Modules */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <Card
          title="Clinical & ML Workflow Modules"
          subtitle="Navigate through signal telemetry, full-record inference, and model interpretability."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              to="/records"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>1. ECG Record Explorer</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Browse 48 MIT-BIH recordings across DS1 training/validation and DS2 test partitions.
                </div>
              </div>
            </Link>

            <Link
              to="/analysis/100"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>2. Live Record Arrhythmia Analysis</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Run end-to-end beat segmentation, 209-D feature extraction, and RF classification on Record 100.
                </div>
              </div>
            </Link>

            <Link
              to="/benchmark"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>3. Experimental Benchmark Dashboard</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Inspect the frozen 4×4 confusion matrix, per-class supports, and DS1 vs DS2 generalization gap.
                </div>
              </div>
            </Link>

            <Link
              to="/interpretability"
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>4. Model Interpretability & Features</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Analyze model-level Gini feature importance (preceding prematurity ratio: 5.82%, 26.38% temporal sum).
                </div>
              </div>
            </Link>
          </div>
        </Card>

        <Card
          title="Diagnostic Class Standard & Provenance"
          subtitle="Governed strictly by ANSI/AAMI EC57:1998 inter-patient partition."
        >
          <div style={{ marginBottom: '1rem' }}>
            <ECGLegend />
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Strict Inter-Record Partitioning:</strong> To prevent data leakage and inflated accuracy,
              patient records are strictly isolated into DS1 (training & validation) and DS2 (22 held-out test patients).
            </p>
            <p>
              <strong>Edge Beat Handling:</strong> The first and final beats of every recording lack complete
              preceding or subsequent RR temporal boundaries and are flagged as unclassified edge beats without fabricating synthetic intervals.
            </p>
          </div>
        </Card>
      </div>

      {/* Notice Banner */}
      <div className="disclaimer-banner">
        <div>⚠</div>
        <div>
          <strong>Academic Research Notice:</strong> This platform is an experiential learning prototype built for research, signal visualization, and algorithm benchmarking. It is not approved for clinical diagnostic intervention.
        </div>
      </div>
    </PageContainer>
  );
}
