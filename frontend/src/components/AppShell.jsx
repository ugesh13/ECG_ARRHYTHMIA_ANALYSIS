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
            Academic demonstration only. Model outputs are for research/educational analysis and are not medical diagnoses.
          </footer>
        </main>
      </div>
    </div>
  );
}
