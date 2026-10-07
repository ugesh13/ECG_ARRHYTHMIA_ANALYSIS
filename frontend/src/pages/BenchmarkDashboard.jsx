import { useEffect, useState } from 'react';
import { getBenchmark, getErrorMessage, getGeneralization } from '../services/api.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import ClassBadge from '../components/ClassBadge.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function BenchmarkDashboard() {
  const [benchmark, setBenchmark] = useState(null);
  const [generalization, setGeneralization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      getBenchmark(),
      getGeneralization().catch(() => null),
    ])
      .then(([b, g]) => {
        if (!active) return;
        setBenchmark(b);
        setGeneralization(g);
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

  if (loading) return <LoadingState label="Loading frozen Phase 8 DS2 experimental benchmark metrics…" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const m = benchmark?.metrics;
  const cm = benchmark?.confusion_matrix;
  const perClass = benchmark?.per_class || {};

  return (
    <PageContainer
      title="Experimental Benchmark Dashboard"
      subtitle={`Locked Phase 8 evaluation on 22 held-out inter-patient DS2 records (${benchmark?.evaluated_beats_count?.toLocaleString() || '49,639'} usable beats) following the ANSI/AAMI EC57 diagnostic taxonomy.`}
    >
      {/* Overall Performance Stat Cards */}
      <div className="stats-grid">
        <StatCard
          label="Test Accuracy"
          value={m ? `${(m.accuracy * 100).toFixed(2)}%` : '—'}
          subtext="Raw overall agreement"
          accentColor="var(--color-class-N)"
          badge={<span className="badge badge-success">0.9093</span>}
        />

        <StatCard
          label="Balanced Accuracy"
          value={m ? `${(m.balanced_accuracy * 100).toFixed(2)}%` : '—'}
          subtext="Unweighted class mean"
          accentColor="var(--color-class-S)"
          badge={<span className="badge badge-warning">0.7000</span>}
        />

        <StatCard
          label="Macro F1 Score"
          value={m ? m.macro_f1.toFixed(4) : '—'}
          subtext="Primary benchmark target"
          accentColor="var(--accent-cyan)"
          badge={<span className="badge badge-cyan">0.6403</span>}
        />

        <StatCard
          label="Weighted F1 Score"
          value={m ? m.weighted_f1.toFixed(4) : '—'}
          subtext="Prevalence-weighted F1"
          accentColor="var(--color-class-F)"
          badge={<span className="badge badge-default">0.9174</span>}
        />

        <StatCard
          label="Macro ROC-AUC"
          value={m ? m.roc_auc.toFixed(4) : '—'}
          subtext={`PR-AUC: ${m ? m.pr_auc.toFixed(4) : '—'}`}
          accentColor="var(--text-primary)"
          badge={<span className="badge badge-default">0.9425</span>}
        />
      </div>

      {/* Per-Class Clinical Metrics */}
      <Card
        title="Class-Wise Diagnostic Performance (AAMI DS2)"
        subtitle="Individual Precision, Recall, and F1 scores evaluated across 49,639 beats."
      >
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Diagnostic Class</th>
                <th>Precision</th>
                <th>Recall (Sensitivity)</th>
                <th>F1 Score</th>
                <th>Test Support (Beats)</th>
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
                    <td className="font-mono" style={{ fontWeight: 600 }}>{(pc.recall ?? 0).toFixed(4)}</td>
                    <td className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{(pc.f1_score ?? 0).toFixed(4)}</td>
                    <td className="font-mono">{pc.support?.toLocaleString() ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4x4 Confusion Matrix Preview */}
      {cm?.raw && (
        <Card
          title="Raw 4×4 Confusion Matrix"
          subtitle="Rows represent true cardiologist reference annotations; columns represent Random Forest predictions."
        >
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
                  const row = cm.raw[rIdx] || [];
                  const rowSum = row.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={trueCls}>
                      <td style={{ textAlign: 'left', fontWeight: 600 }}>
                        <ClassBadge cls={trueCls} />
                      </td>
                      {row.map((val, cIdx) => (
                        <td
                          key={cIdx}
                          className="font-mono"
                          style={{
                            fontWeight: rIdx === cIdx ? 700 : 400,
                            backgroundColor: rIdx === cIdx ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                            color: rIdx === cIdx ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          }}
                        >
                          {val.toLocaleString()}
                        </td>
                      ))}
                      <td className="font-mono" style={{ fontWeight: 600 }}>
                        {rowSum.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DS1 vs DS2 Generalization Table */}
      {generalization?.comparison_table && (
        <Card
          title="DS1 Validation vs DS2 Test Generalization"
          subtitle="Measures distribution shift across patient records (not clinical generalization or statistically tested significance)."
        >
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Performance Metric</th>
                  <th>DS1 Validation (6 Records)</th>
                  <th>DS2 Held-Out Test (22 Records)</th>
                  <th>Absolute Shift (DS2 - DS1)</th>
                  <th>Relative Change</th>
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
                        color: row.absolute_difference < 0 ? 'var(--status-offline)' : 'var(--status-online)',
                      }}
                    >
                      {row.absolute_difference > 0 ? '+' : ''}{row.absolute_difference.toFixed(4)}
                    </td>
                    <td className="font-mono" style={{ color: 'var(--text-muted)' }}>
                      {row.relative_change_pct}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Phase 21 Preview Banner */}
      <div className="phase-banner">
        <h3 className="phase-banner-title">Phase 21 Preview: Interactive Confusion Matrix & Benchmark Studio</h3>
        <p className="phase-banner-desc">
          Row/Column normalization toggles, interactive heatmaps, per-record breakdown explorer, and class misclassification drill-downs will arrive in Phase 21.
        </p>
      </div>
    </PageContainer>
  );
}
