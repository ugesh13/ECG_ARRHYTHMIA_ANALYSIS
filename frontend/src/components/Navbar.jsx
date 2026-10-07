import { useEffect, useState } from 'react';
import { checkHealth } from '../services/api.js';

export default function Navbar() {
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    checkHealth().then(() => setStatus('online')).catch(() => setStatus('offline'));
  }, []);
  return (
    <header className="navbar">
      <div className="navbar-title">ECG Arrhythmia Analysis</div>
      <div className={`status status-${status}`} title="Backend API status">
        <span className="dot" /> API {status}
      </div>
    </header>
  );
}
