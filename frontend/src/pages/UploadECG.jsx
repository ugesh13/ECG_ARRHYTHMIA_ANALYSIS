import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadCard from '../components/UploadCard.jsx';
import PageContainer from '../components/PageContainer.jsx';
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
    >
      <UploadCard onUpload={handleUpload} progress={progress} status={status} error={error} />
    </PageContainer>
  );
}
