import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAnalysisSummary, getBeatDetail, getErrorMessage } from '../services/api.js';
import { AAMI_CLASSES, getAnnotationMeta, getRecordPartition } from '../utils/aamiTaxonomy.js';
import { CANONICAL_RR_FEATURES } from '../utils/rrFeatures.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import ClassBadge from '../components/ClassBadge.jsx';
import ECGLegend from '../components/ECGLegend.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

/** Custom Tooltip for Morphology Chart */
function MorphologyTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const sampleIdx = Number(label);
  const offset = payload[0]?.payload?.offset;
  const val = payload[0]?.value;

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '0.6rem 0.85rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        fontSize: '0.82rem',
        minWidth: '160px',
      }}
    >
      <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '0.2rem' }}>
        Sample Index: <strong style={{ color: '#f8fafc' }}>{sampleIdx} / 199</strong>
      </div>
      <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '0.35rem' }}>
        R-Peak Offset: <strong style={{ color: '#00e5ff' }}>{offset > 0 ? `+${offset}` : offset}</strong>
      </div>
      <div style={{ color: '#00e5ff', fontWeight: 700, fontFamily: 'monospace' }}>
        Normalized Amplitude: {typeof val === 'number' ? val.toFixed(4) : val}
      </div>
    </div>
  );
}

export default function BeatInspector() {
  const { recordId, beatIndex } = useParams();
  const navigate = useNavigate();
  const currentBeatIdx = parseInt(beatIndex, 10) || 0;

  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jumpInput, setJumpInput] = useState('');

  // 1. Fetch Beat Details
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getBeatDetail(recordId, currentBeatIdx)
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [recordId, currentBeatIdx]);

  // 2. Fetch Record Summary (for total beats count and context)
  useEffect(() => {
    let active = true;
    getAnalysisSummary(recordId)
      .then((res) => {
        if (active) setSummary(res);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [recordId]);

  const handleJump = (e) => {
    e.preventDefault();
    const parsed = parseInt(jumpInput, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      navigate(`/beat/${recordId}/${parsed}`);
      setJumpInput('');
    }
  };

  if (loading) {
    return (
      <LoadingState
        label={`Fetching 209-D beat telemetry for Beat #${currentBeatIdx} in Record ${recordId}…`}
      />
    );
  }

  if (error) {
    return (
      <PageContainer
        title="Beat Inspector"
        subtitle={`Error retrieving Beat #${currentBeatIdx} for Record ${recordId}.`}
      >
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
        />
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <Link to={`/waveform/${recordId}`} className="btn btn-secondary btn-sm">
            ← Return to Waveform Viewer
          </Link>
          <Link to={`/analysis/${recordId}`} className="btn btn-primary btn-sm">
            Full Record Analysis
          </Link>
        </div>
      </PageContainer>
    );
  }

  const isEdge = Boolean(data?.is_edge_beat);
  const predClass = data?.predicted_class;
  const gtClass = data?.ground_truth_class;
  const gtSymbol = data?.ground_truth_symbol;
  const totalBeats = summary?.total_beats_detected || summary?.valid_beats_analyzed || null;
  const partition = getRecordPartition(recordId);

  // Reference Agreement Status
  const isMatch = !isEdge && predClass && gtClass && predClass === gtClass;
  const isMismatch = !isEdge && predClass && gtClass && predClass !== gtClass;

  // Morphology samples array (0-199)
  const morphologySamples = Array.isArray(data?.morphology?.samples)
    ? data.morphology.samples
    : [];
  const morphologyOffsets = Array.isArray(data?.morphology?.sample_offsets)
    ? data.morphology.sample_offsets
    : [];

  const morphologyValid = morphologySamples.length === 200;
  const morphologyChartData = morphologySamples.map((v, i) => ({
    index: i,
    offset: morphologyOffsets[i] !== undefined ? morphologyOffsets[i] : i - 90,
    amplitude: v,
  }));

  // Canonical Probabilities in exact semantic order: P(N), P(S), P(V), P(F)
  const probs = data?.probabilities || null;
  const probabilityList = probs
    ? [
        {
          key: 'N',
          name: 'Normal / Non-ectopic',
          prob: typeof probs.N === 'number' ? probs.N : null,
          color: '#10b981',
          classInfo: AAMI_CLASSES.N,
        },
        {
          key: 'S',
          name: 'Supraventricular Ectopic',
          prob: typeof probs.S === 'number' ? probs.S : null,
          color: '#f59e0b',
          classInfo: AAMI_CLASSES.S,
        },
        {
          key: 'V',
          name: 'Ventricular Ectopic',
          prob: typeof probs.V === 'number' ? probs.V : null,
          color: '#ef4444',
          classInfo: AAMI_CLASSES.V,
        },
        {
          key: 'F',
          name: 'Fusion Beat',
          prob: typeof probs.F === 'number' ? probs.F : null,
          color: '#a855f7',
          classInfo: AAMI_CLASSES.F,
        },
      ]
    : [];

  return (
    <PageContainer
      title={`Beat Inspector — Beat #${currentBeatIdx}`}
      subtitle={`High-resolution inspection of an individual MIT-BIH ECG beat and the model features used for classification.`}
      breadcrumbs={
        <>
          <Link to="/records">Records</Link>
          <span>/</span>
          <Link to={`/waveform/${recordId}`}>Record {recordId} Studio</Link>
          <span>/</span>
          <span>Beat #{currentBeatIdx}</span>
        </>
      }
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to={`/waveform/${recordId}`} className="btn btn-secondary btn-sm">
            ← Back to Waveform
          </Link>
          <Link
            to={`/prediction/${recordId}/${currentBeatIdx}`}
            className="btn btn-secondary btn-sm"
          >
            Prediction Confidence Studio →
          </Link>
          <Link to={`/analysis/${recordId}`} className="btn btn-primary btn-sm">
            Analyze Full Record
          </Link>
        </div>
      }
    >
      {/* 1. Beat Navigation Toolbar */}
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* Previous / Next Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => navigate(`/beat/${recordId}/${Math.max(0, currentBeatIdx - 1)}`)}
              disabled={currentBeatIdx <= 0}
              className="btn btn-secondary btn-sm"
              title="Navigate to preceding beat"
              aria-label="Previous beat"
            >
              ◀ Previous Beat (#{Math.max(0, currentBeatIdx - 1)})
            </button>
            <span
              className="font-mono"
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                padding: '0.2rem 0.5rem',
              }}
            >
              Beat #{currentBeatIdx}
              {totalBeats ? ` of ${totalBeats.toLocaleString()}` : ''}
            </span>
            <button
              type="button"
              onClick={() => navigate(`/beat/${recordId}/${currentBeatIdx + 1}`)}
              disabled={totalBeats !== null && currentBeatIdx >= totalBeats - 1}
              className="btn btn-secondary btn-sm"
              title="Navigate to subsequent beat"
              aria-label="Next beat"
            >
              Next Beat (#{currentBeatIdx + 1}) ▶
            </button>
          </div>

          {/* Quick Jump Input */}
          <form onSubmit={handleJump} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="jump-beat" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Jump to Beat #:
            </label>
            <input
              id="jump-beat"
              type="number"
              min="0"
              max={totalBeats ? totalBeats - 1 : undefined}
              placeholder="e.g. 42"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              style={{
                width: '80px',
                padding: '0.3rem 0.5rem',
                backgroundColor: 'var(--bg-surface-2)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
            <button type="submit" className="btn btn-outline btn-sm">
              Go
            </button>
          </form>
        </div>
      </Card>

      {/* 2. Top Metric Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard
          label="Beat Identity"
          value={`Beat #${currentBeatIdx}`}
          badge={<span className={`badge ${partition.badge}`}>{partition.name}</span>}
          subtext={`Record ${recordId} • Sample #${data?.sample_index?.toLocaleString()}`}
          accentColor="#00e5ff"
        />

        <StatCard
          label="Predicted Class"
          value={
            isEdge ? (
              <span style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>Not Classified</span>
            ) : (
              <ClassBadge cls={predClass} showDescription size="lg" />
            )
          }
          subtext={
            isEdge
              ? 'Boundary Beat (Excluded from inference)'
              : `Classification: Class ${predClass}`
          }
          accentColor={
            predClass === 'N'
              ? '#10b981'
              : predClass === 'S'
              ? '#f59e0b'
              : predClass === 'V'
              ? '#ef4444'
              : predClass === 'F'
              ? '#a855f7'
              : '#64748b'
          }
        />

        <StatCard
          label="Model Confidence"
          value={
            isEdge ? (
              <span style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>Not Applicable</span>
            ) : (
              `${((data?.confidence || 0) * 100).toFixed(1)}%`
            )
          }
          subtext={
            isEdge
              ? 'Sentinel zero (not evaluated)'
              : `Predicted-Class Probability: ${data?.confidence?.toFixed(4)}`
          }
          accentColor="#38bdf8"
        />

        <StatCard
          label="Reference Label (GT)"
          value={
            gtClass ? (
              <ClassBadge cls={gtClass} symbol={gtSymbol} showDescription size="lg" />
            ) : (
              <span style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>Unavailable</span>
            )
          }
          subtext={
            gtSymbol
              ? `PhysioNet Annotation: [${gtSymbol}] ${getAnnotationMeta(gtSymbol).description}`
              : 'Ground truth not recorded'
          }
          accentColor="#a855f7"
        />
      </div>

      {/* 3. Prediction & Ground Truth Agreement Panel */}
      <Card
        title="Prediction & Reference Comparison"
        subtitle="Evaluation of the model prediction against the validated MIT-BIH reference annotation."
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${
              isMatch
                ? 'rgba(16, 185, 129, 0.4)'
                : isMismatch
                ? 'rgba(239, 68, 68, 0.4)'
                : 'var(--border-subtle)'
            }`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '1.75rem' }}>
              {isEdge ? '⏹️' : isMatch ? '✅' : isMismatch ? '⚠️' : 'ℹ️'}
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: '1rem',
                    letterSpacing: '0.5px',
                    color: isMatch
                      ? 'var(--color-class-N)'
                      : isMismatch
                      ? 'var(--color-class-V)'
                      : 'var(--text-primary)',
                  }}
                >
                  {isEdge
                    ? 'BOUNDARY BEAT'
                    : isMatch
                    ? 'REFERENCE MATCH'
                    : isMismatch
                    ? 'REFERENCE MISMATCH'
                    : 'REFERENCE LABEL UNAVAILABLE'}
                </span>
                <span className="badge badge-default" style={{ fontSize: '0.75rem' }}>
                  Status: {data?.status || 'classified'}
                </span>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {isEdge
                  ? 'Boundary beat — excluded from model classification due to insufficient temporal context at record edges.'
                  : isMatch
                  ? 'Model prediction agrees with the reference annotation.'
                  : isMismatch
                  ? 'Model prediction differs from the reference annotation. Disagreement reflects morphological or temporal edge cases.'
                  : 'Reference ground-truth annotation is not available for this heartbeat.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link
              to={`/prediction/${recordId}/${currentBeatIdx}`}
              className="btn btn-secondary btn-sm"
            >
              Inspect Probability Breakdown →
            </Link>
          </div>
        </div>
      </Card>

      {/* 4. Morphology Visualization (200 Normalized Samples) */}
      <Card
        title="Beat Morphology Feature Vector (200 Samples)"
        subtitle="200-sample normalized beat morphology produced by the frozen feature-extraction pipeline."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Dimension: {morphologySamples.length} / 200
            </span>
          </div>
        }
      >
        {morphologyValid ? (
          <div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={morphologyChartData}
                margin={{ top: 16, right: 24, bottom: 8, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="index"
                  type="number"
                  domain={[0, 199]}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  label={{
                    value: 'Morphology Sample Index (0–199)',
                    position: 'insideBottomRight',
                    offset: -4,
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  width={52}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => typeof v === 'number' ? v.toFixed(1) : v}
                  label={{
                    value: 'Normalized Amplitude',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<MorphologyTooltip />} />
                <ReferenceLine
                  x={90}
                  stroke="#ef4444"
                  strokeDasharray="4 2"
                  strokeWidth={1.5}
                  label={{
                    value: 'R-Peak (Offset 0)',
                    position: 'top',
                    fill: '#ef4444',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />
                <ReferenceLine y={0} stroke="#334155" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="amplitude"
                  stroke="#00e5ff"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Morphology Educational Context */}
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
              }}
            >
              <p>
                <strong>Scientific Architecture Note:</strong> These 200 values represent the normalized beat morphology produced by the frozen feature-extraction pipeline. The frontend visualizes the backend feature vector and does not recompute preprocessing.
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            Morphology data unavailable for this beat.
          </div>
        )}
      </Card>

      {/* 5. 9 Canonical Bidirectional RR Features */}
      <Card
        title="Extracted Bidirectional RR Timing Features (9-D)"
        subtitle="Exactly 9 canonical timing features in frozen order as defined in Phase 8 and evaluated in DS2."
      >
        {data?.rr_features ? (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {CANONICAL_RR_FEATURES.map((feat, idx) => {
                const val = data.rr_features[feat.key];
                const isAvail = val !== null && val !== undefined && !Number.isNaN(val);

                return (
                  <div
                    key={feat.key}
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: 'var(--bg-surface-2)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.2rem',
                        }}
                      >
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: 'var(--accent-cyan)',
                          }}
                        >
                          #{idx + 1} {feat.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {feat.unit}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {feat.label}
                      </div>
                    </div>

                    <div style={{ marginTop: '0.6rem' }}>
                      <div
                        className="font-mono"
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color: isAvail ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}
                      >
                        {isAvail ? Number(val).toFixed(4) : 'Unavailable'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {feat.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                marginTop: '1rem',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              Note: The values above represent actual feature values extracted from the continuous ECG recording. This is feature-value visualization, NOT feature importance.
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            RR feature data unavailable for this beat.
          </div>
        )}
      </Card>

      {/* 6. 209-D Feature Context Card & Probability Distribution Grid */}
      <div className="grid" style={{ marginBottom: '1.25rem' }}>
        {/* 209-D Feature Context */}
        <Card
          title="209-Dimensional Feature Representation"
          subtitle="Model input composition for Random Forest classification"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="stat-box" style={{ borderLeftColor: '#00e5ff' }}>
              <div className="stat-title">Morphology Features</div>
              <div className="stat-value font-mono" style={{ color: '#00e5ff' }}>
                200 Dimensions
              </div>
              <div className="stat-sub">
                Local per-beat Z-score normalized samples centered at R-peak (offsets -90 to +109).
              </div>
            </div>

            <div className="stat-box" style={{ borderLeftColor: '#f59e0b' }}>
              <div className="stat-title">Temporal Coupling Features</div>
              <div className="stat-value font-mono" style={{ color: '#f59e0b' }}>
                9 RR Dimensions
              </div>
              <div className="stat-sub">
                Preceding, subsequent, median, and bidirectional ratios capturing rhythm dynamics.
              </div>
            </div>

            <div className="stat-box stat-total">
              <div className="stat-title">Total Model Input</div>
              <div className="stat-value font-mono" style={{ color: 'var(--text-primary)' }}>
                209 Dimensions
              </div>
              <div className="stat-sub">
                Strictly matches the Phase 8 locked model input signature (n_features_in_ = 209).
              </div>
            </div>
          </div>
        </Card>

        {/* 4-Class Probability Distribution */}
        <Card
          title="Model Output Probabilities"
          subtitle="Canonical ANSI/AAMI EC57 class posterior probability distribution"
          action={
            <Link
              to={`/prediction/${recordId}/${currentBeatIdx}`}
              className="btn btn-outline btn-sm"
            >
              Full Probability Studio →
            </Link>
          }
        >
          {isEdge ? (
            <div
              style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏹️</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Probabilities Not Available
              </div>
              <p style={{ fontSize: '0.82rem', maxWidth: '320px', margin: '0.4rem auto 0' }}>
                Boundary beat — excluded from model classification. Sentinel zero probabilities do not represent 0% confidence.
              </p>
            </div>
          ) : probabilityList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {probabilityList.map((item) => {
                const isTop = predClass === item.key;
                const pct = item.prob !== null ? (item.prob * 100).toFixed(2) : null;

                return (
                  <div
                    key={item.key}
                    style={{
                      padding: '0.65rem 0.85rem',
                      backgroundColor: isTop ? 'rgba(0, 229, 255, 0.05)' : 'var(--bg-surface-2)',
                      border: isTop ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ClassBadge cls={item.key} size="sm" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {item.name}
                        </span>
                        {isTop && (
                          <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                            Top Prediction
                          </span>
                        )}
                      </div>
                      <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {pct !== null ? `${pct}%` : 'Unavailable'}
                      </span>
                    </div>

                    {/* Visual Meter Bar */}
                    <div
                      style={{
                        height: '8px',
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, item.prob ? item.prob * 100 : 0))}%`,
                          backgroundColor: item.color,
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Model probabilities unavailable.
            </div>
          )}
        </Card>
      </div>

      {/* 7. Academic Interpretation Panel */}
      <Card
        title="Academic Interpretation — How to Read This Beat"
        subtitle="Scientific walkthrough of feature extraction and machine learning decision formulation."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          <p>
            1. <strong>Morphology Vector:</strong> Contains 200 normalized ECG samples extracted from a fixed window centered around the detected R-peak.
          </p>
          <p>
            2. <strong>Bidirectional RR Features:</strong> Nine timing ratios and heart-rate metrics describe temporal coupling relationships around the beat.
          </p>
          <p>
            3. <strong>209-D Model Input:</strong> Together, morphology (200) and RR features (9) form the exact 209-dimensional feature vector fed into the model.
          </p>
          <p>
            4. <strong>Random Forest Inference:</strong> The frozen Random Forest classifier aggregates 200 trees to produce class probabilities for N, S, V, and F.
          </p>
          <p>
            5. <strong>Reference Annotation:</strong> Ground truth is established by certified PhysioNet/MIT-BIH cardiologist annotations.
          </p>
          <p>
            6. <strong>Reference Mismatch:</strong> Disagreement indicates difference between the statistical model prediction and reference labeling, useful for error analysis.
          </p>
          <p>
            7. <strong>Academic Evaluation:</strong> These outputs are intended for technical evaluation and verification of ML pipelines, not clinical patient diagnosis.
          </p>
        </div>

        {/* Verified Scientific Pipeline Diagram */}
        <div
          style={{
            marginTop: '1rem',
            padding: '0.85rem 1rem',
            backgroundColor: 'var(--bg-surface-2)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '4px solid var(--accent-cyan)',
            fontSize: '0.82rem',
            fontFamily: 'monospace',
          }}
        >
          Raw ECG → Moving-Average Baseline Removal (W=217, reflection padding) → Local Per-Beat Z-Score Normalization → 200-Sample Morphology + 9 Canonical RR Features → 209-D Vector → Frozen Random Forest → N / S / V / F Prediction
        </div>
      </Card>

      {/* 8. Taxonomy Legend */}
      <div style={{ marginTop: '1.25rem' }}>
        <ECGLegend />
      </div>
    </PageContainer>
  );
}
