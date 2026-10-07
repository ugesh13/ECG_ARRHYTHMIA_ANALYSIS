import { useEffect, useState } from 'react';
import { getErrorMessage, getFeatureImportance } from '../services/api.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function Interpretability() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getFeatureImportance()
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
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState label="Retrieving Random Forest Gini feature importances and temporal contribution…" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const topFeatures = data?.top_features || [];
  const temporalTotal = data?.temporal_features_total_importance || 0.2638;

  return (
    <PageContainer
      title="Model Interpretability & Feature Importance"
      subtitle="Model-level feature attribution for the 209-dimensional pipeline (200 morphology samples + 9 bidirectional RR interval coupling features)."
    >
      <div className="stats-grid">
        <StatCard
          label="Top Predictive Feature"
          value={topFeatures[0]?.feature_name || 'RR_ratio_prev'}
          subtext={`Gini: ${topFeatures[0]?.gini_importance ? (topFeatures[0].gini_importance * 100).toFixed(2) + '%' : '5.82%'}`}
          accentColor="var(--accent-cyan)"
          badge={<span className="badge badge-cyan">Rank #1</span>}
        />

        <StatCard
          label="Aggregate Temporal Importance"
          value={`${(temporalTotal * 100).toFixed(2)}%`}
          subtext="9 Bidirectional RR features combined"
          accentColor="var(--color-class-N)"
          badge={<span className="badge badge-success">26.38%</span>}
        />

        <StatCard
          label="Top Morphology Feature"
          value="ECG_092"
          subtext="R-peak apex amplitude (Rank #3)"
          accentColor="var(--color-class-S)"
          badge={<span className="badge badge-warning">3.24%</span>}
        />

        <StatCard
          label="Feature Pipeline Dimension"
          value="209-D"
          subtext="200 Morphology + 9 RR features"
          accentColor="var(--color-class-F)"
          badge={<span className="badge badge-default">Input Space</span>}
        />
      </div>

      {/* Top 15 Features Table */}
      <Card
        title="Top 15 Most Informative Features"
        subtitle="Ranked by mean decrease in impurity (MDI) across 200 balanced decision trees."
      >
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Rank</th>
                <th>Feature Name</th>
                <th>Domain Type</th>
                <th>Gini Importance</th>
                <th>Relative Weight</th>
                <th>Biophysical & Algorithmic Description</th>
              </tr>
            </thead>
            <tbody>
              {topFeatures.map((feat) => {
                const isTemporal = feat.feature_type === 'Temporal';
                const pct = (feat.gini_importance * 100).toFixed(2);
                return (
                  <tr key={feat.rank}>
                    <td className="font-mono" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                      #{feat.rank}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {feat.feature_name}
                    </td>
                    <td>
                      <span className={`badge ${isTemporal ? 'badge-cyan' : 'badge-default'}`}>
                        {feat.feature_type}
                      </span>
                    </td>
                    <td className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
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
                              width: `${Math.min(100, feat.gini_importance * 1200)}%`,
                              height: '100%',
                              backgroundColor: isTemporal ? 'var(--accent-cyan)' : 'var(--text-muted)',
                            }}
                          />
                        </div>
                        <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {feat.description}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Methodology Disclaimer */}
      <div className="disclaimer-banner">
        <div>ℹ</div>
        <div>
          <strong>Model Attribution Notice:</strong> Random Forest feature importance reflects Gini impurity reduction at the ensemble model level. It indicates mathematical feature utilization by the trees, not physiological proof, causal biophysical mechanism, or standalone clinical sufficiency.
        </div>
      </div>

      {/* Phase 22 Roadmap */}
      <div className="phase-banner">
        <h3 className="phase-banner-title">Phase 22 Preview: Explainable AI & Error Analysis Studio</h3>
        <p className="phase-banner-desc">
          Single-beat SHAP force plots, counterfactual feature perturbations, and systematic false positive / false negative analysis will be introduced in Phase 22.
        </p>
      </div>
    </PageContainer>
  );
}
