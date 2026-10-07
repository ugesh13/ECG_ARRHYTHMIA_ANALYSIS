import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage, listRecords } from '../services/api.js';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import DataTable from '../components/DataTable.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';

// ANSI/AAMI EC57 standard partition lookup
const DS1_TRAIN = new Set(['101', '106', '109', '112', '115', '116', '119', '122', '124', '203', '205', '207', '208', '215', '223', '230']);
const DS1_VAL = new Set(['108', '114', '118', '201', '209', '220']);
const DS2_TEST = new Set(['100', '103', '105', '111', '113', '117', '121', '123', '200', '202', '210', '212', '213', '214', '219', '221', '222', '228', '231', '232', '233', '234']);
const PACED = new Set(['102', '104', '107', '217']);

function getPartition(recordId, source) {
  if (source === 'upload') return { name: 'Uploaded Record', badge: 'badge-default' };
  if (DS2_TEST.has(recordId)) return { name: 'DS2 Held-Out Test', badge: 'badge-purple' };
  if (DS1_VAL.has(recordId)) return { name: 'DS1 Validation', badge: 'badge-warning' };
  if (DS1_TRAIN.has(recordId)) return { name: 'DS1 Training', badge: 'badge-cyan' };
  if (PACED.has(recordId)) return { name: 'Paced (Isolated)', badge: 'badge-default' };
  return { name: 'MIT-BIH', badge: 'badge-default' };
}

export default function Records() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [partitionFilter, setPartitionFilter] = useState('ALL');

  useEffect(() => {
    let active = true;
    setLoading(true);
    listRecords()
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

  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];
    return data.records.filter((rec) => {
      const matchSearch = rec.record_id.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      if (partitionFilter === 'ALL') return true;
      if (partitionFilter === 'DS2') return DS2_TEST.has(rec.record_id);
      if (partitionFilter === 'DS1_TRAIN') return DS1_TRAIN.has(rec.record_id);
      if (partitionFilter === 'DS1_VAL') return DS1_VAL.has(rec.record_id);
      if (partitionFilter === 'PACED') return PACED.has(rec.record_id);
      if (partitionFilter === 'UPLOAD') return rec.source === 'upload';
      return true;
    });
  }, [data, search, partitionFilter]);

  if (loading) return <LoadingState label="Loading available MIT-BIH recordings and partition metadata…" />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const columns = [
    {
      key: 'record_id',
      header: 'Record ID',
      render: (val) => (
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          {val}
        </span>
      ),
    },
    {
      key: 'partition',
      header: 'AAMI Partition',
      render: (_, row) => {
        const p = getPartition(row.record_id, row.source);
        return <span className={`badge ${p.badge}`}>{p.name}</span>;
      },
    },
    {
      key: 'source',
      header: 'Source Archive',
      render: (val) => (
        <span style={{ textTransform: 'uppercase', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {val === 'mitbih' ? 'MIT-BIH Arrhythmia' : 'User Upload'}
        </span>
      ),
    },
    {
      key: 'has_annotations',
      header: 'Annotations (.atr)',
      render: (val) => (
        <span className={`badge ${val ? 'badge-success' : 'badge-default'}`}>
          {val ? '✓ Reference Labels' : 'Raw Only'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
          <Link
            to={`/waveform/${row.record_id}`}
            className="btn btn-secondary btn-sm"
            title="Inspect Signal Waveform"
          >
            Waveform
          </Link>
          <Link
            to={`/analysis/${row.record_id}`}
            className="btn btn-primary btn-sm"
            title="Execute Arrhythmia Classification"
          >
            Analyze
          </Link>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="ECG Record Explorer"
      subtitle={`Browse, search, and inspect recordings across standard ANSI/AAMI EC57 training, validation, and held-out test cohorts (${data?.count || 0} total records available).`}
      actions={
        <Link to="/upload" className="btn btn-secondary btn-sm">
          + Upload WFDB Record
        </Link>
      }
    >
      <Card>
        {/* Search & Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px', maxWidth: '420px' }}>
            <input
              type="text"
              placeholder="Search record ID (e.g. 100, 208)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                backgroundColor: 'var(--bg-surface-2)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'DS2', label: 'DS2 Test (22)' },
              { id: 'DS1_TRAIN', label: 'DS1 Train (16)' },
              { id: 'DS1_VAL', label: 'DS1 Val (6)' },
              { id: 'PACED', label: 'Paced (4)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPartitionFilter(tab.id)}
                className={`btn btn-sm ${partitionFilter === tab.id ? 'btn-primary' : 'btn-outline'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredRecords}
          keyField="record_id"
          emptyMessage={`No recordings found matching search "${search}".`}
        />
      </Card>
    </PageContainer>
  );
}
