import { useState } from 'react';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Navbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />
      <div className="shell-body">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="shell-main" id="main-content">
          <div
            style={{
              padding: '0.6rem 1rem',
              marginBottom: '1rem',
              borderRadius: 'var(--radius-sm, 6px)',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: '#facc15',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
            <span>
              <strong>Academic &amp; Educational Viva Demonstration Only:</strong> This system classifies heartbeats located from expert reference annotations (<code>.atr</code>); it does not automatically detect heartbeat peaks from raw ECG signals and is not a certified medical diagnostic device.
            </span>
          </div>
          {children}
          <footer
            style={{
              marginTop: '2.5rem',
              padding: '1rem 0',
              borderTop: '1px solid var(--border-subtle)',
              textAlign: 'center',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}
          >
            Academic &amp; Educational Demonstration Only • ANSI/AAMI EC57:1998 Standard Mapping • Model outputs are research artifacts and do not constitute independent medical diagnoses.
          </footer>
        </main>
      </div>
    </div>
  );
}
