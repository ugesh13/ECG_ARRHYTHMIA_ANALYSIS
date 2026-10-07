import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBeatDetail, getErrorMessage } from '../services/api.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import ClassBadge from '../components/ClassBadge.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function BeatInspector() {
  const { recordId, beatIndex } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getBeatDetail(recordId, beatIndex)
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
  }, [recordId, beatIndex]);

  if (loading) return <LoadingState label={`Fetching 209-D beat telemetry for Beat #${beatIndex} in Record ${recordId}…`} />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const isEdge = data?.is_edge_beat;
  const predClass = data?.predicted_class;
  const gtClass = data?.ground_truth_class;

  return (
    <PageContainer
      title={`Single Beat Inspector — Beat #${beatIndex}`}
      subtitle={`Diagnostic inspection of 200 morphology samples (-90 to +110 offsets) and 9 bidirectional RR interval features for Record ${recordId}.`}
      breadcrumbs={
        <>
          <Link to="/records">Records</Link>
          <span>/</span>
          <Link to={`/analysis/${recordId}`}>Record {recordId}</Link>
          <span>/</span>
          <span>Beat {beatIndex}</span>
        </>
      }
      actions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link
            to={`/prediction/${recordId}/${beatIndex}`}
            className="btn btn-secondary btn-sm"
          >
            Prediction Details
          </Link>
          <Link
            to={`/analysis/${recordId}`}
            className="btn btn-primary btn-sm"
          >
            Back to Beat Table
          </Link>
        </div>
      }
    >
      {/* Beat Summary Card */}
      <Card title={`Beat #${beatIndex} Clinical Summary`}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>R-Peak Timestamp</div>
            <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {data?.time_seconds?.toFixed(3)}s (Sample #{data?.sample_index})
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Model Classification</div>
            <div style={{ marginTop: '0.2rem' }}>
              <ClassBadge cls={predClass} showDescription />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cardiologist Reference (GT)</div>
            <div style={{ marginTop: '0.2rem' }}>
              <ClassBadge cls={gtClass} symbol={data?.ground_truth_symbol} showDescription />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prediction Confidence</div>
            <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {isEdge ? 'N/A (Edge Beat)' : `${((data?.confidence || 0) * 100).toFixed(1)}%`}
            </div>
          </div>
        </div>
      </Card>

      {/* 9 Bidirectional RR Interval Timing Features */}
      {data?.rr_features && (
        <Card
          title="Extracted Bidirectional RR Timing Features (9-D)"
          subtitle="Preceding and subsequent cardiac coupling intervals extracted by the feature service."
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {Object.entries(data.rr_features).map(([featName, val]) => (
              <div
                key={featName}
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--bg-surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {featName}
                </div>
                <div className="font-mono" style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '0.15rem' }}>
                  {val !== null && val !== undefined ? Number(val).toFixed(4) : '—'}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Phase 20 Feature Banner */}
      <div className="phase-banner">
        <h3 className="phase-banner-title">Phase 20 Preview: High-Fidelity Beat Morphology Studio</h3>
        <p className="phase-banner-desc">
          Interactive SVG overlay of 200 z-score normalized samples, QRS onset/offset fiducial lines, and ST-segment deviation analysis will be unlocked in Phase 20.
        </p>
        <Link to={`/analysis/${recordId}`} className="btn btn-outline btn-sm">
          Return to Record Overview
        </Link>
      </div>
    </PageContainer>
  );
}
