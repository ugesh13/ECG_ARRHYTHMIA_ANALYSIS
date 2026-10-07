import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getBenchmark,
  getDatasetDistribution,
  getErrorMessage,
  getExperimentArtifacts,
  getGeneralization,
  getModelInfo,
  getRecordBreakdown,
} from '../services/api.js';
import { AAMI_CLASSES } from '../utils/aamiTaxonomy.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import ClassBadge from '../components/ClassBadge.jsx';
import ECGLegend from '../components/ECGLegend.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

/** Custom dark tooltip for Recharts */
function CustomChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '0.6rem 0.85rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        fontSize: '0.82rem',
        minWidth: '150px',
      }}
    >
      <div style={{ color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
        {label}
      </div>
      {payload.map((entry, idx) => (
        <div
          key={`tip-${idx}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.75rem',
            color: entry.color || '#00e5ff',
            fontFamily: 'monospace',
            fontWeight: 600,
          }}
        >
          <span>{entry.name}:</span>
          <span>
            {typeof entry.value === 'number'
              ? entry.value >= 100
                ? entry.value.toLocaleString()
                : entry.value.toFixed(4)
              : entry.value}{' '}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function BenchmarkDashboard() {
  const [benchmark, setBenchmark] = useState(null);
  const [generalization, setGeneralization] = useState(null);
  const [datasetDist, setDatasetDist] = useState(null);
  const [recordBreakdown, setRecordBreakdown] = useState(null);
  const [artifacts, setArtifacts] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Confusion matrix view mode: 'raw' | 'row_normalized' | 'column_normalized'
  const [cmMode, setCmMode] = useState('raw');
  // Selected cell hover/click in confusion matrix
  const [selectedCell, setSelectedCell] = useState(null);

  // Record breakdown table search & sort
  const [recordSearch, setRecordSearch] = useState('');
  const [recordSortKey, setRecordSortKey] = useState('accuracy');
  const [recordSortOrder, setRecordSortOrder] = useState('desc');

  // Load all experimental benchmark datasets
  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      getBenchmark(),
      getGeneralization().catch(() => null),
      getDatasetDistribution().catch(() => null),
      getRecordBreakdown().catch(() => null),
      getExperimentArtifacts().catch(() => null),
      getModelInfo().catch(() => null),
    ])
      .then(([bRes, gRes, dRes, rRes, aRes, mRes]) => {
        if (!active) return;
        setBenchmark(bRes);
        setGeneralization(gRes);
        setDatasetDist(dRes);
        setRecordBreakdown(rRes);
        setArtifacts(aRes);
        setModelInfo(mRes);
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

  // Class-wise performance chart data
  const classChartData = useMemo(() => {
    if (!benchmark?.per_class) return [];
    return ['N', 'S', 'V', 'F'].map((cls) => {
      const pc = benchmark.per_class[cls] || {};
      return {
        class: `Class ${cls}`,
        name: AAMI_CLASSES[cls]?.name || cls,
        Precision: pc.precision ?? 0,
        Recall: pc.recall ?? 0,
        F1: pc.f1_score ?? 0,
        Support: pc.support ?? 0,
      };
    });
  }, [benchmark]);

  // Generalization comparison chart data
  const generalizationChartData = useMemo(() => {
    if (!generalization?.comparison_table) return [];
    return generalization.comparison_table.map((row) => ({
      metric: row.metric,
      'DS1 Validation': row.ds1_validation,
      'DS2 Held-Out Test': row.ds2_test,
      delta: row.absolute_difference,
    }));
  }, [generalization]);

  // Dataset distribution stacked chart data
  const datasetChartData = useMemo(() => {
    if (!datasetDist?.cohorts) return [];
    return datasetDist.cohorts.map((c) => ({
      partition: c.partition,
      Normal: c.n_count,
      Supraventricular: c.s_count,
      Ventricular: c.v_count,
      Fusion: c.f_count,
      Paced_or_Q: c.isolated_q,
      total: c.usable_beats,
    }));
  }, [datasetDist]);

  // Filtered & sorted record breakdown
  const filteredRecords = useMemo(() => {
    if (!recordBreakdown?.records) return [];
    let list = recordBreakdown.records.filter((r) =>
      r.record_id.toLowerCase().includes(recordSearch.toLowerCase())
    );

    list.sort((a, b) => {
      const valA = a[recordSortKey] ?? 0;
      const valB = b[recordSortKey] ?? 0;
      if (typeof valA === 'string') {
        return recordSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return recordSortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [recordBreakdown, recordSearch, recordSortKey, recordSortOrder]);

  if (loading) {
    return (
      <LoadingState label="Loading frozen Phase 8 DS2 experimental benchmark metrics and locked results…" />
    );
  }

  if (error) {
    return (
      <PageContainer
        title="Model Evaluation & Benchmark Studio"
        subtitle="Error loading experimental evaluation results."
      >
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  const m = benchmark?.metrics;
  const cm = benchmark?.confusion_matrix;
  const perClass = benchmark?.per_class || {};

  return (
    <PageContainer
      title="Model Evaluation & Benchmark Studio"
      subtitle="Interactive exploration of the frozen Random Forest evaluation on the held-out MIT-BIH test cohort."
      breadcrumbs={
        <>
          <Link to="/">Dashboard</Link>
          <span>/</span>
          <span>Benchmark Studio</span>
        </>
      }
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span className="badge badge-purple" style={{ fontSize: '0.8rem' }}>
            Status: LOCKED FOR EVALUATION
          </span>
          <Link to="/error-analysis" className="btn btn-primary btn-sm">
            Error Analysis Studio →
          </Link>
          <Link to="/interpretability" className="btn btn-outline btn-sm">
            Feature Importance →
          </Link>
          <Link to="/records" className="btn btn-secondary btn-sm">
            Record Explorer
          </Link>
        </div>
      }
    >
      {/* 1. Experiment Status & Provenance Header Bar */}
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
              Evaluation Provenance & Partitioning
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.15rem' }}>
              Random Forest Classifier • 209-Dimensional Feature Input
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '0.2rem', maxWidth: '820px' }}>
              Evaluated strictly on the held-out inter-record evaluation within the MIT-BIH dataset (DS2 test cohort, 22 independent patient recordings, {benchmark?.evaluated_beats_count?.toLocaleString() || '49,639'} usable heartbeats).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Trees</div>
              <div className="font-mono" style={{ fontWeight: 800 }}>
                {modelInfo?.n_estimators || 200}
              </div>
            </div>
            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Input Dimensions</div>
              <div className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {modelInfo?.feature_dimension || 209}
              </div>
            </div>
            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Evaluated Beats</div>
              <div className="font-mono" style={{ fontWeight: 800 }}>
                {benchmark?.evaluated_beats_count?.toLocaleString() || '49,639'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Headline Performance Metrics Grid */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard
          label="Test Accuracy"
          value={m ? `${(m.accuracy * 100).toFixed(2)}%` : '—'}
          subtext="Overall proportion of correct classifications"
          accentColor="#10b981"
          badge={<span className="badge badge-success">{m?.accuracy?.toFixed(4)}</span>}
        />

        <StatCard
          label="Balanced Accuracy"
          value={m ? `${(m.balanced_accuracy * 100).toFixed(2)}%` : '—'}
          subtext="Unweighted arithmetic mean of class recalls"
          accentColor="#f59e0b"
          badge={<span className="badge badge-warning">{m?.balanced_accuracy?.toFixed(4)}</span>}
        />

        <StatCard
          label="Macro F1 Score"
          value={m ? m.macro_f1.toFixed(4) : '—'}
          subtext="Unweighted average F1 across the four AAMI classes"
          accentColor="#00e5ff"
          badge={<span className="badge badge-cyan">{m?.macro_f1?.toFixed(4)}</span>}
        />

        <StatCard
          label="Weighted F1 Score"
          value={m ? m.weighted_f1.toFixed(4) : '—'}
          subtext="F1 score weighted by individual class support"
          accentColor="#a855f7"
          badge={<span className="badge badge-purple">{m?.weighted_f1?.toFixed(4)}</span>}
        />

        <StatCard
          label="Macro ROC-AUC"
          value={m ? m.roc_auc.toFixed(4) : '—'}
          subtext="Multi-class one-vs-rest area under ROC curve"
          accentColor="#38bdf8"
          badge={<span className="badge badge-default">ROC: {m?.roc_auc?.toFixed(4)}</span>}
        />

        <StatCard
          label="Macro PR-AUC"
          value={m ? m.pr_auc.toFixed(4) : '—'}
          subtext="Area under precision-recall curve (imbalance metric)"
          accentColor="#e2e8f0"
          badge={<span className="badge badge-default">PR: {m?.pr_auc?.toFixed(4)}</span>}
        />
      </div>

      {/* 3. Class-Wise Performance */}
      <Card
        title="Class-Wise Diagnostic Performance on DS2 Held-Out Cohort"
        subtitle="Individual Precision, Recall, and F1 scores evaluated across 49,639 beats following ANSI/AAMI EC57 taxonomy."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.5rem',
            alignItems: 'center',
          }}
        >
          {/* Grouped Bar Chart */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Precision vs. Recall vs. F1 Across Diagnostic Classes:
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={classChartData}
                margin={{ top: 12, right: 16, bottom: 4, left: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="class" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  domain={[0, 1]}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => v.toFixed(2)}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '0.8rem' }}
                  iconSize={10}
                />
                <Bar dataKey="Precision" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Recall" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="F1" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Metric Table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Diagnostic Class</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1 Score</th>
                  <th>Support</th>
                </tr>
              </thead>
              <tbody>
                {['N', 'S', 'V', 'F'].map((c) => {
                  const pc = perClass[c] || {};
                  return (
                    <tr key={c}>
                      <td>
                        <ClassBadge cls={c} showDescription />
                      </td>
                      <td className="font-mono">{(pc.precision ?? 0).toFixed(4)}</td>
                      <td className="font-mono" style={{ fontWeight: 600 }}>
                        {(pc.recall ?? 0).toFixed(4)}
                      </td>
                      <td className="font-mono" style={{ color: 'var(--accent-cyan)' }}>
                        {(pc.f1_score ?? 0).toFixed(4)}
                      </td>
                      <td className="font-mono">{pc.support?.toLocaleString() ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* 4. Confusion Matrix */}
      {cm?.raw && (
        <Card
          title="4×4 Confusion Matrix on Held-Out Test Cohort (DS2)"
          subtitle="Rows represent true reference annotations; columns represent Random Forest predictions across 49,639 heartbeats."
          action={
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setCmMode('raw')}
                className={`btn btn-sm ${cmMode === 'raw' ? 'btn-primary' : 'btn-outline'}`}
                aria-label="View raw beat counts"
              >
                Raw Counts
              </button>
              <button
                type="button"
                onClick={() => setCmMode('row_normalized')}
                className={`btn btn-sm ${cmMode === 'row_normalized' ? 'btn-primary' : 'btn-outline'}`}
                aria-label="View row-normalized sensitivity"
              >
                Row Normalized (Recall)
              </button>
              <button
                type="button"
                onClick={() => setCmMode('column_normalized')}
                className={`btn btn-sm ${cmMode === 'column_normalized' ? 'btn-primary' : 'btn-outline'}`}
                aria-label="View column-normalized precision"
              >
                Col Normalized (Precision)
              </button>
            </div>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem',
              alignItems: 'start',
            }}
          >
            {/* Interactive Grid Table */}
            <div className="table-container">
              <table className="data-table" style={{ textAlign: 'center' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>True \ Pred</th>
                    <th>Pred N</th>
                    <th>Pred S</th>
                    <th>Pred V</th>
                    <th>Pred F</th>
                    <th>Total Support</th>
                  </tr>
                </thead>
                <tbody>
                  {['N', 'S', 'V', 'F'].map((trueCls, rIdx) => {
                    const rawRow = cm.raw[rIdx] || [];
                    const rowSum = rawRow.reduce((a, b) => a + b, 0);

                    return (
                      <tr key={trueCls}>
                        <td style={{ textAlign: 'left', fontWeight: 600 }}>
                          <ClassBadge cls={trueCls} />
                        </td>
                        {rawRow.map((val, cIdx) => {
                          const predCls = ['N', 'S', 'V', 'F'][cIdx];
                          const isDiag = rIdx === cIdx;
                          const normVal =
                            cmMode === 'row_normalized'
                              ? cm.row_normalized?.[rIdx]?.[cIdx] ?? 0
                              : cmMode === 'column_normalized'
                              ? cm.column_normalized?.[rIdx]?.[cIdx] ?? 0
                              : val;

                          const isSelected =
                            selectedCell?.r === rIdx && selectedCell?.c === cIdx;

                          // Heatmap alpha based on normalized frequency
                          const alpha = rowSum > 0 ? val / rowSum : 0;
                          const bgCell = isDiag
                            ? `rgba(16, 185, 129, ${Math.max(0.08, alpha * 0.45)})`
                            : val > 0
                            ? `rgba(239, 68, 68, ${Math.max(0.04, alpha * 0.4)})`
                            : 'transparent';

                          return (
                            <td
                              key={`cell-${rIdx}-${cIdx}`}
                              onClick={() =>
                                setSelectedCell({
                                  actual: trueCls,
                                  predicted: predCls,
                                  count: val,
                                  norm: normVal,
                                  r: rIdx,
                                  c: cIdx,
                                })
                              }
                              className="font-mono"
                              style={{
                                cursor: 'pointer',
                                backgroundColor: bgCell,
                                outline: isSelected ? '2px solid var(--accent-cyan)' : undefined,
                                fontWeight: isDiag ? 700 : 400,
                                color: isDiag ? 'var(--color-class-N)' : 'var(--text-primary)',
                                transition: 'all 0.15s ease',
                              }}
                              title={`Actual ${trueCls} → Pred ${predCls}: ${val.toLocaleString()} beats`}
                            >
                              {cmMode === 'raw'
                                ? val.toLocaleString()
                                : `${(normVal * 100).toFixed(1)}%`}
                            </td>
                          );
                        })}
                        <td className="font-mono" style={{ fontWeight: 600 }}>
                          {rowSum.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Hover / Cell Details Panel */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Confusion Cell Inspection
              </div>
              {selectedCell ? (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span>Actual:</span>
                    <ClassBadge cls={selectedCell.actual} />
                    <span style={{ margin: '0 0.25rem' }}>→</span>
                    <span>Predicted:</span>
                    <ClassBadge cls={selectedCell.predicted} />
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                    {selectedCell.count.toLocaleString()} Beats
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                    {selectedCell.actual === selectedCell.predicted ? (
                      <span style={{ color: 'var(--status-online)' }}>
                        ✓ Reference Match (Agrees with certified PhysioNet reference annotation)
                      </span>
                    ) : (
                      <span style={{ color: 'var(--status-warning)' }}>
                        ⚠️ Reference-to-model disagreement (Misclassification relative to reference annotation)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                  Click or hover any cell in the 4×4 matrix above to inspect exact counts, reference matching, and disagreement categories.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 5. Generalization Studio: DS1 Validation vs DS2 Test */}
      {generalization?.comparison_table && (
        <Card
          title="Generalization Analysis: DS1 Validation vs. DS2 Held-Out Test"
          subtitle="Observed performance change from validation to held-out inter-record evaluation across patient cohorts."
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '1.5rem',
              alignItems: 'center',
            }}
          >
            {/* Grouped Comparison Chart */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Cohort Performance Comparison:
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={generalizationChartData}
                  margin={{ top: 12, right: 16, bottom: 4, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis
                    domain={[0.5, 1]}
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(v) => v.toFixed(2)}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '8px', fontSize: '0.8rem' }}
                    iconSize={10}
                  />
                  <Bar dataKey="DS1 Validation" fill="#38bdf8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="DS2 Held-Out Test" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison Table */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>DS1 Validation</th>
                    <th>DS2 Held-Out</th>
                    <th>Shift (Δ)</th>
                    <th>Relative</th>
                  </tr>
                </thead>
                <tbody>
                  {generalization.comparison_table.map((row) => (
                    <tr key={row.metric}>
                      <td style={{ fontWeight: 600 }}>{row.metric}</td>
                      <td className="font-mono">{row.ds1_validation.toFixed(4)}</td>
                      <td className="font-mono">{row.ds2_test.toFixed(4)}</td>
                      <td
                        className="font-mono"
                        style={{
                          color:
                            row.absolute_difference < 0
                              ? 'var(--status-offline)'
                              : 'var(--status-online)',
                        }}
                      >
                        {row.absolute_difference > 0 ? '+' : ''}
                        {row.absolute_difference.toFixed(4)}
                      </td>
                      <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                        {row.relative_change_pct}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* 6. Dataset Distribution & Class Imbalance */}
      {datasetDist?.cohorts && (
        <Card
          title="MIT-BIH Cohort Class Distribution & Real-World Imbalance"
          subtitle="Beats partitioned strictly following ANSI/AAMI EC57 training (DS1), validation (DS1), held-out test (DS2), and paced cohorts."
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '1.5rem',
              alignItems: 'center',
            }}
          >
            {/* Stacked Bar Chart */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Class Distribution Across Partitions:
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={datasetChartData}
                  margin={{ top: 12, right: 16, bottom: 4, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="partition" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip content={<CustomChartTooltip unit="beats" />} />
                  <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '0.8rem' }} iconSize={10} />
                  <Bar dataKey="Normal" stackId="a" fill="#10b981" />
                  <Bar dataKey="Ventricular" stackId="a" fill="#ef4444" />
                  <Bar dataKey="Supraventricular" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Fusion" stackId="a" fill="#a855f7" />
                  <Bar dataKey="Paced_or_Q" stackId="a" fill="#64748b" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribution Table */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Partition</th>
                    <th>Records</th>
                    <th>Usable Beats</th>
                    <th>N (%)</th>
                    <th>S (%)</th>
                    <th>V (%)</th>
                    <th>F (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {datasetDist.cohorts.map((c) => (
                    <tr key={c.partition}>
                      <td style={{ fontWeight: 600 }}>{c.partition}</td>
                      <td className="font-mono">{c.record_count}</td>
                      <td className="font-mono">{c.usable_beats.toLocaleString()}</td>
                      <td className="font-mono">{c.n_pct}</td>
                      <td className="font-mono">{c.s_pct}</td>
                      <td className="font-mono">{c.v_pct}</td>
                      <td className="font-mono">{c.f_pct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* 7. Record-Level Breakdown */}
      {recordBreakdown?.records && (
        <Card
          title="DS2 Record-Level Performance Breakdown (22 Records)"
          subtitle="Observed accuracy and class sensitivities across individual patients in the held-out test cohort."
          action={
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search record ID..."
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                style={{
                  padding: '0.3rem 0.6rem',
                  backgroundColor: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                }}
              />
            </div>
          }
        >
          <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setRecordSortKey('record_id');
                      setRecordSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    Record ID {recordSortKey === 'record_id' ? (recordSortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>Evaluated Beats</th>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setRecordSortKey('accuracy');
                      setRecordSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
                    }}
                  >
                    Accuracy {recordSortKey === 'accuracy' ? (recordSortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th>N Recall (Support)</th>
                  <th>S Recall (Support)</th>
                  <th>V Recall (Support)</th>
                  <th>F Recall (Support)</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.record_id}>
                    <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      Record {r.record_id}
                    </td>
                    <td className="font-mono">{r.evaluated_beats.toLocaleString()}</td>
                    <td className="font-mono" style={{ fontWeight: 700 }}>
                      {(r.accuracy * 100).toFixed(2)}%
                    </td>
                    <td className="font-mono">
                      {r.n_recall !== null ? (r.n_recall * 100).toFixed(1) : '—'}% ({r.n_support})
                    </td>
                    <td className="font-mono">
                      {r.s_recall !== null ? (r.s_recall * 100).toFixed(1) : '—'}% ({r.s_support})
                    </td>
                    <td className="font-mono">
                      {r.v_recall !== null ? (r.v_recall * 100).toFixed(1) : '—'}% ({r.v_support})
                    </td>
                    <td className="font-mono">
                      {r.f_recall !== null ? (r.f_recall * 100).toFixed(1) : '—'}% ({r.f_support})
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/waveform/${r.record_id}`} className="btn btn-outline btn-sm">
                        Waveform →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 8. Artifact Provenance */}
      {artifacts?.artifacts && (
        <Card
          title="Experimental Artifact Provenance"
          subtitle="Validated, locked Phase 8 evaluation outputs preserved in the backend."
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {artifacts.artifacts.map((art) => (
              <div
                key={art.name}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--bg-surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{art.name}</span>
                  <span className={`badge ${art.available ? 'badge-success' : 'badge-default'}`}>
                    {art.available ? 'Verified' : 'Unavailable'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  {art.description}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                  Format: {art.format}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 9. Academic Interpretation & Benchmark Limitations */}
      <Card
        title="Academic Interpretation — How to Interpret This Benchmark"
        subtitle="Key principles and considerations for evaluating machine learning performance in ECG signal processing."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          <p>
            • <strong>Overall Accuracy vs. Balanced Accuracy:</strong> Under strong class imbalance (Normal beats represent ~89% of the dataset), raw accuracy can be disproportionately inflated by the majority class. Balanced accuracy (0.7000) gives equal weighting to all four categories, providing a more reliable indicator of minority-class sensitivity.
          </p>
          <p>
            • <strong>Macro F1 as Primary Target:</strong> Macro F1 (0.6403) averages the harmonic mean of precision and recall across classes without weighting by prevalence, ensuring that performance on rare ectopic classes (S and F) is rigorously penalized.
          </p>
          <p>
            • <strong>ROC-AUC vs. PR-AUC:</strong> While ROC-AUC (0.9425) measures general discrimination across all operating thresholds, PR-AUC (0.6280) is considerably more sensitive to false positive rates in heavily imbalanced cohorts.
          </p>
          <p>
            • <strong>Inter-Patient Generalization:</strong> The DS2 cohort tests records from patients completely separate from those in training (DS1). Observed performance drop (Macro F1: 0.7095 → 0.6403) reflects realistic inter-patient morphological heterogeneity.
          </p>
        </div>

        <div className="disclaimer-banner" style={{ margin: '1rem 0 0 0' }}>
          <span>ℹ️</span>
          <span>
            <strong>Educational & Academic Notice:</strong> This benchmark studio presents observed technical machine learning performance on the MIT-BIH Arrhythmia Database for scientific and educational verification. It does not represent clinical validation, diagnostic efficacy, or medical patient decision-making.
          </span>
        </div>
      </Card>

      {/* 10. Taxonomy Legend */}
      <div style={{ marginTop: '1.25rem' }}>
        <ECGLegend />
      </div>
    </PageContainer>
  );
}
