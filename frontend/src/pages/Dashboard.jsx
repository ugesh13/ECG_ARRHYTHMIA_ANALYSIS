import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { checkHealth, getErrorMessage, getHistory, listRecords } from '../services/api.js';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function Dashboard() {
  const [records, setRecords] = useState(null);
  const [history, setHistory] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([listRecords(), getHistory(), checkHealth().catch(() => ({ model_loaded: false }))])
      .then(([r, h, hl]) => {
        setRecords(r);
        setHistory(h);
        setHealth(hl);
      })
      .catch((e) => setError(getErrorMessage(e)));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!records || !history) return <LoadingState />;

  const recent = history.entries.slice(0, 5);
  const modelLoaded = health?.model_loaded ?? false;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <h1 style={{ margin: 0 }}>ECG Arrhythmia Analysis Platform</h1>
        <Link className="btn" to="/upload">Upload ECG</Link>
      </div>

      <p className="muted" style={{ marginBottom: '1.25rem' }}>
        Academic research prototype for automated ECG signal processing and arrhythmia classification on the MIT-BIH Database.
        Evaluates inter-patient generalization using the ANSI/AAMI EC57 diagnostic taxonomy.
      </p>

      <div className="grid">
        <section className="card">
          <h2>Available ECG Records</h2>
          <p className="big">{records.count}</p>
          <p className="muted">
            {records.count === 0 ? 'No records found. Place MIT-BIH files in backend/data/mitbih/.' : 'Records available (MIT-BIH + uploads)'}
          </p>
          {records.count > 0 && <Link to="/analysis">Browse Record Explorer →</Link>}
        </section>

        <section className="card">
          <h2>ML Model Status</h2>
          <p style={{ margin: '0.4rem 0' }}>
            <span className={`badge ${modelLoaded ? 'badge-N' : 'badge-muted'}`}>
              {modelLoaded ? '✓ Model Operational' : 'Model Auto-Loads on Request'}
            </span>
          </p>
          <p className="muted" style={{ fontSize: '0.85rem', margin: '0.2rem 0 0.5rem' }}>
            Frozen Phase 8 Random Forest (200 trees, 209 features: 200 morphology + 9 bidirectional RR).
          </p>
          <Link to="/analysis/100" style={{ fontWeight: 600 }}>Analyze Benchmark Record 100 →</Link>
        </section>
      </div>

      <section className="card">
        <h2>Recent Activity & Analysis History</h2>
        {recent.length === 0 ? (
          <p className="muted">No recent analysis activity.</p>
        ) : (
          <ul className="list">
            {recent.map((e) => (
              <li key={`${e.record_id}-${e.created_at}`} style={{ marginBottom: '0.35rem' }}>
                <Link to={`/analysis/${e.record_id}`} style={{ fontWeight: 600 }}>Record {e.record_id}</Link>
                <span className="muted"> — {e.source}, {new Date(e.created_at).toLocaleString()}</span>
                <span className={`badge ${e.analysis_status === 'completed' ? 'badge-N' : 'badge-muted'}`} style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                  {e.analysis_status === 'completed' ? 'Analyzed' : e.analysis_status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="disclaimer-box">
        <strong>Research Notice:</strong> Prototype for educational and academic machine learning research only. Not a medical diagnostic tool.
      </div>
    </>
  );
}
