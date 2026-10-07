import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Records from './pages/Records.jsx';
import WaveformViewer from './pages/WaveformViewer.jsx';
import BeatInspector from './pages/BeatInspector.jsx';
import ECGAnalysis from './pages/ECGAnalysis.jsx';
import PredictionConfidence from './pages/PredictionConfidence.jsx';
import BenchmarkDashboard from './pages/BenchmarkDashboard.jsx';
import Interpretability from './pages/Interpretability.jsx';
import History from './pages/History.jsx';
import About from './pages/About.jsx';
import UploadECG from './pages/UploadECG.jsx';

export default function App() {
  return (
    <AppShell>
      <Routes>
        {/* 1. Dashboard Overview */}
        <Route path="/" element={<Dashboard />} />

        {/* 2. ECG Record Explorer */}
        <Route path="/records" element={<Records />} />

        {/* 3. Waveform Viewer */}
        <Route path="/waveform/:recordId" element={<WaveformViewer />} />

        {/* 4. Single Beat Inspector */}
        <Route path="/beat/:recordId/:beatIndex" element={<BeatInspector />} />

        {/* 5. Record Arrhythmia Analysis */}
        <Route path="/analysis" element={<ECGAnalysis />} />
        <Route path="/analysis/:recordId" element={<ECGAnalysis />} />

        {/* 6. Prediction & Confidence */}
        <Route path="/prediction/:recordId/:beatIndex" element={<PredictionConfidence />} />

        {/* 7. Experimental Benchmark Dashboard */}
        <Route path="/benchmark" element={<BenchmarkDashboard />} />

        {/* 8. Interpretability & Feature Attribution */}
        <Route path="/interpretability" element={<Interpretability />} />

        {/* 9. History & Uploads */}
        <Route path="/history" element={<History />} />
        <Route path="/upload" element={<UploadECG />} />

        {/* 10. Project Information & Standards */}
        <Route path="/about" element={<About />} />

        {/* Fallback Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
