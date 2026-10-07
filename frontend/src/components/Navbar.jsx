import { useEffect, useState } from 'react';
import { checkHealth } from '../services/api.js';
import StatusIndicator from './StatusIndicator.jsx';

export default function Navbar({ onToggleSidebar, sidebarOpen }) {
  const [health, setHealth] = useState(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let active = true;
    checkHealth()
      .then((res) => {
        if (active) {
          setHealth(res);
          setOnline(true);
        }
      })
      .catch(() => {
        if (active) setOnline(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <header className="shell-header">
      <div className="header-left">
        <button
          className="btn btn-outline btn-sm mobile-toggle"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Collapse menu' : 'Expand menu'}
          style={{ padding: '0.35rem 0.6rem', display: 'none' }}
        >
          ☰
        </button>

        <div className="brand-badge">
          <div className="brand-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span>ECG PulseAI</span>
          <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
            Phase 18
          </span>
        </div>
      </div>

      <div className="header-right">
        {health?.model_loaded && (
          <span
            className="badge badge-success"
            title="Frozen Phase 8 Random Forest (209 features)"
            style={{ fontSize: '0.75rem' }}
          >
            ✓ ML Model Ready (209-D)
          </span>
        )}
        <StatusIndicator status={online} label={online ? 'API Online' : 'API Offline'} />
      </div>
    </header>
  );
}
