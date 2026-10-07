import PageContainer from '../components/PageContainer.jsx';
import Card from '../components/Card.jsx';
import ECGLegend from '../components/ECGLegend.jsx';

export default function About() {
  return (
    <PageContainer
      title="About the ECG Arrhythmia Analysis Platform"
      subtitle="Engineering architecture, signal processing pipeline, machine learning methodology, and academic governance."
      breadcrumbs={
        <>
          <a href="/">Dashboard</a>
          <span>/</span>
          <span>About Project</span>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* 1. Project Title & Objective */}
        <Card title="Project Title & Objective">
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: '0.88rem' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Project:</strong> ECG Signal Processing and Arrhythmia Detection Using Machine Learning
            </p>
            <p>
              <strong>Objective:</strong> To develop an integrated, reproducible, and interactive academic software platform for multi-lead electrocardiogram (ECG) telemetry, R-peak segmentation, baseline noise suppression, morphology extraction, temporal interval modeling, and automated beat-level classification into standard diagnostic categories.
            </p>
          </div>
        </Card>

        {/* 2. Dataset & Cohort Partitioning */}
        <Card title="Dataset & Partitioning Governance">
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: '0.88rem' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>MIT-BIH Arrhythmia Database:</strong> 48 continuous ambulatory two-channel ECG recordings digitized at 360 Hz with independent clinical cardiologist annotations.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Strict Inter-Patient Division:</strong> To prevent data leakage, recordings are partitioned into strictly separate patient groups:
            </p>
            <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
              <li><strong>DS1 Training & Validation (22 records, 50,947 beats):</strong> Used for model parameter estimation and hyperparameter selection.</li>
              <li><strong>DS2 Held-Out Test (22 records, 49,639 beats):</strong> Unseen patients evaluated solely with frozen model weights.</li>
              <li><strong>Paced Records Excluded (4 records: 102, 104, 107, 217):</strong> Excluded from the primary four-class evaluation.</li>
            </ul>
          </div>
        </Card>

        {/* 3. Machine-Learning Approach */}
        <Card title="Machine-Learning Approach">
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: '0.88rem' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Random Forest Classifier:</strong> Ensemble of 200 de-correlated decision trees configured with balanced class weighting to handle substantial physiological class imbalance.
            </p>
            <p style={{ marginBottom: '0.75rem' }}>
              <strong>Hyperparameters:</strong> 200 estimators, maximum tree depth of 30, minimum split size of 5 samples, square-root feature subsampling (`max_features = 'sqrt'`), Gini impurity splitting criterion.
            </p>
            <p>
              <strong>Evaluation State:</strong> Frozen Phase 8 model persisted with Joblib and evaluated across all 49,639 held-out DS2 beats.
            </p>
          </div>
        </Card>

        {/* 4. Feature Representation */}
        <Card title="209-Dimensional Feature Representation">
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: '0.88rem' }}>
            <p style={{ marginBottom: '0.75rem' }}>
              Each heartbeat is mapped into a canonical 209-dimensional feature vector combining continuous waveform morphology with timing dynamics:
            </p>
            <ul style={{ paddingLeft: '1.2rem', marginBottom: '0.75rem' }}>
              <li>
                <strong>200 Morphology Samples:</strong> Extracted in a window of -90 pre-R to +109 post-R samples centered at sample index 90.
              </li>
              <li>
                <strong>Baseline Drift Suppression:</strong> Moving-Average Baseline Removal (window $W = 217$, reflection padding) removes low-frequency baseline wander.
              </li>
              <li>
                <strong>Local Amplitude Scaling:</strong> Per-beat z-score normalization ensures invariant morphology across differing electrode gains.
              </li>
              <li>
                <strong>9 Bidirectional RR Features:</strong> Captures local prematurity coupling ratios (`RR_prev / RR_local_median`), compensatory pauses (`RR_next`), coupling asymmetry, and instantaneous heart rate.
              </li>
            </ul>
          </div>
        </Card>

        {/* 5. Four-Class Taxonomy */}
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
            <li><strong>Edge Beats:</strong> Boundary beats (first and last in record) lacking temporal context are flagged as unclassified without synthetic data creation.</li>
          </ul>
        </Card>

        {/* 6. Technology Stack */}
        <Card title="Technology Stack">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {[
              { name: 'Python', role: 'Backend Runtime' },
              { name: 'NumPy', role: 'Array Processing' },
              { name: 'Pandas', role: 'Data Structures' },
              { name: 'SciPy', role: 'Signal Filtering' },
              { name: 'WFDB', role: 'Waveform Reader' },
              { name: 'scikit-learn', role: 'Random Forest Model' },
              { name: 'FastAPI', role: 'High-Speed REST API' },
              { name: 'React', role: 'Interactive Frontend' },
              { name: 'Recharts', role: 'Telemetry Charts' },
            ].map((tech) => (
              <div
                key={tech.name}
                style={{
                  padding: '0.65rem 0.75rem',
                  backgroundColor: 'var(--bg-surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.88rem' }}>
                  {tech.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {tech.role}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Global Academic Disclaimer Banner */}
      <div className="disclaimer-banner" style={{ marginTop: '1.25rem' }}>
        <div>⚖</div>
        <div>
          <strong>Academic Engineering Statement:</strong> This application is an academic engineering project for ECG signal processing and machine-learning analysis. It is not an approved medical diagnostic device and should not be used for clinical decision-making.
        </div>
      </div>
    </PageContainer>
  );
}
