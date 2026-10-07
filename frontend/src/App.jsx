import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import UploadECG from './pages/UploadECG.jsx';
import ECGAnalysis from './pages/ECGAnalysis.jsx';
import History from './pages/History.jsx';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadECG />} />
            <Route path="/analysis" element={<ECGAnalysis />} />
            <Route path="/analysis/:recordId" element={<ECGAnalysis />} />
            <Route path="/history" element={<History />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
