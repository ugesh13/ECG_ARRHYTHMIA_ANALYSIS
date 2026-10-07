import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useECG from '../hooks/useECG.js';
import { analyzeECGRecord, getErrorMessage, listRecords } from '../services/api.js';
import MetadataCard from '../components/MetadataCard.jsx';
import ECGChart from '../components/ECGChart.jsx';
import AnnotationsCard from '../components/AnnotationsCard.jsx';
import AnalysisCard from '../components/AnalysisCard.jsx';
import PredictionCard from '../components/PredictionCard.jsx';
import BeatTableCard from '../components/BeatTableCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageContainer from '../components/PageContainer.jsx';

const WINDOWS = [5, 10, 30];

function RecordPicker() {
  const [records, setRecords] = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    listRecords()
      .then(setRecords)
      .catch((e) => setError(getErrorMessage(e)));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!records) return <LoadingState label="Discovering available ECG recordings…" />;

  const filtered = (records.records || []).filter((r) =>
    r.record_id.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <section className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Select an ECG Record ({records.count} Available)</h2>
        <input
          type="text"
          placeholder="Filter record ID (e.g. 100, 208)..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '0.9rem' }}
        />
      </div>

      {records.count === 0 ? (
        <p className="muted">No records found. Place MIT-BIH records in backend/data/mitbih/ or upload via Upload page.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
          {filtered.map((r) => (
            <Link
              key={r.record_id}
              to={`/analysis/${r.record_id}`}
              className="btn btn-secondary"
              style={{ textAlign: 'center', padding: '0.6rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
            >
              <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{r.record_id}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                {r.has_annotations ? '✓ Annotated' : 'No annot.'}
              </span>
            </Link>
          ))}
          {filtered.length === 0 && <p className="muted">No records match "{filter}".</p>}
        </div>
      )}
    </section>
  );
}

export default function ECGAnalysis() {
  const { recordId } = useParams();
  const [windowStart, setWindowStart] = useState(0);
  const [windowLength, setWindowLength] = useState(10);

  // Analysis state
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [selectedBeat, setSelectedBeat] = useState(null);

  // Clear previous analysis immediately on record switch (Step 14)
  useEffect(() => {
    setWindowStart(0);
    setAnalysis(null);
    setAnalysisError(null);
    setSelectedBeat(null);
  }, [recordId]);

  // Load WFDB raw signal and metadata
  const { metadata, signal, annotations, loading, error, reload } =
    useECG(recordId, { windowStart, windowLength });

  // Trigger automated full-record analysis
  const handleRunAnalysis = async (forceRefresh = false) => {
    if (!recordId) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res = await analyzeECGRecord(recordId, forceRefresh);
      setAnalysis(res);
      // Auto-select first beat or first ectopic beat if available
      if (res?.beats?.length > 0) {
        const firstEctopic = res.beats.find((b) => b.is_valid && ['S', 'V', 'F'].includes(b.predicted_class));
        setSelectedBeat(firstEctopic || res.beats[0]);
      }
    } catch (e) {
      setAnalysisError(getErrorMessage(e));
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (!recordId) {
    return (
      <>
        <h1>ECG Arrhythmia Analysis</h1>
        <p className="muted" style={{ marginBottom: '1.25rem' }}>
          Select an ambulatory ECG recording from the MIT-BIH Database to inspect raw waveforms,
          annotated heartbeats, and run 209-D automated classification.
        </p>
        <RecordPicker />
      </>
    );
  }

  const duration = metadata?.duration_seconds ?? 0;
  const canNext = windowStart + windowLength < duration;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>
          ECG Arrhythmia Analysis <span className="muted">— Record {recordId}</span>
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/error-analysis" className="btn btn-outline">Error Analysis Studio →</Link>
          <Link to="/analysis" className="btn btn-secondary">← Select Another Record</Link>
        </div>
      </div>

      <MetadataCard metadata={metadata} />

      {/* Analysis Dashboard & Execution Card */}
      <AnalysisCard
        recordId={recordId}
        analysis={analysis}
        loading={analysisLoading}
        error={analysisError}
        onRunAnalysis={() => handleRunAnalysis(false)}
        onForceRefresh={() => handleRunAnalysis(true)}
      />

      {/* Continuous Waveform Viewer with Predicted Markers */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>Continuous ECG Waveform</h2>
          {analysis && (
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              Overlaid with Phase 8 model predictions
            </span>
          )}
        </div>

        <div className="toolbar">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={windowStart <= 0}
            onClick={() => setWindowStart(Math.max(0, windowStart - windowLength))}
          >
            ← Previous Window
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!canNext}
            onClick={() => setWindowStart(windowStart + windowLength)}
          >
            Next Window →
          </button>
          <label>
            Window Size:&nbsp;
            <select value={windowLength} onChange={(e) => setWindowLength(Number(e.target.value))}>
              {WINDOWS.map((w) => <option key={w} value={w}>{w} seconds</option>)}
            </select>
          </label>
          <span className="muted">
            Viewing: {windowStart.toFixed(0)}s – {Math.min(windowStart + windowLength, duration || windowStart + windowLength).toFixed(0)}s (of {duration.toFixed(0)}s)
          </span>
        </div>

        <ECGChart
          signal={signal}
          beats={analysis?.beats || []}
          selectedBeatIndex={selectedBeat?.beat_index}
          loading={loading}
          error={error}
          onRetry={reload}
          onSelectBeat={setSelectedBeat}
        />
      </section>

      {/* Single-Beat Detail & Probability Inspector */}
      {analysis && (
        <PredictionCard beat={selectedBeat} recordId={recordId} />
      )}

      {/* Paginated Beat-by-Beat Classification Table */}
      {analysis && (
        <BeatTableCard
          beats={analysis.beats}
          selectedBeatIndex={selectedBeat?.beat_index}
          onSelectBeat={setSelectedBeat}
        />
      )}

      {/* Reference Clinician Annotations Card */}
      <AnnotationsCard annotations={annotations} />
    </>
  );
}
