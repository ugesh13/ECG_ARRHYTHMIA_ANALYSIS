import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getErrorMessage,
  getFeatureImportance,
  getModelInfo,
} from '../services/api.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

/** Custom dark tooltip for Feature Importance charts */
function FeatureTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '0.65rem 0.85rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        fontSize: '0.82rem',
        minWidth: '180px',
      }}
    >
      <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>
        Rank #{item.rank || '—'} • {item.feature_type || 'Feature'}
      </div>
      <div style={{ color: '#f8fafc', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.95rem' }}>
        {item.feature_name || label}
      </div>
      <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontFamily: 'monospace', marginTop: '0.35rem' }}>
        Gini Importance: {(item.gini_importance * 100).toFixed(2)}% ({item.gini_importance.toFixed(4)})
      </div>
      {item.description && (
        <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.35rem', maxWidth: '240px' }}>
          {item.description}
        </div>
      )}
    </div>
  );
}

export default function Interpretability() {
  const [data, setData] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL'); // 'ALL' | 'Temporal' | 'Morphology'
  const [selectedFeature, setSelectedFeature] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      getFeatureImportance(),
      getModelInfo().catch(() => null),
    ])
      .then(([featRes, modelRes]) => {
        if (!active) return;
        setData(featRes);
        setModelInfo(modelRes);
        setError(null);
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
  }, []);

  const topFeatures = data?.top_features || [];
  const temporalTotal = data?.temporal_features_total_importance ?? 0.2638;
  const morphologyTotal = Math.max(0, 1 - temporalTotal);

  // Filtered features for the Top 15 table and chart
  const filteredFeatures = useMemo(() => {
    return topFeatures.filter((f) => {
      const matchSearch =
        f.feature_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchSearch) return false;

      if (groupFilter === 'ALL') return true;
      if (groupFilter === 'Temporal') return f.feature_type === 'Temporal';
      if (groupFilter === 'Morphology') return f.feature_type === 'Morphology';
      return true;
    });
  }, [topFeatures, searchTerm, groupFilter]);

  // Chart data for Top 15 (ordered descending from top)
  const chartData = useMemo(() => {
    return [...topFeatures].reverse().map((f) => ({
      ...f,
      percentage: Number((f.gini_importance * 100).toFixed(2)),
    }));
  }, [topFeatures]);

  // Dedicated data for the 9 Temporal RR features in top features
  const temporalFeaturesInTop = useMemo(() => {
    return topFeatures.filter((f) => f.feature_type === 'Temporal');
  }, [topFeatures]);

  if (loading) {
    return (
      <LoadingState label="Loading frozen Random Forest Gini feature importances and domain attribution…" />
    );
  }

  if (error) {
    return (
      <PageContainer
        title="Explainable AI & Feature Importance"
        subtitle="Error retrieving model-level feature importance."
      >
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  const topFeature = topFeatures[0] || null;

  return (
    <PageContainer
      title="Explainable AI & Feature Importance"
      subtitle="Model-level interpretation of the frozen Random Forest feature representation."
      breadcrumbs={
        <>
          <Link to="/">Dashboard</Link>
          <span>/</span>
          <span>Feature Importance</span>
        </>
      }
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span className="badge badge-purple" style={{ fontSize: '0.8rem' }}>
            Status: LOCKED FOR EVALUATION
          </span>
          <Link to="/benchmark" className="btn btn-secondary btn-sm">
            View Benchmark Results →
          </Link>
        </div>
      }
    >
      {/* 1. Header Overview & Model Interpretation Context */}
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Model-Level Feature Attribution
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.15rem' }}>
              Random Forest Classifier • 209 Input Dimensions
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '840px' }}>
              The model receives a 209-dimensional feature vector: <strong>200 normalized morphology features</strong> and <strong>9 bidirectional RR temporal features</strong>. The values shown reflect the frozen Phase 8 split-based Gini feature importance (Mean Decrease in Impurity).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Input Dimensions</div>
              <div className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>
                209 Dimensions
              </div>
            </div>
            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Trees</div>
              <div className="font-mono" style={{ fontWeight: 800 }}>
                {modelInfo?.n_estimators || 200}
              </div>
            </div>
            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Metric</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Gini (MDI)
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Headline Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard
          label="Highest-Ranked Feature"
          value={topFeature?.feature_name || 'RR_ratio_prev'}
          badge={<span className="badge badge-cyan">Rank #1</span>}
          subtext={`Relative contribution: ${(topFeature?.gini_importance ? topFeature.gini_importance * 100 : 5.82).toFixed(2)}%`}
          accentColor="var(--accent-cyan)"
        />

        <StatCard
          label="Aggregate Temporal Importance"
          value={`${(temporalTotal * 100).toFixed(2)}%`}
          badge={<span className="badge badge-success">9 RR Features</span>}
          subtext="Total Gini contribution across 9 timing ratios"
          accentColor="#10b981"
        />

        <StatCard
          label="Aggregate Morphology Importance"
          value={`${(morphologyTotal * 100).toFixed(2)}%`}
          badge={<span className="badge badge-warning">200 Samples</span>}
          subtext="Total Gini contribution across 200 waveform points"
          accentColor="#f59e0b"
        />

        <StatCard
          label="Top Morphology Predictor"
          value="ECG_092"
          badge={<span className="badge badge-default">Rank #3</span>}
          subtext="R-peak apex amplitude region (3.24%)"
          accentColor="#38bdf8"
        />
      </div>

      {/* 3. Top 15 Feature Ranking Visualization */}
      <Card
        title="Top 15 Feature Ranking (Mean Decrease in Impurity)"
        subtitle="Ranked by split-based Gini importance across 200 decision trees. Shows relative feature contribution."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#00e5ff', borderRadius: '2px' }} />
            <span>Temporal RR Features (9 Canonical Dimensions)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }} />
            <span>Morphology Features (200 Normalized Samples)</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={420}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 30, bottom: 8, left: 90 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 7]}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="feature_name"
              stroke="#64748b"
              tick={{ fill: '#f8fafc', fontSize: 11, fontFamily: 'monospace' }}
              width={90}
            />
            <Tooltip content={<FeatureTooltip />} />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.feature_type === 'Temporal' ? '#00e5ff' : '#f59e0b'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedFeature(entry)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 4. Morphology vs. Temporal Group Comparison */}
      <div className="grid" style={{ marginBottom: '1.25rem' }}>
        {/* Temporal RR Contribution Card */}
        <Card
          title="Temporal RR Features Contribution (9 Dimensions)"
          subtitle="Temporal features account for a substantial portion of aggregate model importance."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(0, 229, 255, 0.06)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>
                  Aggregate Temporal Importance: {(temporalTotal * 100).toFixed(2)}%
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  The 9 RR timing features represent only 4.3% of the feature vector (9 / 209), but contribute over a quarter of the split-based importance.
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Temporal Features in Top 15:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {temporalFeaturesInTop.map((feat) => (
                <div
                  key={feat.feature_name}
                  onClick={() => setSelectedFeature(feat)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.45rem 0.75rem',
                    backgroundColor: 'var(--bg-surface-2)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      #{feat.rank}
                    </span>
                    <span className="font-mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {feat.feature_name}
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    {(feat.gini_importance * 100).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem', fontStyle: 'italic' }}>
              RR features provide additional information that helps the model distinguish classes.
            </p>
          </div>
        </Card>

        {/* Morphology Features Contribution Card */}
        <Card
          title="Morphology Features Contribution (200 Dimensions)"
          subtitle="Fixed 200-sample window centered at R-peak with local per-beat Z-score normalization."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(245, 158, 11, 0.06)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f59e0b' }}>
                  Aggregate Morphology Importance: {(morphologyTotal * 100).toFixed(2)}%
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  The 200 morphology dimensions capture continuous waveform shape, depolarizing QRS slopes, and repolarizing ST segments.
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              QRS Complex Clustering in Top Features:
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Morphology features that appear in the Top 15 (<strong>ECG_089</strong> through <strong>ECG_095</strong>) cluster directly around sample index 90, which corresponds to the R-peak center (relative offset 0). These dimensions encode the rapid QRS upstroke, peak apex, and downstroke.
            </p>

            <div
              style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                fontFamily: 'monospace',
              }}
            >
              Dimensions: ECG_000 to ECG_199 (200 dimensions) • Offsets: -90 to +109 samples
            </div>
          </div>
        </Card>
      </div>

      {/* 5. Interactive Feature Inspection Panel (when a feature is clicked) */}
      {selectedFeature && (
        <Card
          title={`Feature Detail: ${selectedFeature.feature_name}`}
          subtitle="Algorithmic definition and model split utilization."
          action={
            <button
              type="button"
              onClick={() => setSelectedFeature(null)}
              className="btn btn-outline btn-sm"
            >
              ✕ Deselect
            </button>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '0.75rem',
            }}
          >
            <div className="stat-box">
              <div className="stat-title">Feature Name</div>
              <div className="stat-value font-mono" style={{ color: 'var(--accent-cyan)' }}>
                {selectedFeature.feature_name}
              </div>
              <div className="stat-sub">Group: {selectedFeature.feature_type}</div>
            </div>

            <div className="stat-box">
              <div className="stat-title">Overall Rank</div>
              <div className="stat-value font-mono">
                #{selectedFeature.rank} / 209
              </div>
              <div className="stat-sub">Across 200 decision trees</div>
            </div>

            <div className="stat-box">
              <div className="stat-title">Gini Importance</div>
              <div className="stat-value font-mono" style={{ color: '#10b981' }}>
                {(selectedFeature.gini_importance * 100).toFixed(2)}%
              </div>
              <div className="stat-sub">Value: {selectedFeature.gini_importance.toFixed(4)}</div>
            </div>

            <div className="stat-box">
              <div className="stat-title">Description</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.35rem' }}>
                {selectedFeature.description || 'Morphology feature point'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 6. Complete Top 15 Feature Table with Search & Filter */}
      <Card
        title="Top 15 Model Features (Mean Decrease in Impurity)"
        subtitle="Ranked list of top model predictors extracted from the frozen Phase 8 feature-importance artifact."
        action={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setGroupFilter('ALL')}
                className={`btn btn-sm ${groupFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
              >
                All (15)
              </button>
              <button
                type="button"
                onClick={() => setGroupFilter('Temporal')}
                className={`btn btn-sm ${groupFilter === 'Temporal' ? 'btn-primary' : 'btn-outline'}`}
              >
                Temporal (8)
              </button>
              <button
                type="button"
                onClick={() => setGroupFilter('Morphology')}
                className={`btn btn-sm ${groupFilter === 'Morphology' ? 'btn-primary' : 'btn-outline'}`}
              >
                Morphology (7)
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Filter by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.3rem 0.6rem',
                backgroundColor: 'var(--bg-surface-2)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                width: '140px',
              }}
            />
          </div>
        }
      >
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Feature Name</th>
                <th>Feature Group</th>
                <th>Gini Importance</th>
                <th>Importance %</th>
                <th>Algorithmic & Technical Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.map((feat) => {
                const isTemporal = feat.feature_type === 'Temporal';
                const pct = (feat.gini_importance * 100).toFixed(2);
                const isSelected = selectedFeature?.rank === feat.rank;

                return (
                  <tr
                    key={feat.rank}
                    onClick={() => setSelectedFeature(feat)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(0, 229, 255, 0.08)' : undefined,
                    }}
                  >
                    <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                      #{feat.rank}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 700, color: isTemporal ? 'var(--accent-cyan)' : '#f59e0b' }}>
                      {feat.feature_name}
                    </td>
                    <td>
                      <span className={`badge ${isTemporal ? 'badge-cyan' : 'badge-warning'}`}>
                        {feat.feature_type}
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontWeight: 600 }}>
                      {feat.gini_importance.toFixed(4)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '80px',
                            height: '6px',
                            backgroundColor: 'var(--bg-surface-2)',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, feat.gini_importance * 1500)}%`,
                              height: '100%',
                              backgroundColor: isTemporal ? 'var(--accent-cyan)' : '#f59e0b',
                            }}
                          />
                        </div>
                        <span className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      {feat.description || 'Normalized morphology sample point'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 7. Relation to 209-D Feature Architecture */}
      <Card
        title="Relation to the 209-Dimensional Feature Representation"
        subtitle="End-to-end composition of input signals into Random Forest decision trees."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            padding: '0.5rem 0',
          }}
        >
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
              borderTop: '3px solid #f59e0b',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Input Component A
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.2rem 0' }}>
              200 Morphology Samples
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Normalized voltage waveform centered at R-peak (offsets -90 to +109). Captures QRS width and ST deviations.
            </p>
          </div>

          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
              borderTop: '3px solid #00e5ff',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Input Component B
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.2rem 0' }}>
              9 Temporal RR Features
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Preceding, subsequent, median, and bidirectional interval ratios capturing timing prematurity and compensatory pauses.
            </p>
          </div>

          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
              borderTop: '3px solid #10b981',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Ensemble Learner
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.2rem 0' }}>
              200-Tree Random Forest
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Evaluates all 209 features simultaneously across splits, weighting features according to Gini impurity reduction.
            </p>
          </div>

          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
              borderTop: '3px solid #a855f7',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Diagnostic Target
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.2rem 0' }}>
              4 AAMI Classes (N, S, V, F)
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Produces posterior probability distribution P(N), P(S), P(V), and P(F) validated on the DS2 test cohort.
            </p>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/waveform/100" className="btn btn-secondary btn-sm">
            Inspect Waveform Telemetry (Record 100) →
          </Link>
          <Link to="/benchmark" className="btn btn-primary btn-sm">
            View DS2 Benchmark Results →
          </Link>
        </div>
      </Card>

      {/* 8. Academic Interpretation & Scientific Limitations */}
      <Card
        title="Academic Interpretation — What Does Feature Importance Mean?"
        subtitle="Scientific walkthrough of split-based feature attribution and methodological limitations."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          <p>
            1. <strong>Model-Level Metric:</strong> Feature importance describes how strongly each input feature contributed to the Random Forest's split-based Gini impurity reduction across all 200 trees. It reflects mathematical feature usage during training, not physiological proof.
          </p>
          <p>
            2. <strong>Temporal Information Contribution:</strong> Temporal RR features account for approximately 26.38% of total model importance despite representing only 9 of the 209 dimensions. This indicates that temporal features provide additional information that helps distinguish classes.
          </p>
          <p>
            3. <strong>Morphology Contribution:</strong> Morphology features account for approximately 73.62% of aggregate importance, with high importance concentrated in the immediate vicinity of the QRS complex (sample offsets -1 to +4 relative to R-peak).
          </p>
          <p>
            4. <strong>No Causal Claim:</strong> A high feature importance score does NOT imply that a feature independently causes an arrhythmia, nor does it establish biological or clinical causality.
          </p>
        </div>

        <div className="disclaimer-banner" style={{ margin: '1rem 0 0 0' }}>
          <span>ℹ️</span>
          <span>
            <strong>Scientific & Academic Disclaimer:</strong> Feature importance values reflect mathematical split statistics in the trained Random Forest on MIT-BIH training data. They do not constitute independent medical diagnostics or clinical patient recommendations.
          </span>
        </div>
      </Card>
    </PageContainer>
  );
}
