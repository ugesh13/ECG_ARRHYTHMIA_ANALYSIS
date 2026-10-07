import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useECG from '../hooks/useECG.js';
import { getAnalysisBeats, getAnalysisSummary, listRecords } from '../services/api.js';
import { getAnnotationMeta, getRecordPartition } from '../utils/aamiTaxonomy.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import ECGChart from '../components/ECGChart.jsx';
import ClassBadge from '../components/ClassBadge.jsx';
import ECGLegend from '../components/ECGLegend.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

const WINDOW_PRESETS = [2, 5, 10, 20, 30];

export default function WaveformViewer() {
  const { recordId } = useParams();
  const navigate = useNavigate();

  // Navigation window state
  const [windowStart, setWindowStart] = useState(0);
  const [windowLength, setWindowLength] = useState(10);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState('all');
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [exactBeatIndex, setExactBeatIndex] = useState(null);

  // Quick record switcher list
  const [availableRecords, setAvailableRecords] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState(null);

  // Primary ECG hook
  const {
    metadata,
    signal,
    annotations,
    loading,
    error,
    annotationsWarning,
    reload,
  } = useECG(recordId, {
    windowStart,
    windowLength,
  });

  // Reset window start and selection when recordId changes
  useEffect(() => {
    setWindowStart(0);
    setSelectedAnnotation(null);
    setExactBeatIndex(null);
    setSelectedLeadIndex('all');
  }, [recordId]);

  // Attempt to resolve exact beat_index from analysis when annotation is selected
  useEffect(() => {
    setExactBeatIndex(null);
    if (!selectedAnnotation || !recordId) return;
    let active = true;

    // Approximate page based on 1.2 beats per second (typical MIT-BIH rate)
    const estPage = Math.max(1, Math.floor((selectedAnnotation.time * 1.2) / 50));
    getAnalysisBeats(recordId, { page: estPage, page_size: 100 })
      .then((res) => {
        if (!active || !res?.items) return;
        const match = res.items.find(
          (b) =>
            Math.abs(b.sample_index - selectedAnnotation.sample) < 10 ||
            Math.abs(b.time_seconds - selectedAnnotation.time) < 0.05
        );
        if (match) {
          setExactBeatIndex(match.beat_index);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [selectedAnnotation, recordId]);

  // Discover records for quick switcher dropdown
  useEffect(() => {
    let active = true;
    listRecords()
      .then((res) => {
        if (active && res?.records) {
          setAvailableRecords(res.records.map((r) => r.record_id));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Check if analysis is already available for this record
  useEffect(() => {
    let active = true;
    setAnalysisStatus(null);
    if (!recordId) return;

    getAnalysisSummary(recordId)
      .then((res) => {
        if (active) setAnalysisStatus(res);
      })
      .catch(() => {
        if (active) setAnalysisStatus(null);
      });

    return () => {
      active = false;
    };
  }, [recordId]);

  const duration = metadata?.duration_seconds || 1800;
  const fs = metadata?.sampling_frequency || 360;
  const nSamples = metadata?.n_samples || Math.round(duration * fs);
  const partition = getRecordPartition(recordId, metadata?.source);
  const channelNames = metadata?.channel_names || ['MLII', 'V1'];

  // Calculate safe window bounds
  const currentStart = Math.max(0, Math.min(windowStart, duration - windowLength));
  const currentEnd = Math.min(duration, currentStart + windowLength);
  const startSample = Math.round(currentStart * fs);
  const endSample = Math.round(currentEnd * fs);

  // Navigation handlers
  const handlePreset = (len) => {
    setWindowLength(len);
    if (windowStart + len > duration) {
      setWindowStart(Math.max(0, duration - len));
    }
  };

  const handleZoomIn = () => {
    const nextLen = Math.max(2, Math.round(windowLength * 0.6));
    setWindowLength(nextLen);
  };

  const handleZoomOut = () => {
    const nextLen = Math.min(Math.min(60, duration), Math.round(windowLength * 1.5));
    setWindowLength(nextLen);
    if (windowStart + nextLen > duration) {
      setWindowStart(Math.max(0, duration - nextLen));
    }
  };

  const handleResetZoom = () => {
    setWindowLength(10);
    setWindowStart(0);
  };

  const handlePanStep = (deltaSeconds) => {
    setWindowStart((s) => {
      const target = s + deltaSeconds;
      return Math.max(0, Math.min(duration - windowLength, target));
    });
  };

  // Safe mapping of selected annotation to beat index
  const mappedBeatIndex = useMemo(() => {
    if (!selectedAnnotation) return 0;
    // If annotations are present in window, calculate approximate or exact sequential beat
    if (annotations?.annotations) {
      const beatsBefore = annotations.annotations.filter(
        (a) => a.sample <= selectedAnnotation.sample && getAnnotationMeta(a.symbol).isBeat
      ).length;
      return Math.max(0, beatsBefore - 1);
    }
    return 0;
  }, [selectedAnnotation, annotations]);

  const selectedMeta = selectedAnnotation ? getAnnotationMeta(selectedAnnotation.symbol) : null;

  return (
    <PageContainer
      title="ECG Signal Processing Studio"
      subtitle="Interactive exploration of MIT-BIH ECG waveform signals, multi-lead telemetry, and beat annotations."
      breadcrumbs={
        <>
          <Link to="/records">Records</Link>
          <span>/</span>
          <span>Record {recordId} Studio</span>
        </>
      }
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Quick Record Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label htmlFor="record-select" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Record:
            </label>
            <select
              id="record-select"
              value={recordId}
              onChange={(e) => navigate(`/waveform/${e.target.value}`)}
              style={{
                backgroundColor: 'var(--bg-surface-2)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {availableRecords.length > 0 ? (
                availableRecords.map((r) => (
                  <option key={r} value={r}>
                    Record {r}
                  </option>
                ))
              ) : (
                <option value={recordId}>Record {recordId}</option>
              )}
            </select>
          </div>

          <Link to="/records" className="btn btn-secondary btn-sm">
            ← Record Explorer
          </Link>
          <Link to={`/analysis/${recordId}`} className="btn btn-primary btn-sm">
            ⚡ Full Record Analysis
          </Link>
        </div>
      }
    >
      {/* 1. Header Metadata Bar / Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard
          label="Record ID"
          value={recordId}
          badge={<span className={`badge ${partition.badge}`}>{partition.name}</span>}
          subtext={`Source: ${metadata?.source || 'MIT-BIH Arrhythmia Database'}`}
          accentColor="#00e5ff"
        />
        <StatCard
          label="Sampling Frequency"
          value={`${fs} Hz`}
          subtext={`Decimation: ${signal?.decimation_step ? `${signal.decimation_step}x` : '1x native'}`}
          accentColor="#38bdf8"
        />
        <StatCard
          label="Record Duration"
          value={`${duration.toFixed(1)} s`}
          subtext={`${(duration / 60).toFixed(1)} minutes continuous`}
          accentColor="#10b981"
        />
        <StatCard
          label="Total Samples"
          value={nSamples.toLocaleString()}
          subtext={`${metadata?.n_channels || 2} Leads (${channelNames.join(', ')})`}
          accentColor="#a855f7"
        />
      </div>

      {/* 2. Interactive Navigation & Window Controls */}
      <Card
        title="Signal Navigation & Temporal Window Controls"
        subtitle={`Inspect specific time intervals of Record ${recordId} (0.00s to ${duration.toFixed(1)}s)`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Top Row: Presets & Zoom */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {/* Window Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Window Size:
              </span>
              {WINDOW_PRESETS.map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => handlePreset(len)}
                  className={`btn btn-sm ${windowLength === len ? 'btn-primary' : 'btn-outline'}`}
                  aria-label={`Set window length to ${len} seconds`}
                >
                  {len}s {len === 2 ? '(Beat)' : len === 10 ? '(Default)' : ''}
                </button>
              ))}
            </div>

            {/* Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Zoom:
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={windowLength <= 2}
                className="btn btn-secondary btn-sm"
                title="Zoom in (reduce window duration)"
                aria-label="Zoom in"
              >
                + Zoom In
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={windowLength >= Math.min(60, duration)}
                className="btn btn-secondary btn-sm"
                title="Zoom out (increase window duration)"
                aria-label="Zoom out"
              >
                − Zoom Out
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="btn btn-outline btn-sm"
                title="Reset to 10s standard window"
                aria-label="Reset zoom"
              >
                ↺ Reset (10s)
              </button>
            </div>
          </div>

          {/* Middle Row: Pan Navigation & Time Range Display */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: 'var(--bg-surface-2)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Pan Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setWindowStart(0)}
                disabled={windowStart <= 0}
                className="btn btn-secondary btn-sm"
                title="Jump to beginning"
                aria-label="Jump to start"
              >
                ⏮ 0s
              </button>
              <button
                type="button"
                onClick={() => handlePanStep(-windowLength)}
                disabled={windowStart <= 0}
                className="btn btn-secondary btn-sm"
                title={`Pan back ${windowLength}s`}
                aria-label="Previous window"
              >
                ◀ Prev Window
              </button>
              <button
                type="button"
                onClick={() => handlePanStep(-1)}
                disabled={windowStart <= 0}
                className="btn btn-outline btn-sm"
                title="Step backward 1 second"
                aria-label="Step back 1s"
              >
                ◀ 1s
              </button>
              <button
                type="button"
                onClick={() => handlePanStep(1)}
                disabled={windowStart + windowLength >= duration}
                className="btn btn-outline btn-sm"
                title="Step forward 1 second"
                aria-label="Step forward 1s"
              >
                1s ▶
              </button>
              <button
                type="button"
                onClick={() => handlePanStep(windowLength)}
                disabled={windowStart + windowLength >= duration}
                className="btn btn-secondary btn-sm"
                title={`Pan forward ${windowLength}s`}
                aria-label="Next window"
              >
                Next Window ▶
              </button>
              <button
                type="button"
                onClick={() => setWindowStart(Math.max(0, duration - windowLength))}
                disabled={windowStart + windowLength >= duration}
                className="btn btn-secondary btn-sm"
                title="Jump to end of recording"
                aria-label="Jump to end"
              >
                End ⏭
              </button>
            </div>

            {/* Time Window Readout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                className="font-mono"
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                }}
              >
                {currentStart.toFixed(2)}s — {currentEnd.toFixed(2)}s
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                (Window: {windowLength}s / Samples {startSample.toLocaleString()} — {endSample.toLocaleString()})
              </span>
            </div>
          </div>

          {/* Bottom Row: Continuous Timeline Scrubber */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '0.35rem',
              }}
            >
              <span>Record Timeline: 0.00s</span>
              <span>Scrub to navigate continuous recording</span>
              <span>{duration.toFixed(1)}s ({nSamples.toLocaleString()} samples)</span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(0, duration - windowLength)}
              step="0.5"
              value={currentStart}
              onChange={(e) => setWindowStart(Number(e.target.value))}
              aria-label="Record timeline scrubber"
              style={{
                width: '100%',
                cursor: 'pointer',
                accentColor: 'var(--accent-cyan)',
              }}
            />
          </div>
        </div>
      </Card>

      {/* 3. Lead Selection Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--bg-surface-1)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Active Lead Display:
          </span>
          <button
            type="button"
            onClick={() => setSelectedLeadIndex('all')}
            className={`btn btn-sm ${selectedLeadIndex === 'all' ? 'btn-primary' : 'btn-outline'}`}
            aria-label="View all leads synchronously"
          >
            All Leads ({channelNames.length})
          </button>
          {channelNames.map((name, idx) => (
            <button
              key={`btn-lead-${name}-${idx}`}
              type="button"
              onClick={() => setSelectedLeadIndex(String(idx))}
              className={`btn btn-sm ${selectedLeadIndex === String(idx) ? 'btn-primary' : 'btn-outline'}`}
              aria-label={`View Lead ${name}`}
            >
              Lead {name} (Ch {idx})
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {analysisStatus?.status === 'completed' ? (
            <span className="badge badge-success" style={{ fontSize: '0.78rem' }}>
              ✓ Analysis Cached ({analysisStatus.total_beats} beats)
            </span>
          ) : (
            <span className="badge badge-default" style={{ fontSize: '0.78rem' }}>
              Unanalyzed In-Memory
            </span>
          )}
        </div>
      </div>

      {/* Partial Data Warning (if annotations missing but signal loaded) */}
      {annotationsWarning && (
        <div className="disclaimer-banner" style={{ margin: '0 0 1rem 0' }}>
          <span>⚠️</span>
          <span>{annotationsWarning}</span>
        </div>
      )}

      {/* 4. Interactive ECG Chart */}
      <Card
        title={`Continuous ECG Telemetry (${currentStart.toFixed(1)}s — {currentEnd.toFixed(1)}s)`}
        subtitle="Calibrated physical amplitude in millivolts (mV). Vertical markers indicate PhysioNet R-peak annotations."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Sampling: {fs} Hz
            </span>
          </div>
        }
      >
        {loading && !signal && <LoadingState label="Fetching ECG waveform samples from server…" />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {signal && (
          <ECGChart
            signal={signal}
            annotations={annotations}
            selectedAnnotation={selectedAnnotation}
            selectedLeadIndex={selectedLeadIndex}
            loading={loading}
            onSelectAnnotation={(ann) => setSelectedAnnotation(ann)}
          />
        )}
      </Card>

      {/* 5. Selected Beat Inspection Panel */}
      {selectedAnnotation ? (
        <Card
          title={`Selected Beat Annotation at ${selectedAnnotation.time.toFixed(3)}s`}
          subtitle="Reference heartbeat annotation metadata from MIT-BIH PhysioNet standard."
          action={
            <button
              type="button"
              onClick={() => setSelectedAnnotation(null)}
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
              marginBottom: '1rem',
            }}
          >
            <div className="stat-box">
              <div className="stat-title">Annotation Symbol</div>
              <div className="stat-value font-mono" style={{ color: 'var(--accent-cyan)' }}>
                {selectedAnnotation.symbol}
              </div>
              <div className="stat-sub">{selectedMeta?.description}</div>
            </div>

            <div className="stat-box">
              <div className="stat-title">AAMI Diagnostic Class</div>
              <div style={{ marginTop: '0.25rem' }}>
                <ClassBadge cls={selectedMeta?.aamiClass || 'edge'} symbol={selectedAnnotation.symbol} showDescription size="md" />
              </div>
              <div className="stat-sub">{selectedMeta?.classInfo?.name || 'Boundary / Unknown'}</div>
            </div>

            <div className="stat-box">
              <div className="stat-title">Absolute Sample Index</div>
              <div className="stat-value font-mono">
                #{selectedAnnotation.sample.toLocaleString()}
              </div>
              <div className="stat-sub">Time: {selectedAnnotation.time.toFixed(3)} s</div>
            </div>

            <div className="stat-box">
              <div className="stat-title">Auxiliary Note</div>
              <div className="stat-value" style={{ fontSize: '1rem' }}>
                {selectedAnnotation.aux_note || 'None recorded'}
              </div>
              <div className="stat-sub">WFDB annotation flag</div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Navigate to detailed morphology inspection or run machine learning inference on this record.
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link
                to={`/beat/${recordId}/${exactBeatIndex !== null ? exactBeatIndex : mappedBeatIndex}`}
                className="btn btn-primary btn-sm"
              >
                Inspect Beat #{exactBeatIndex !== null ? exactBeatIndex : mappedBeatIndex} in Beat Inspector →
              </Link>
              <Link
                to={`/analysis/${recordId}`}
                className="btn btn-secondary btn-sm"
              >
                Analyze Full Record →
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--bg-surface-1)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-subtle)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.2rem' }}>💡</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Click on any beat annotation marker in the waveform above to inspect sample positions, AAMI class definitions, and morphology features.
            </span>
          </div>
          <Link to={`/analysis/${recordId}`} className="btn btn-outline btn-sm">
            Launch Arrhythmia Analysis →
          </Link>
        </div>
      )}

      {/* 6. Signal Telemetry Details & Record Information Grid */}
      <div className="grid" style={{ marginBottom: '1.25rem' }}>
        {/* Signal Window Telemetry */}
        <Card title="Current Window Telemetry" subtitle="Calculated telemetry properties of the visible signal buffer">
          <dl className="meta">
            <div>
              <dt>Current Lead(s)</dt>
              <dd>
                {selectedLeadIndex === 'all'
                  ? `All Leads (${channelNames.join(', ')})`
                  : `Lead ${channelNames[Number(selectedLeadIndex)] || selectedLeadIndex}`}
              </dd>
            </div>
            <div>
              <dt>Temporal Window</dt>
              <dd>{currentStart.toFixed(2)}s to {currentEnd.toFixed(2)}s ({windowLength}s)</dd>
            </div>
            <div>
              <dt>Start Sample Index</dt>
              <dd>#{startSample.toLocaleString()}</dd>
            </div>
            <div>
              <dt>End Sample Index</dt>
              <dd>#{endSample.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Plotted Data Points</dt>
              <dd>{signal?.n_points?.toLocaleString() || (signal?.time?.length || 0).toLocaleString()} samples</dd>
            </div>
            <div>
              <dt>Decimation Factor</dt>
              <dd>{signal?.decimation_step ? `${signal.decimation_step}x downsampling` : '1x native'}</dd>
            </div>
          </dl>
        </Card>

        {/* Record Metadata Details */}
        <Card title="MIT-BIH Record Metadata" subtitle="WFDB physical header and annotation properties">
          <dl className="meta">
            <div>
              <dt>Dataset Partition</dt>
              <dd>{partition.name}</dd>
            </div>
            <div>
              <dt>Sampling Frequency</dt>
              <dd>{fs} Hz</dd>
            </div>
            <div>
              <dt>Channels Available</dt>
              <dd>{metadata?.n_channels || 2} ({channelNames.join(', ')})</dd>
            </div>
            <div>
              <dt>Signal Amplitude Units</dt>
              <dd>{metadata?.units?.join(', ') || 'mV'}</dd>
            </div>
            <div>
              <dt>Annotations File (.atr)</dt>
              <dd>{metadata?.has_annotations ? 'Present & Verified' : 'None'}</dd>
            </div>
            <div>
              <dt>Total Record Samples</dt>
              <dd>{nSamples.toLocaleString()} samples</dd>
            </div>
          </dl>
          {metadata?.header_comments?.length > 0 && (
            <details style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--accent-cyan)' }}>
                View Header Comments (.hea raw text)
              </summary>
              <ul style={{ marginTop: '0.4rem', paddingLeft: '1.25rem' }}>
                {metadata.header_comments.map((comment, cIdx) => (
                  <li key={`comment-${cIdx}`}>{comment}</li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      </div>

      {/* 7. Signal Processing Context Panel (Academic Flowchart) */}
      <Card
        title="Signal Processing & Machine Learning Pipeline Architecture"
        subtitle="Scientific progression from raw continuous ECG voltage telemetry to Random Forest inference."
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
              borderTop: '3px solid #00e5ff',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Stage 1
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.2rem 0' }}>
              Continuous Telemetry
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Physical WFDB leads sampled at 360 Hz. Real-time window streaming and downsampling.
            </p>
          </div>

          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
              borderTop: '3px solid #38bdf8',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Stage 2
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.2rem 0' }}>
              Moving-Average Baseline Removal
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Moving-average baseline removal (W = 217 samples, reflection padding) isolating wander.
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
              Stage 3
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.2rem 0' }}>
              Segmentation & Z-Score Normalization
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Fixed 200-sample window centered at R-peak with local per-beat Z-score normalization.
            </p>
          </div>

          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-surface-2)',
              borderRadius: 'var(--radius-sm)',
              borderTop: '3px solid #f59e0b',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Stage 4
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.2rem 0' }}>
              209-D Feature Vector
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              200 morphology features + 9 bidirectional RR timing features (pre-RR, post-RR, local ratio, global ratio).
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
              Stage 5
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.2rem 0' }}>
              Random Forest Inference
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Frozen 200-tree Random Forest mapping 209-D features to ANSI/AAMI classes: N, S, V, F.
            </p>
          </div>
        </div>

        {/* Academic Exploration Notice */}
        <div className="disclaimer-banner" style={{ margin: '1rem 0 0 0' }}>
          <span>ℹ️</span>
          <span>
            <strong>Educational & Research Disclaimer:</strong> This interactive studio is designed for academic exploration of ECG waveform signals and verification of machine learning pipelines. Beat annotations and model predictions are research artifacts and do not constitute independent medical diagnoses.
          </span>
        </div>
      </Card>

      {/* 8. ANSI/AAMI Taxonomy Legend */}
      <div style={{ marginTop: '1.25rem' }}>
        <ECGLegend />
      </div>
    </PageContainer>
  );
}
