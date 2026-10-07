import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  getModelInfo,
  getRecordBreakdown,
} from '../services/api.js';
import { AAMI_CLASSES } from '../utils/aamiTaxonomy.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import ClassBadge from '../components/ClassBadge.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

/** Custom Tooltip for Error Analysis Charts */
function ErrorChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '0.65rem 0.85rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        fontSize: '0.82rem',
        minWidth: '160px',
      }}
    >
      <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
        {label}
      </div>
      {payload.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.2rem' }}>
          <span style={{ color: item.color || '#f8fafc' }}>{item.name}:</span>
          <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
            {typeof item.value === 'number'
              ? item.value < 1
                ? `${(item.value * 100).toFixed(2)}%`
                : item.value.toLocaleString()
              : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ErrorAnalysis() {
  const [benchmark, setBenchmark] = useState(null);
  const [recordBreakdown, setRecordBreakdown] = useState(null);
  const [datasetDist, setDatasetDist] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Confusion matrix display mode
  const [cmMode, setCmMode] = useState('raw'); // 'raw' | 'row_normalized' | 'column_normalized'
  const [selectedCell, setSelectedCell] = useState(null);

  // Record table search & sort state
  const [recordSearch, setRecordSearch] = useState('');
  const [recordSort, setRecordSort] = useState('accuracy_desc');

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      getBenchmark(),
      getRecordBreakdown().catch(() => null),
      getDatasetDistribution().catch(() => null),
      getModelInfo().catch(() => null),
    ])
      .then(([bRes, rRes, dRes, mRes]) => {
        if (!active) return;
        setBenchmark(bRes);
        setRecordBreakdown(rRes);
        setDatasetDist(dRes);
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

  const cm = benchmark?.confusion_matrix;
  const metrics = benchmark?.metrics;
  const perClass = benchmark?.per_class || {};

  // Aggregate stats derived dynamically from authoritative backend benchmark
  const totalBeats = metrics?.evaluated_beats || cm?.total_beats || 49639;

  // Diagonal sum (correct beats)
  const correctBeats = useMemo(() => {
    if (!cm?.raw) return 45137;
    return cm.raw.reduce((acc, row, idx) => acc + (row[idx] || 0), 0);
  }, [cm]);

  const totalErrors = totalBeats - correctBeats;
  const errorRate = totalBeats > 0 ? (totalErrors / totalBeats) * 100 : 9.07;
  const accuracyPct = metrics?.accuracy ? metrics.accuracy * 100 : 90.93;

  // Class-wise error data
  const classErrorData = useMemo(() => {
    const classes = ['N', 'S', 'V', 'F'];
    return classes.map((cls, idx) => {
      const pc = perClass[cls] || {};
      const support = pc.support ?? (cm?.raw?.[idx]?.reduce((a, b) => a + b, 0) || 0);
      const correct = cm?.raw?.[idx]?.[idx] ?? Math.round(support * (pc.recall || 0));
      const incorrect = Math.max(0, support - correct);
      const recall = pc.recall ?? (support > 0 ? correct / support : 0);
      const errRate = 1 - recall;
      const shareOfErrors = totalErrors > 0 ? (incorrect / totalErrors) * 100 : 0;

      return {
        cls,
        name: AAMI_CLASSES[cls]?.name || cls,
        support,
        correct,
        incorrect,
        recall,
        errorRate: errRate,
        errorRatePct: Number((errRate * 100).toFixed(2)),
        shareOfErrors: Number(shareOfErrors.toFixed(2)),
      };
    });
  }, [perClass, cm, totalErrors]);

  // Extract all 12 off-diagonal misclassification pairs ranked descending
  const topErrorPairs = useMemo(() => {
    if (!cm?.raw) return [];
    const classes = ['N', 'S', 'V', 'F'];
    const pairs = [];

    classes.forEach((trueCls, rIdx) => {
      classes.forEach((predCls, cIdx) => {
        if (rIdx !== cIdx) {
          const count = cm.raw[rIdx]?.[cIdx] || 0;
          if (count > 0) {
            const pctOfErrors = totalErrors > 0 ? (count / totalErrors) * 100 : 0;
            pairs.push({
              actual: trueCls,
              predicted: predCls,
              pairLabel: `${trueCls} → ${predCls}`,
              count,
              percentageOfErrors: Number(pctOfErrors.toFixed(2)),
              actualName: AAMI_CLASSES[trueCls]?.name || trueCls,
              predictedName: AAMI_CLASSES[predCls]?.name || predCls,
            });
          }
        }
      });
    });

    pairs.sort((a, b) => b.count - a.count);
    return pairs.map((pair, idx) => ({ ...pair, rank: idx + 1 }));
  }, [cm, totalErrors]);

  // Asymmetry comparison: Errors by True Class vs Errors by Predicted Class
  const trueVsPredErrors = useMemo(() => {
    if (!cm?.raw) return [];
    const classes = ['N', 'S', 'V', 'F'];

    return classes.map((cls, idx) => {
      // True class errors: row sum minus diagonal
      const row = cm.raw[idx] || [];
      const rowSum = row.reduce((a, b) => a + b, 0);
      const rowDiag = row[idx] || 0;
      const missed = rowSum - rowDiag;

      // Predicted class errors: column sum minus diagonal
      let colSum = 0;
      for (let r = 0; r < classes.length; r++) {
        colSum += cm.raw[r]?.[idx] || 0;
      }
      const colDiag = cm.raw[idx]?.[idx] || 0;
      const incorrectlyAssigned = colSum - colDiag;

      return {
        cls: `Class ${cls}`,
        classCode: cls,
        'Missed (True Class Errors)': missed,
        'False Assignments (Predicted Class Errors)': incorrectlyAssigned,
      };
    });
  }, [cm]);

  // Filtered & Sorted DS2 Records
  const processedRecords = useMemo(() => {
    if (!recordBreakdown?.records) return [];
    const list = [...recordBreakdown.records].map((r) => {
      const correct = Math.round(r.evaluated_beats * r.accuracy);
      const errors = Math.max(0, r.evaluated_beats - correct);
      const errPct = Number(((1 - r.accuracy) * 100).toFixed(2));
      return {
        ...r,
        correct,
        errors,
        errorRatePct: errPct,
        accuracyPct: Number((r.accuracy * 100).toFixed(2)),
      };
    });

    // Filter by search string
    const filtered = list.filter((r) =>
      r.record_id.toLowerCase().includes(recordSearch.toLowerCase().trim())
    );

    // Sort
    filtered.sort((a, b) => {
      switch (recordSort) {
        case 'accuracy_desc':
          return b.accuracy - a.accuracy;
        case 'accuracy_asc':
          return a.accuracy - b.accuracy;
        case 'errors_desc':
          return b.errors - a.errors;
        case 'errors_asc':
          return a.errors - b.errors;
        case 'support_desc':
          return b.evaluated_beats - a.evaluated_beats;
        case 'support_asc':
          return a.evaluated_beats - b.evaluated_beats;
        case 'record_asc':
          return a.record_id.localeCompare(b.record_id, undefined, { numeric: true });
        default:
          return b.accuracy - a.accuracy;
      }
    });

    return filtered;
  }, [recordBreakdown, recordSearch, recordSort]);

  if (loading) {
    return <LoadingState label="Loading frozen DS2 error analysis metrics and confusion matrix…" />;
  }

  if (error) {
    return (
      <PageContainer
        title="Error Analysis Studio"
        subtitle="Error retrieving held-out DS2 evaluation metrics."
      >
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Error Analysis Studio"
      subtitle="Held-out DS2 error analysis for the frozen Random Forest model."
      breadcrumbs={
        <>
          <Link to="/">Dashboard</Link>
          <span>/</span>
          <Link to="/benchmark">Benchmark</Link>
          <span>/</span>
          <span>Error Analysis</span>
        </>
      }
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span className="badge badge-purple" style={{ fontSize: '0.8rem' }}>
            Status: LOCKED EVALUATION
          </span>
          <Link to="/benchmark" className="btn btn-secondary btn-sm">
            View Full Benchmark →
          </Link>
          <Link to="/interpretability" className="btn btn-outline btn-sm">
            View Feature Importance →
          </Link>
        </div>
      }
    >
      {/* 1. Header & Provenance Card */}
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
              Academic Model-Level Error Attribution
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.15rem' }}>
              Random Forest Classifier • 49,639 Evaluated Beats
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '840px' }}>
              Held-out inter-record evaluation within the MIT-BIH dataset. This studio decomposes prediction errors across true classes, predicted classes, confusion matrix transitions, and individual test records.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Evaluation</div>
              <div className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)' }}>
                DS2 Test Set
              </div>
            </div>
            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Test Records</div>
              <div className="font-mono" style={{ fontWeight: 800 }}>
                22 Records
              </div>
            </div>
            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Classes</div>
              <div className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-purple)' }}>
                N / S / V / F
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Headline Summary StatCards */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard
          label="Total DS2 Beats"
          value={totalBeats.toLocaleString()}
          badge={<span className="badge badge-default">22 Records</span>}
          subtext="Total usable heartbeats evaluated"
          accentColor="#38bdf8"
        />

        <StatCard
          label="Correct Predictions"
          value={correctBeats.toLocaleString()}
          badge={<span className="badge badge-success">Diagonal</span>}
          subtext={`${accuracyPct.toFixed(2)}% overall accuracy`}
          accentColor="#10b981"
        />

        <StatCard
          label="Total Errors"
          value={totalErrors.toLocaleString()}
          badge={<span className="badge badge-danger">Off-Diagonal</span>}
          subtext={`${errorRate.toFixed(2)}% error rate across cohort`}
          accentColor="#ef4444"
        />

        <StatCard
          label="Macro F1 Score"
          value={(metrics?.macro_f1 || 0.6403).toFixed(4)}
          badge={<span className="badge badge-cyan">4-Class</span>}
          subtext={`Balanced Accuracy: ${((metrics?.balanced_accuracy || 0.7) * 100).toFixed(2)}%`}
          accentColor="var(--accent-cyan)"
        />
      </div>

      {/* 3. Prediction Outcome Distribution (Correct vs Incorrect Visual Comparison) */}
      <Card
        title="Prediction Outcome Distribution"
        subtitle="Visual partition of the 49,639 evaluated DS2 heartbeats into correct classifications and off-diagonal prediction errors."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Segmented bar */}
          <div
            style={{
              width: '100%',
              height: '24px',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            <div
              style={{
                width: `${accuracyPct}%`,
                height: '100%',
                backgroundColor: '#10b981',
                transition: 'width 0.4s ease',
              }}
              title={`Correct Predictions: ${correctBeats.toLocaleString()} beats (${accuracyPct.toFixed(2)}%)`}
            />
            <div
              style={{
                width: `${errorRate}%`,
                height: '100%',
                backgroundColor: '#ef4444',
                transition: 'width 0.4s ease',
              }}
              title={`Prediction Errors: ${totalErrors.toLocaleString()} beats (${errorRate.toFixed(2)}%)`}
            />
          </div>

          {/* Metrics row below bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }} />
              <span style={{ fontWeight: 600 }}>Correct Classifications:</span>
              <span className="font-mono" style={{ fontWeight: 700, color: '#10b981' }}>
                {correctBeats.toLocaleString()} beats ({accuracyPct.toFixed(2)}%)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }} />
              <span style={{ fontWeight: 600 }}>Prediction Errors:</span>
              <span className="font-mono" style={{ fontWeight: 700, color: '#ef4444' }}>
                {totalErrors.toLocaleString()} beats ({errorRate.toFixed(2)}%)
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Note: Prediction outcome distribution reflects model-level assignments against reference annotations on the held-out test cohort.
          </p>
        </div>
      </Card>

      {/* 4. Class-Specific Error Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        {classErrorData.map((item) => {
          const accent = AAMI_CLASSES[item.cls]?.color || '#38bdf8';
          return (
            <Card key={item.cls}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <ClassBadge cls={item.cls} showDescription />
                <span className="badge badge-danger font-mono" style={{ fontSize: '0.75rem' }}>
                  {item.errorRatePct}% Err Rate
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Support:</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>
                    {item.support.toLocaleString()} beats
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Correct:</span>
                  <span className="font-mono" style={{ color: '#10b981', fontWeight: 600 }}>
                    {item.correct.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Incorrect:</span>
                  <span className="font-mono" style={{ color: '#ef4444', fontWeight: 700 }}>
                    {item.incorrect.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Recall (Sensitivity):</span>
                  <span className="font-mono" style={{ fontWeight: 600 }}>
                    {(item.recall * 100).toFixed(2)}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Share of All Errors:</span>
                  <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                    {item.shareOfErrors}%
                  </span>
                </div>
              </div>

              {item.cls === 'F' && (
                <div style={{ marginTop: '0.6rem', fontSize: '0.74rem', color: '#f59e0b', lineHeight: 1.35 }}>
                  The frozen model exhibits the highest error rate for class F in the DS2 evaluation (75.26%).
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* 5. Class Error Rate Visualization & Class-Wise Table */}
      <Card
        title="Class-Wise Error Analysis"
        subtitle="Comparing held-out error rate (1 - Recall) and absolute error volumes across diagnostic classes."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            alignItems: 'center',
          }}
        >
          {/* Chart showing error rate by true class */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Held-Out Error Rate by True Class (1 - Recall):
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={classErrorData}
                margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="cls" stroke="#64748b" tick={{ fill: '#f8fafc', fontWeight: 700 }} />
                <YAxis
                  domain={[0, 100]}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<ErrorChartTooltip />} />
                <Bar dataKey="errorRatePct" name="Error Rate %" radius={[4, 4, 0, 0]}>
                  {classErrorData.map((entry) => (
                    <Cell
                      key={`bar-${entry.cls}`}
                      fill={entry.cls === 'F' ? '#ef4444' : entry.cls === 'S' ? '#f59e0b' : '#38bdf8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.35rem', textAlign: 'center' }}>
              The model shows the highest held-out error rate for class F (75.26%), followed by S (24.36%), V (12.80%), and N (7.58%).
            </p>
          </div>

          {/* Class-wise data table */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>True Class</th>
                  <th>Support</th>
                  <th>Correct</th>
                  <th>Incorrect</th>
                  <th>Recall</th>
                  <th>Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {classErrorData.map((item) => (
                  <tr key={item.cls}>
                    <td>
                      <ClassBadge cls={item.cls} />
                    </td>
                    <td className="font-mono">{item.support.toLocaleString()}</td>
                    <td className="font-mono" style={{ color: '#10b981' }}>
                      {item.correct.toLocaleString()}
                    </td>
                    <td className="font-mono" style={{ color: '#ef4444', fontWeight: 700 }}>
                      {item.incorrect.toLocaleString()}
                    </td>
                    <td className="font-mono">{(item.recall * 100).toFixed(2)}%</td>
                    <td className="font-mono" style={{ fontWeight: 700, color: item.cls === 'F' ? '#ef4444' : undefined }}>
                      {item.errorRatePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* 6. Error-Focused Confusion Matrix */}
      {cm?.raw && (
        <Card
          title="Off-Diagonal Error-Focused Confusion Matrix"
          subtitle="Rows represent true annotations; columns represent predictions. Off-diagonal cells highlight misclassifications."
          action={
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setCmMode('raw')}
                className={`btn btn-sm ${cmMode === 'raw' ? 'btn-primary' : 'btn-outline'}`}
              >
                Raw Counts
              </button>
              <button
                type="button"
                onClick={() => setCmMode('row_normalized')}
                className={`btn btn-sm ${cmMode === 'row_normalized' ? 'btn-primary' : 'btn-outline'}`}
              >
                Row Normalized (Recall)
              </button>
              <button
                type="button"
                onClick={() => setCmMode('column_normalized')}
                className={`btn btn-sm ${cmMode === 'column_normalized' ? 'btn-primary' : 'btn-outline'}`}
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
            {/* Interactive Matrix Grid */}
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

                          // Heatmap alpha: emphasize off-diagonal errors
                          const offDiagAlpha = !isDiag && totalErrors > 0 ? val / 2200 : 0;
                          const bgCell = isDiag
                            ? 'rgba(16, 185, 129, 0.12)'
                            : val > 0
                            ? `rgba(239, 68, 68, ${Math.max(0.08, Math.min(0.85, offDiagAlpha))})`
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
                                  isDiag,
                                  r: rIdx,
                                  c: cIdx,
                                })
                              }
                              className="font-mono"
                              style={{
                                cursor: 'pointer',
                                backgroundColor: bgCell,
                                outline: isSelected ? '2px solid var(--accent-cyan)' : undefined,
                                fontWeight: isDiag ? 700 : 600,
                                color: isDiag ? '#10b981' : val > 0 ? '#fca5a5' : 'var(--text-muted)',
                                transition: 'all 0.15s ease',
                              }}
                              title={`True ${trueCls} → Predicted ${predCls}: ${val.toLocaleString()} beats`}
                            >
                              {cmMode === 'raw'
                                ? val.toLocaleString()
                                : `${(normVal * 100).toFixed(2)}%`}
                            </td>
                          );
                        })}
                        <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {rowSum.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '12px', height: '12px', backgroundColor: 'rgba(16, 185, 129, 0.3)', borderRadius: '2px' }} />
                  <span>Diagonal: Correct Classifications</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '12px', height: '12px', backgroundColor: 'rgba(239, 68, 68, 0.4)', borderRadius: '2px' }} />
                  <span>Off-Diagonal: Misclassifications (Errors)</span>
                </div>
              </div>
            </div>

            {/* Cell Inspection Panel */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-surface-2)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Matrix Cell Inspection
              </div>

              {selectedCell ? (
                <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ClassBadge cls={selectedCell.actual} />
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <ClassBadge cls={selectedCell.predicted} />
                    <span className={`badge ${selectedCell.isDiag ? 'badge-success' : 'badge-danger'}`}>
                      {selectedCell.isDiag ? 'Correct' : 'Misclassification'}
                    </span>
                  </div>

                  <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.2rem' }} className="font-mono">
                    {selectedCell.count.toLocaleString()} beats
                  </div>

                  {!selectedCell.isDiag && totalErrors > 0 && (
                    <div style={{ fontSize: '0.84rem', color: '#ef4444', fontWeight: 600 }}>
                      Represents {((selectedCell.count / totalErrors) * 100).toFixed(2)}% of all 4,502 model errors.
                    </div>
                  )}

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {selectedCell.isDiag
                      ? `True ${selectedCell.actual} heartbeats correctly classified as ${selectedCell.predicted}.`
                      : `True ${selectedCell.actual} heartbeats incorrectly assigned to predicted class ${selectedCell.predicted}.`}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.65rem' }}>
                  Click any cell in the 4×4 matrix to inspect exact counts, error proportions, and transition properties.
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 7. Top Misclassification Pairs & Error Flow */}
      <div className="grid" style={{ marginBottom: '1.25rem' }}>
        {/* Ranked Table of Misclassification Pairs */}
        <Card
          title="Top Misclassification Pairs"
          subtitle="Ranked off-diagonal confusion matrix cells by absolute beat count."
        >
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Rank</th>
                  <th>Actual</th>
                  <th>Predicted</th>
                  <th>Count</th>
                  <th>% of Errors</th>
                </tr>
              </thead>
              <tbody>
                {topErrorPairs.map((pair) => (
                  <tr key={pair.pairLabel}>
                    <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                      #{pair.rank}
                    </td>
                    <td>
                      <ClassBadge cls={pair.actual} />
                    </td>
                    <td>
                      <ClassBadge cls={pair.predicted} />
                    </td>
                    <td className="font-mono" style={{ fontWeight: 700 }}>
                      {pair.count.toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '60px',
                            height: '6px',
                            backgroundColor: 'var(--bg-surface-2)',
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pair.percentageOfErrors}%`,
                              height: '100%',
                              backgroundColor: '#ef4444',
                            }}
                          />
                        </div>
                        <span className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {pair.percentageOfErrors}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Error Flow Chart */}
        <Card
          title="Major Error Transitions (Actual → Predicted)"
          subtitle="Horizontal representation of dominant off-diagonal misclassification pairs."
        >
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={[...topErrorPairs.slice(0, 8)].reverse()}
              layout="vertical"
              margin={{ top: 10, right: 30, bottom: 5, left: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v) => v.toLocaleString()}
              />
              <YAxis
                type="category"
                dataKey="pairLabel"
                stroke="#64748b"
                tick={{ fill: '#f8fafc', fontSize: 11, fontFamily: 'monospace' }}
                width={60}
              />
              <Tooltip content={<ErrorChartTooltip />} />
              <Bar dataKey="count" name="Beat Count" fill="#ef4444" radius={[0, 4, 4, 0]}>
                {[...topErrorPairs.slice(0, 8)].reverse().map((entry, idx) => (
                  <Cell
                    key={`bar-pair-${idx}`}
                    fill={entry.rank === 1 ? '#ef4444' : entry.rank === 2 ? '#f59e0b' : '#38bdf8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem', textAlign: 'center' }}>
            The two largest error pairs (N → S: 2,154 beats, N → V: 1,126 beats) account for 72.86% of all model errors.
          </p>
        </Card>
      </div>

      {/* 8. Asymmetry: Errors by True Class vs Errors by Predicted Class */}
      <Card
        title="True-Class Errors vs. Predicted-Class Errors"
        subtitle="True-class errors answer 'which actual classes are missed?'; predicted-class errors answer 'which predicted labels receive incorrect assignments?'"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            alignItems: 'center',
          }}
        >
          <div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={trueVsPredErrors}
                margin={{ top: 10, right: 20, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="cls" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => v.toLocaleString()}
                />
                <Tooltip content={<ErrorChartTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '0.8rem' }} />
                <Bar dataKey="Missed (True Class Errors)" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="False Assignments (Predicted Class Errors)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            <p>
              <strong>Class N Asymmetry:</strong> 3,352 true N beats are missed (mostly predicted as S or V), while predicted N receives only 958 incorrect beats.
            </p>
            <p>
              <strong>Class S Asymmetry:</strong> Predicted S receives 2,222 false assignments (primarily from dominant N beats), substantially exceeding the 447 true S beats missed by the model.
            </p>
            <p>
              <strong>Minority Class Dilution:</strong> Because N beats outnumber S and V beats by orders of magnitude, even a modest false-positive rate on N creates a large absolute influx into the predicted S and V classes.
            </p>
          </div>
        </div>
      </Card>

      {/* 9. Record-Level DS2 Error Analysis */}
      <Card
        title="Record-Level DS2 Error Analysis (22 Test Records)"
        subtitle="Individual evaluation performance across all 22 held-out inter-record partitions."
        action={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={recordSort}
              onChange={(e) => setRecordSort(e.target.value)}
              className="form-select"
              style={{
                padding: '0.3rem 0.6rem',
                backgroundColor: 'var(--bg-surface-2)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
              }}
            >
              <option value="accuracy_desc">Highest Accuracy</option>
              <option value="accuracy_asc">Lowest Accuracy</option>
              <option value="errors_desc">Most Errors</option>
              <option value="errors_asc">Fewest Errors</option>
              <option value="support_desc">Largest Support</option>
              <option value="support_asc">Smallest Support</option>
              <option value="record_asc">Record ID</option>
            </select>

            <input
              type="text"
              placeholder="Search Record ID..."
              value={recordSearch}
              onChange={(e) => setRecordSearch(e.target.value)}
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
        {/* Record Insights Banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#10b981' }}>High Accuracy Records</div>
            <div style={{ marginTop: '0.2rem', color: 'var(--text-secondary)' }}>
              Record 212 has high held-out accuracy (99.44%) within the DS2 cohort, with 15 errors across 2,698 evaluated beats.
            </div>
          </div>

          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#ef4444' }}>Lower Accuracy Records</div>
            <div style={{ marginTop: '0.2rem', color: 'var(--text-secondary)' }}>
              Record 232 has lower held-out accuracy (66.86%) than other evaluated DS2 records, with 587 errors across 1,771 evaluated beats.
            </div>
          </div>
        </div>

        {/* 22 Records Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Evaluated Beats</th>
                <th>Accuracy</th>
                <th>Error Rate</th>
                <th>Errors</th>
                <th>Correct</th>
                <th>Class Recalls (N / S / V / F)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedRecords.map((r) => (
                <tr key={r.record_id}>
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    Record {r.record_id}
                  </td>
                  <td className="font-mono">{r.evaluated_beats.toLocaleString()}</td>
                  <td className="font-mono" style={{ fontWeight: 700, color: r.accuracyPct >= 90 ? '#10b981' : '#f59e0b' }}>
                    {r.accuracyPct}%
                  </td>
                  <td className="font-mono" style={{ color: r.errorRatePct > 15 ? '#ef4444' : 'var(--text-secondary)' }}>
                    {r.errorRatePct}%
                  </td>
                  <td className="font-mono" style={{ color: '#ef4444', fontWeight: 600 }}>
                    {r.errors.toLocaleString()}
                  </td>
                  <td className="font-mono" style={{ color: '#10b981' }}>
                    {r.correct.toLocaleString()}
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.78rem' }}>
                    N: {r.n_recall != null ? `${(r.n_recall * 100).toFixed(1)}%` : '—'} •{' '}
                    S: {r.s_recall != null ? `${(r.s_recall * 100).toFixed(1)}%` : '—'} •{' '}
                    V: {r.v_recall != null ? `${(r.v_recall * 100).toFixed(1)}%` : '—'} •{' '}
                    F: {r.f_recall != null ? `${(r.f_recall * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td>
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

      {/* 10. Error Beat Explorer Notice & Navigation */}
      <Card
        title="Interactive Beat Inspection & Telemetry"
        subtitle="Direct access to continuous waveform signals and individual beat predictions."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-default)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
              ℹ️ Individual DS2 misclassified beat records are not exposed by the current experiment API.
            </div>
            <div>
              The backend experimental-results API exposes aggregate confusion matrices and per-record evaluation summaries for DS2. For live beat-by-beat inspection, please navigate to the interactive Waveform Studio or Beat Inspector.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <Link to="/records" className="btn btn-primary btn-sm">
              Explore All Records →
            </Link>
            <Link to="/waveform/100" className="btn btn-secondary btn-sm">
              Open Waveform 100 →
            </Link>
            <Link to="/waveform/212" className="btn btn-outline btn-sm">
              Inspect High-Accuracy Record 212 →
            </Link>
            <Link to="/waveform/232" className="btn btn-outline btn-sm">
              Inspect Lower-Accuracy Record 232 →
            </Link>
          </div>
        </div>
      </Card>

      {/* 11. Academic Interpretation & Scientific Limitations */}
      <Card
        title="Academic Interpretation & Limitations"
        subtitle="Contextual analysis of model errors within the MIT-BIH Arrhythmia Database."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          <p>
            1. <strong>Error Distribution:</strong> Error analysis complements aggregate evaluation by showing how predictions are distributed across true and predicted classes. The DS2 confusion matrix indicates that model errors are concentrated in specific class transitions rather than being uniformly distributed.
          </p>
          <p>
            2. <strong>Class Imbalance Context:</strong> The DS2 dataset is highly imbalanced (Class N represents 89.04% of all evaluated beats). Because class frequencies are unequal, the largest absolute error count (N: 3,352 errors) does not correspond to the highest error rate (F: 75.26% error rate). Class imbalance is an important contextual factor.
          </p>
          <p>
            3. <strong>Dominant Confusion Pairs:</strong> The most frequent errors involve normal beats misclassified as ectopic (N → S: 2,154 beats, N → V: 1,126 beats). Conversely, fusion beats (F) frequently suffer from overlap with normal conduction (F → N: 242 beats).
          </p>
          <p>
            4. <strong>Complementary Scientific Scope:</strong> Error analysis shows where the model fails on held-out data. Feature importance shows which input features the model relies on globally. These are complementary analyses that together characterize the frozen Random Forest representation.
          </p>
        </div>

        <div className="disclaimer-banner" style={{ margin: '1rem 0 0 0' }}>
          <span>ℹ️</span>
          <span>
            <strong>Scientific & Academic Disclaimer:</strong> The observed error patterns describe this frozen model on the held-out DS2 records and should not be interpreted as clinical performance, diagnostic failure rate, or patient-specific health assessment.
          </span>
        </div>
      </Card>
    </PageContainer>
  );
}
