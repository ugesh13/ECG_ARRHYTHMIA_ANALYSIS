import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import ECGLegend from '../components/ECGLegend.jsx';

export default function About() {
  return (
    <PageContainer
      title="About the ECG Arrhythmia Analysis Platform"
      subtitle="Engineering architecture, signal processing pipeline, machine learning methodology, and academic governance."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        <Card title="System Architecture & Technology Stack">
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.88rem' }}>
            <li>
              <strong>FastAPI High-Performance Backend:</strong> Asynchronous Python service exposing RESTful WFDB signal extraction, on-demand beat segmentation, and cached inference.
            </li>
            <li>
              <strong>React 18 + Vite Modern Frontend:</strong> Responsive dark-first medical dashboard with high-contrast data visualization, accessible color semantics, and zero bloated component libraries.
            </li>
            <li>
              <strong>WFDB Native Waveform Engine:</strong> Reads multi-lead PhysioNet MIT-BIH recordings (`.hea`, `.dat`, `.atr`) directly with decimation, channel selection, and lead metadata parsing.
            </li>
            <li>
              <strong>Thread-Safe Model Persistence:</strong> Joblib-serialized Random Forest classifier with thread-safe inference lock and sub-15ms prediction latency per recording.
            </li>
          </ul>
        </Card>

        <Card title="ANSI/AAMI EC57 Diagnostic Taxonomy">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem', lineHeight: 1.6 }}>
            The Association for the Advancement of Medical Instrumentation (AAMI) defines standard beat groupings to ensure rigorous, standardized algorithmic benchmarking:
          </p>
          <ECGLegend compact={false} />
          <ul style={{ paddingLeft: '1.2rem', marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.6 }}>
            <li><strong>Class N:</strong> Normal beats, Left/Right bundle branch blocks, Atrial/Nodal escape beats.</li>
            <li><strong>Class S:</strong> Atrial premature beats, Aberrant atrial beats, Nodal premature beats, Supraventricular tachycardia.</li>
            <li><strong>Class V:</strong> Premature ventricular contractions (PVC), Ventricular escape beats.</li>
            <li><strong>Class F:</strong> Fusion of ventricular and normal beats.</li>
            <li><strong>Edge Beats:</strong> Boundary beats (first and last in record) lacking temporal context are flagged as unclassified.</li>
          </ul>
        </Card>

        <Card title="209-Dimensional Feature Representation">
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.88rem' }}>
            <li>
              <strong>200 Morphology Samples:</strong> Extracted around each R-peak (-90 pre-R samples to +110 post-R samples at 360 Hz).
            </li>
            <li>
              <strong>Baseline Drift Suppression:</strong> Reflection-padded moving average filter (217 samples, ~0.60 seconds) eliminates low-frequency respiration wander.
            </li>
            <li>
              <strong>Amplitude Normalization:</strong> Per-beat z-score normalization ensures invariant morphology regardless of electrode impedance variations.
            </li>
            <li>
              <strong>9 Bidirectional RR Timing Features:</strong> Captures local prematurity coupling ratios, post-ectopic compensatory pauses, instantaneous heart rate, and bidirectional asymmetry.
            </li>
          </ul>
        </Card>

        <Card title="Scientific Inter-Patient Generalization (DS1 vs DS2)">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>
            Unlike naive beat-level random splits (which leak identical patient morphologies into training and testing), this system strictly adopts the standard inter-patient partition:
          </p>
          <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.88rem' }}>
            <li><strong>DS1 Training Cohort:</strong> 16 patient records (38,029 beats) used for hyperparameter tuning.</li>
            <li><strong>DS1 Validation Cohort:</strong> 6 patient records (12,918 beats) used for model selection.</li>
            <li><strong>DS2 Held-Out Test Cohort:</strong> 22 completely unseen patient records (49,639 beats) locked for final scientific evaluation.</li>
            <li><strong>Isolated Paced Cohort:</strong> 4 pacemaker records excluded to preserve morphological integrity.</li>
          </ul>
        </Card>
      </div>

      <div className="disclaimer-banner">
        <div>⚖</div>
        <div>
          <strong>Academic Experiential Learning Statement:</strong> This project is developed solely as an educational and scientific demonstration of digital signal processing and statistical pattern recognition. It does not constitute medical advice or a certified diagnostic medical device.
        </div>
      </div>
    </PageContainer>
  );
}
