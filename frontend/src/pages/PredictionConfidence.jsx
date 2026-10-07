import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getAnalysisSummary,
  getBeatDetail,
  getErrorMessage,
  getModelInfo,
} from '../services/api.js';
import { AAMI_CLASSES, getAnnotationMeta, getRecordPartition } from '../utils/aamiTaxonomy.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import ClassBadge from '../components/ClassBadge.jsx';
import ECGLegend from '../components/ECGLegend.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function PredictionConfidence() {
  const { recordId, beatIndex } = useParams();
  const navigate = useNavigate();
  const currentBeatIdx = parseInt(beatIndex, 10) || 0;

  const [data, setData] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
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

  // 2. Fetch Model Architecture & Provenance (Phase 17 endpoint)
  useEffect(() => {
    let active = true;
    getModelInfo()
      .then((res) => {
        if (active) setModelInfo(res);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // 3. Fetch Record Summary
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
      navigate(`/prediction/${recordId}/${parsed}`);
      setJumpInput('');
    }
  };

  if (loading) {
    return (
      <LoadingState
        label={`Computing posterior probabilities and decision confidence for Beat #${currentBeatIdx}…`}
      />
    );
  }

  if (error) {
    return (
      <PageContainer
        title="Prediction Confidence Studio"
        subtitle={`Error evaluating Beat #${currentBeatIdx} in Record ${recordId}.`}
      >
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
        />
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <Link to={`/beat/${recordId}/${currentBeatIdx}`} className="btn btn-secondary btn-sm">
            ← Back to Beat Inspector
          </Link>
          <Link to={`/waveform/${recordId}`} className="btn btn-outline btn-sm">
            Waveform Studio
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

  // Agreement Status
  const isMatch = !isEdge && predClass && gtClass && predClass === gtClass;
  const isMismatch = !isEdge && predClass && gtClass && predClass !== gtClass;

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

  // Decision margin calculation (Difference between top-1 and top-2 probabilities)
  const sortedProbs = probabilityList
    .filter((p) => typeof p.prob === 'number')
    .map((p) => p.prob)
    .sort((a, b) => b - a);
  const top1Prob = sortedProbs[0] || 0;
  const top2Prob = sortedProbs[1] || 0;
  const decisionMargin = Math.max(0, top1Prob - top2Prob);

  return (
    <PageContainer
      title={`Prediction Confidence Studio — Beat #${currentBeatIdx}`}
      subtitle={`Detailed decomposition of model output probabilities and decision certainty for Record ${recordId}.`}
      breadcrumbs={
        <>
          <Link to="/records">Records</Link>
          <span>/</span>
          <Link to={`/waveform/${recordId}`}>Record {recordId} Studio</Link>
          <span>/</span>
          <Link to={`/beat/${recordId}/${currentBeatIdx}`}>Beat #{currentBeatIdx}</Link>
          <span>/</span>
          <span>Prediction Confidence</span>
        </>
      }
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to={`/beat/${recordId}/${currentBeatIdx}`} className="btn btn-secondary btn-sm">
            ← Inspect Morphology (200-D)
          </Link>
          <Link to={`/waveform/${recordId}`} className="btn btn-outline btn-sm">
            Continuous Waveform
          </Link>
          <Link to={`/analysis/${recordId}`} className="btn btn-primary btn-sm">
            Full Record Analysis
          </Link>
        </div>
      }
    >
      {/* 1. Navigation Toolbar */}
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
          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => navigate(`/prediction/${recordId}/${Math.max(0, currentBeatIdx - 1)}`)}
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
              onClick={() => navigate(`/prediction/${recordId}/${currentBeatIdx + 1}`)}
              disabled={totalBeats !== null && currentBeatIdx >= totalBeats - 1}
              className="btn btn-secondary btn-sm"
              title="Navigate to subsequent beat"
              aria-label="Next beat"
            >
              Next Beat (#{currentBeatIdx + 1}) ▶
            </button>
          </div>

          {/* Quick Jump */}
          <form onSubmit={handleJump} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="jump-beat-pred" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Jump to Beat #:
            </label>
            <input
              id="jump-beat-pred"
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

      {/* 2. Top Metric Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard
          label="Model Classification"
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
              : `Ensemble Winner: Class ${predClass}`
          }
          accentColor="#00e5ff"
        />

        <StatCard
          label="Model Confidence"
          value={
            isEdge ? (
              <span style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>Not Applicable</span>
            ) : (
              `${((data?.confidence || 0) * 100).toFixed(2)}%`
            )
          }
          subtext={
            isEdge
              ? 'Sentinel zero (not evaluated)'
              : `Probability: ${data?.confidence?.toFixed(4)}`
          }
          accentColor="#38bdf8"
        />

        <StatCard
          label="Decision Margin"
          value={
            isEdge ? (
              <span style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>N/A</span>
            ) : (
              `${(decisionMargin * 100).toFixed(1)}%`
            )
          }
          subtext={
            isEdge
              ? 'Boundary exclusion'
              : decisionMargin > 0.5
              ? 'High separation (Top-1 vs Top-2)'
              : 'Borderline margin (< 50%)'
          }
          accentColor="#10b981"
        />

        <StatCard
          label="Ground Truth Reference"
          value={
            gtClass ? (
              <ClassBadge cls={gtClass} symbol={gtSymbol} showDescription size="lg" />
            ) : (
              <span style={{ fontSize: '1.3rem', color: 'var(--text-muted)' }}>Unavailable</span>
            )
          }
          subtext={
            gtSymbol
              ? `Annotation [${gtSymbol}]: ${getAnnotationMeta(gtSymbol).description}`
              : 'Ground truth not recorded'
          }
          accentColor="#a855f7"
        />
      </div>

      {/* 3. Reference Match / Mismatch Banner */}
      <Card
        title="Prediction Agreement vs Reference Annotation"
        subtitle="Verification against certified PhysioNet MIT-BIH annotations."
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
                  {data?.status || 'classified'}
                </span>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {isEdge
                  ? 'Boundary beat — excluded from model classification due to edge window constraints.'
                  : isMatch
                  ? 'Model prediction agrees with the reference annotation.'
                  : isMismatch
                  ? 'Model prediction differs from the reference annotation. Disagreement indicates uncertainty between morphological phenotypes.'
                  : 'Reference ground-truth annotation is not available for this heartbeat.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link
              to={`/beat/${recordId}/${currentBeatIdx}`}
              className="btn btn-outline btn-sm"
            >
              Inspect Morphology Waveform →
            </Link>
          </div>
        </div>
      </Card>

      {/* 4. Complete 4-Class Probability Breakdown */}
      <Card
        title="Posterior Probability Distribution Across AAMI Taxonomy"
        subtitle="Canonical probability ordering P(N), P(S), P(V), P(F) derived from 200 Random Forest decision trees."
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
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>⏹️</div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              Probabilities Not Available
            </div>
            <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0.5rem auto 0' }}>
              This heartbeat is an unclassified edge beat. The backend assigns a sentinel zero value, which represents non-classification rather than 0% certainty.
            </p>
          </div>
        ) : probabilityList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {probabilityList.map((item) => {
              const isTop = predClass === item.key;
              const probVal = item.prob !== null ? item.prob : 0;
              const pct = (probVal * 100).toFixed(2);

              return (
                <div
                  key={item.key}
                  style={{
                    padding: '1rem 1.25rem',
                    backgroundColor: isTop ? 'rgba(0, 229, 255, 0.05)' : 'var(--bg-surface-2)',
                    border: isTop ? '1px solid rgba(0, 229, 255, 0.35)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <ClassBadge cls={item.key} size="md" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                          P({item.key}) — {item.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {item.classInfo?.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: item.color }}>
                        {pct}%
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        Model Output Probability: P = {probVal.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Bar Track */}
                  <div
                    style={{
                      height: '12px',
                      backgroundColor: 'var(--bg-app)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, probVal * 100))}%`,
                        backgroundColor: item.color,
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}

            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                paddingTop: '0.25rem',
              }}
            >
              Probabilities represent normalized ensemble vote distributions across all 200 decision trees in the frozen Phase 8 Random Forest.
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
            Model probabilities unavailable.
          </div>
        )}
      </Card>

      {/* 5. Model Provenance & Architecture Section */}
      <Card
        title="Model Provenance & Classification Engine"
        subtitle="Frozen machine learning hyperparameters and feature specifications established in Phase 8."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div className="stat-box">
            <div className="stat-title">Model Architecture</div>
            <div className="stat-value font-mono" style={{ fontSize: '1.1rem', color: 'var(--accent-cyan)' }}>
              {modelInfo?.model_type || 'RandomForestClassifier'}
            </div>
            <div className="stat-sub">Ensemble Decision Trees</div>
          </div>

          <div className="stat-box">
            <div className="stat-title">Estimator Count</div>
            <div className="stat-value font-mono" style={{ fontSize: '1.1rem' }}>
              {modelInfo?.n_estimators || 200} Trees
            </div>
            <div className="stat-sub">Max depth: {modelInfo?.max_depth || 30}</div>
          </div>

          <div className="stat-box">
            <div className="stat-title">Feature Vector Dimension</div>
            <div className="stat-value font-mono" style={{ fontSize: '1.1rem', color: '#10b981' }}>
              {modelInfo?.feature_dimension || 209} Dimensions
            </div>
            <div className="stat-sub">200 Morphology + 9 RR features</div>
          </div>

          <div className="stat-box">
            <div className="stat-title">Class Weighting</div>
            <div className="stat-value font-mono" style={{ fontSize: '1.1rem' }}>
              {modelInfo?.class_weight || 'balanced'}
            </div>
            <div className="stat-sub">Inverse-frequency compensation</div>
          </div>

          <div className="stat-box">
            <div className="stat-title">Random State</div>
            <div className="stat-value font-mono" style={{ fontSize: '1.1rem' }}>
              {modelInfo?.random_state || 42}
            </div>
            <div className="stat-sub">Deterministic reproducibility</div>
          </div>

          <div className="stat-box">
            <div className="stat-title">Validation Status</div>
            <div className="stat-value font-mono" style={{ fontSize: '1.1rem', color: '#a855f7' }}>
              {modelInfo?.status || 'LOCKED_FOR_EVALUATION'}
            </div>
            <div className="stat-sub">Phase 8 Locked Checkpoint</div>
          </div>
        </div>

        {/* Collapsible Model Details */}
        <details style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--accent-cyan)' }}>
            View Full Model Configuration Parameters
          </summary>
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
            }}
          >
            <div>min_samples_split: {modelInfo?.min_samples_split || 5}</div>
            <div>min_samples_leaf: {modelInfo?.min_samples_leaf || 2}</div>
            <div>max_features: {modelInfo?.max_features || 'sqrt'}</div>
            <div>n_jobs: {modelInfo?.n_jobs || -1}</div>
            <div>standard_reference: {modelInfo?.standard_reference || 'ANSI/AAMI EC57:1998'}</div>
            <div>target_classes: {modelInfo?.class_labels?.join(', ') || 'N, S, V, F'}</div>
          </div>
        </details>
      </Card>

      {/* 6. Academic Interpretation & Scientific Walkthrough */}
      <Card
        title="Scientific Context & Pipeline Architecture"
        subtitle="End-to-end data transformation pipeline validated on DS1 and tested on DS2."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          <p>
            • <strong>Ensemble Vote Aggregation:</strong> Each decision tree independently classifies the 209-D feature vector. Posterior probabilities reflect the proportion of the 200 trees that cast their vote for each respective diagnostic category.
          </p>
          <p>
            • <strong>Decision Margin:</strong> The gap between top-1 ({top1Prob.toFixed(4)}) and top-2 ({top2Prob.toFixed(4)}) probabilities ({decisionMargin.toFixed(4)}) quantifies separation clarity. High margins indicate robust agreement among ensemble estimators.
          </p>
          <p>
            • <strong>AAMI EC57 Taxonomy:</strong> The model classifies beats into four standardized categories: N (Non-ectopic), S (Supraventricular ectopic), V (Ventricular ectopic), and F (Fusion).
          </p>
        </div>

        {/* Verified Pipeline Callout */}
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

        <div className="disclaimer-banner" style={{ margin: '1rem 0 0 0' }}>
          <span>ℹ️</span>
          <span>
            <strong>Educational & Academic Notice:</strong> Model confidence and posterior probabilities reflect machine-learning pattern recognition on MIT-BIH recordings. This system is developed for academic evaluation and is NOT a medical device.
          </span>
        </div>
      </Card>

      {/* 7. Taxonomy Legend */}
      <div style={{ marginTop: '1.25rem' }}>
        <ECGLegend />
      </div>
    </PageContainer>
  );
}
