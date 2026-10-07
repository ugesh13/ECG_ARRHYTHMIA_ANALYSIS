import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useECG from '../hooks/useECG.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import ECGChart from '../components/ECGChart.jsx';
import MetadataCard from '../components/MetadataCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

const WINDOW_SIZES = [5, 10, 30];

export default function WaveformViewer() {
  const { recordId } = useParams();
  const [windowStart, setWindowStart] = useState(0);
  const [windowLength, setWindowLength] = useState(10);

  const { metadata, signal, annotations, loading, error, reload } = useECG(recordId, {
    windowStart,
    windowLength,
  });

  const duration = metadata?.duration_seconds || 1800;

  return (
    <PageContainer
      title={`ECG Waveform Telemetry — Record ${recordId}`}
      subtitle={`Multi-lead signal viewer with lead configuration (${metadata?.sampling_frequency || 360} Hz) and reference annotation markers.`}
      breadcrumbs={
        <>
          <Link to="/records">Records</Link>
          <span>/</span>
          <span>Record {recordId} Waveform</span>
        </>
      }
      actions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/analysis/${recordId}`} className="btn btn-primary btn-sm">
            Analyze Arrhythmia
          </Link>
        </div>
      }
    >
      {/* Waveform Window Controls */}
      <Card>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Window Duration:
            </span>
            {WINDOW_SIZES.map((len) => (
              <button
                key={len}
                onClick={() => setWindowLength(len)}
                className={`btn btn-sm ${windowLength === len ? 'btn-primary' : 'btn-outline'}`}
              >
                {len}s
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setWindowStart((s) => Math.max(0, s - windowLength))}
              disabled={windowStart <= 0}
              className="btn btn-secondary btn-sm"
            >
              ◀ Prev Window
            </button>
            <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {windowStart.toFixed(1)}s — {(windowStart + windowLength).toFixed(1)}s (of {duration.toFixed(0)}s)
            </span>
            <button
              onClick={() => setWindowStart((s) => Math.min(duration - windowLength, s + windowLength))}
              disabled={windowStart + windowLength >= duration}
              className="btn btn-secondary btn-sm"
            >
              Next Window ▶
            </button>
          </div>
        </div>
      </Card>

      {/* Signal Visualization */}
      <Card title={`Waveform Window (${windowStart}s to ${windowStart + windowLength}s)`}>
        {loading && !signal && <LoadingState label="Streaming signal points from backend…" />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {signal && (
          <ECGChart
            signal={signal}
            annotations={annotations}
            leadIndex={0}
            windowStart={windowStart}
            windowLength={windowLength}
          />
        )}
      </Card>

      {/* Phase 19 Roadmap Card */}
      <div className="phase-banner">
        <h3 className="phase-banner-title">Phase 19 Preview: Interactive Signal Processing Studio</h3>
        <p className="phase-banner-desc">
          Continuous Pan & Zoom, 2-Lead Synchronous Waveforms, R-peak Detection Overlays, and Baseline Filter Inspection will be delivered in Phase 19.
        </p>
        <Link to={`/analysis/${recordId}`} className="btn btn-outline btn-sm">
          Proceed to Arrhythmia Analysis →
        </Link>
      </div>

      {metadata && <MetadataCard metadata={metadata} />}
    </PageContainer>
  );
}
