import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage, getHistory } from '../services/api.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import DataTable from '../components/DataTable.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

export default function History() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getHistory()
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

  if (loading) return <LoadingState label="Retrieving session upload logs and analysis history…" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const columns = [
    {
      key: 'record_id',
      header: 'Record ID',
      render: (val) => (
        <Link
          to={`/analysis/${val}`}
          style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}
        >
          Record {val}
        </Link>
      ),
    },
    {
      key: 'source',
      header: 'Source Archive',
      render: (val) => (
        <span style={{ textTransform: 'uppercase', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {val === 'mitbih' ? 'MIT-BIH' : 'Upload'}
        </span>
      ),
    },
    {
      key: 'files',
      header: 'WFDB Files',
      render: (files) => (
        <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {files && files.length > 0 ? files.join(', ') : 'standard .hea / .dat'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Analyzed At',
      render: (val) => (
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          {new Date(val).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'analysis_status',
      header: 'Execution Status',
      render: (val) => (
        <span className={`badge ${val === 'completed' ? 'badge-success' : 'badge-default'}`}>
          {val === 'completed' ? '✓ Completed' : val}
        </span>
      ),
    },
  ];

  return (
    <PageContainer
      title="Upload & Analysis History"
      subtitle="Complete chronological audit trail of processed recordings and uploaded WFDB clinical data."
      breadcrumbs={
        <>
          <Link to="/">Dashboard</Link>
          <span>/</span>
          <span>History & Uploads</span>
        </>
      }
      actions={
        <Link to="/upload" className="btn btn-primary btn-sm">
          + Upload New Record
        </Link>
      }
    >
      <Card>
        <DataTable
          columns={columns}
          data={data?.entries || []}
          keyField="record_id"
          emptyMessage="No analysis history yet. Analyze an ECG record from the Record Explorer or Upload page to begin tracking session activity."
        />
      </Card>
    </PageContainer>
  );
}
