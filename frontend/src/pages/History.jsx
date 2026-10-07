import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage, getHistory } from '../services/api.js';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function History() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { getHistory().then(setData).catch((e) => setError(getErrorMessage(e))); }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;
  return (
    <>
      <h1>History</h1>
      <section className="card">
        {data.count === 0 ? <p className="muted">No records processed yet.</p> : (
          <table className="table">
            <thead><tr><th>Record</th><th>Source</th><th>Files</th><th>Created</th><th>Analysis</th></tr></thead>
            <tbody>
              {data.entries.map((e) => (
                <tr key={`${e.record_id}-${e.created_at}`}>
                  <td><Link to={`/analysis/${e.record_id}`}>{e.record_id}</Link></td>
                  <td>{e.source}</td><td>{e.files.join(', ') || '—'}</td>
                  <td>{new Date(e.created_at).toLocaleString()}</td><td>{e.analysis_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
