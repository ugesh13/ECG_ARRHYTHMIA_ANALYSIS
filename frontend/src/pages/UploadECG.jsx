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
      const hasAtr = files.some((f) => f.name.toLowerCase().endsWith('.atr'));
      if (hasAtr) {
        navigate(`/analysis/${res.record_id}`);
      } else {
        navigate(`/waveform/${res.record_id}`);
      }
    } catch (e) {
      setStatus('error');
      setError(getErrorMessage(e));
    }
  };

  return (
    <PageContainer
      title="Upload Custom ECG Recording"
      subtitle="Upload paired WFDB archive files (.hea header + .dat binary signal for waveform inspection; .atr annotations required for 209-D beat classification)."
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

        <Card title="PhysioNet WFDB File Requirements">
          <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>File Roles & Capabilities:</strong>
            </p>
            <ul style={{ paddingLeft: '1.2rem', marginBottom: '0.75rem' }}>
              <li style={{ marginBottom: '0.4rem' }}>
                <strong>.hea (Header):</strong> Required. Text metadata specifying lead names, sampling frequency (e.g. 360 Hz), ADC gain, and channel configuration.
              </li>
              <li style={{ marginBottom: '0.4rem' }}>
                <strong>.dat (Binary Signal):</strong> Required. Continuous digitized multiplexed ECG voltage samples.
              </li>
              <li style={{ marginBottom: '0.4rem' }}>
                <strong>.atr (Annotation File):</strong> <strong style={{ color: 'var(--accent-cyan)' }}>Required for Beat Classification</strong>. 
                Contains expert fiducial heartbeat positions. Because this project evaluates beats at expert reference locations (and does not implement an independent automated QRS detector), beat-level classification is disabled if .atr is omitted.
              </li>
            </ul>
            <div style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface-2)',
              border: '1px solid var(--border-default)',
              marginBottom: '0.75rem',
              fontSize: '0.82rem',
            }}>
              <strong>Upload Mode Rules:</strong>
              <div style={{ marginTop: '0.2rem' }}>• <code>.hea + .dat</code> → Continuous waveform viewer enabled.</div>
              <div>• <code>.hea + .dat + .atr</code> → Waveform viewer + automated 209-D beat classification enabled.</div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              All uploaded files must share the exact same base record name (e.g., <code>patient_01.hea</code>, <code>patient_01.dat</code>, and <code>patient_01.atr</code>).
            </p>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
