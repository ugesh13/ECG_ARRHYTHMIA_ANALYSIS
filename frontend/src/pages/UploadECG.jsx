import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UploadCard from '../components/UploadCard.jsx';
import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import { getErrorMessage, uploadRecord } from '../services/api.js';

export default function UploadECG() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleUpload = async (files) => {
    setStatus('uploading');
    setProgress(0);
    setError(null);
    try {
      const res = await uploadRecord(files, setProgress);
      setStatus('success');
      navigate(`/analysis/${res.record_id}`);
    } catch (e) {
      setStatus('error');
      setError(getErrorMessage(e));
    }
  };

  return (
    <PageContainer
      title="Upload Custom ECG Recording"
      subtitle="Upload paired WFDB archive files (.hea header + .dat binary signal, optional .atr annotations) to run automated 209-D beat classification."
      breadcrumbs={
        <>
          <Link to="/">Dashboard</Link>
          <span>/</span>
          <span>Upload Record</span>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <UploadCard onUpload={handleUpload} progress={progress} status={status} error={error} />

        <Card title="Supported WFDB Format & Requirements">
          <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Required Files:</strong> The backend requires standard PhysioNet WFDB format:
            </p>
            <ul style={{ paddingLeft: '1.2rem', marginBottom: '0.75rem' }}>
              <li><strong>.hea (Header):</strong> Text metadata defining lead names, sampling frequency, and ADC gain.</li>
              <li><strong>.dat (Binary Signal):</strong> 16-bit or 212-format multiplexed voltage samples.</li>
              <li><strong>.atr (Optional Annotations):</strong> Reference beat markings from clinical expert review.</li>
            </ul>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Constraint:</strong> All files must share the exact same base record ID (e.g., <code>custom_01.hea</code> and <code>custom_01.dat</code>).
            </p>
            <p>
              Once uploaded, the record is validated by the WFDB engine and indexed for live waveform exploration and 209-D beat classification.
            </p>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
