import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  checkHealth,
  getBenchmark,
  getErrorMessage,
  getModelInfo,
  listRecords,
} from '../services/api.js';
import Card from '../components/Card.jsx';
import StatCard from '../components/StatCard.jsx';
import ECGLegend from '../components/ECGLegend.jsx';
import LoadingState from '../components/LoadingState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import PageContainer from '../components/PageContainer.jsx';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [records, setRecords] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [benchmark, setBenchmark] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      checkHealth().catch(() => ({ status: 'unavailable', model_loaded: false })),
      listRecords().catch(() => ({ count: 0, records: [] })),
      getModelInfo().catch(() => null),
      getBenchmark().catch(() => null),
    ])
      .then(([h, r, m, b]) => {
        if (!active) return;
        setHealth(h);
        setRecords(r);
        setModelInfo(m);
        setBenchmark(b);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <LoadingState label="Connecting to ECG Analysis Engine and retrieving experimental benchmarks…" />
    );
  }

  if (error) {
    return (
      <PageContainer
        title="ECG Signal Processing & Arrhythmia Detection"
        subtitle="Error connecting to system services."
      >
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  const isBackendHealthy = health?.status === 'healthy';
  const isModelReady = health?.model_loaded || modelInfo?.model_loaded;
  const metrics = benchmark?.metrics;

  return (
    <PageContainer
      title="ECG Signal Processing & Arrhythmia Detection"
      subtitle="Interactive ECG signal processing, beat-level analysis, and machine-learning evaluation using the MIT-BIH Arrhythmia Database."
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span className={`badge ${isBackendHealthy ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.78rem' }}>
            {isBackendHealthy ? '● SYSTEM OPERATIONAL' : '○ SYSTEM UNAVAILABLE'}
          </span>
          <span className="badge badge-purple" style={{ fontSize: '0.78rem' }}>
            FROZEN MODEL
          </span>
          <Link to="/records" className="btn btn-secondary btn-sm">
            Explore Records →
          </Link>
          <Link to="/waveform/100" className="btn btn-primary btn-sm">
            Demo: Waveform 100 →
          </Link>
        </div>
      }
    >
      {/* 1. System Status & Architecture Overview Card */}
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              System Provenance & Pipeline Architecture
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.15rem' }}>
              RandomForestClassifier • 209-Dimensional Feature Representation
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '820px', lineHeight: 1.5 }}>
              Offline beat-level arrhythmia classification suite for electrocardiogram telemetry. Beat locations are anchored to expert clinical fiducial points from MIT-BIH <code>.atr</code> annotations (the system does not implement an automated R-peak detector). The classifier extracts 200 morphology samples from a single preferred lead (Lead MLII) alongside 9 retrospective bidirectional RR intervals, and executes inference across 4 ANSI/AAMI EC57 categories.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Backend Status</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isBackendHealthy ? '#10b981' : '#ef4444' }}>
                {isBackendHealthy ? 'Healthy' : 'Unavailable'}
              </div>
            </div>

            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Model State</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isModelReady ? 'var(--accent-cyan)' : '#f59e0b' }}>
                {isModelReady ? 'Loaded' : 'Unavailable'}
              </div>
            </div>

            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">Input Dimensions</div>
              <div className="font-mono" style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                209 Dimensions
              </div>
            </div>

            <div className="stat-box" style={{ padding: '0.5rem 0.85rem' }}>
              <div className="stat-title">AAMI Output</div>
              <div className="font-mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                N / S / V / F
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Presentation Flow & "Start Here" Walkthrough Guide */}
      <Card
        title="Presentation Guide: Recommended Walkthrough (Start Here)"
        subtitle="A clear 5-step sequence for demonstrating the platform to instructors, evaluators, and reviewers."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
          <div style={{ padding: '0.9rem', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', borderTop: '3px solid var(--accent-cyan)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>Step 1 • Choose Record</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0.25rem 0 0.2rem' }}>Record Explorer</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', lineHeight: 1.4 }}>
              Select an MIT-BIH recording (e.g. Record 100 for normal rhythm with APCs, or Record 200 with heavy ventricular ectopy).
            </div>
            <Link to="/records" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Browse Records →</Link>
          </div>

          <div style={{ padding: '0.9rem', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', borderTop: '3px solid #10b981' }}>
            <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Step 2 • Inspect Signal</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0.25rem 0 0.2rem' }}>Waveform Studio</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', lineHeight: 1.4 }}>
              View raw multi-lead ECG signals and inspect expert cardiologist <code>.atr</code> fiducial annotations.
            </div>
            <Link to="/waveform/100" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>View Waveform →</Link>
          </div>

          <div style={{ padding: '0.9rem', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', borderTop: '3px solid #f59e0b' }}>
            <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>Step 3 • Run Inference</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0.25rem 0 0.2rem' }}>Live Record Analysis</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', lineHeight: 1.4 }}>
              Execute the frozen Random Forest to extract 209-D features and classify heartbeats into N, S, V, F.
            </div>
            <Link to="/analysis/100" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Run Live Analysis →</Link>
          </div>

          <div style={{ padding: '0.9rem', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', borderTop: '3px solid #a855f7' }}>
            <div style={{ fontSize: '0.72rem', color: '#a855f7', fontWeight: 700, textTransform: 'uppercase' }}>Step 4 • Single-Beat Audit</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0.25rem 0 0.2rem' }}>Confidence Studio</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', lineHeight: 1.4 }}>
              Audit a single beat's morphology window, 9 bidirectional RR intervals, and [P(N), P(S), P(V), P(F)] probabilities.
            </div>
            <Link to="/prediction/100/1" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Inspect Beat #1 →</Link>
          </div>

          <div style={{ padding: '0.9rem', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', borderTop: '3px solid #ec4899' }}>
            <div style={{ fontSize: '0.72rem', color: '#ec4899', fontWeight: 700, textTransform: 'uppercase' }}>Step 5 • Evaluation Benchmark</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0.25rem 0 0.2rem' }}>Benchmark & Errors</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', lineHeight: 1.4 }}>
              Review the precomputed DS2 benchmark across 22 held-out patients (49,639 beats), confusion matrix, and limitations.
            </div>
            <Link to="/benchmark" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Open Benchmark →</Link>
          </div>
        </div>
      </Card>

      {/* 3. Key Experimental Benchmark Metrics & Academic Explanation */}
      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        <StatCard
          label="DS2 Evaluated Beats"
          value={metrics ? metrics.evaluated_beats.toLocaleString() : '49,639'}
          badge={<span className="badge badge-purple">Held-Out Test</span>}
          subtext="22 Inter-Patient Records"
          accentColor="#38bdf8"
        />

        <StatCard
          label="Overall Accuracy"
          value={metrics ? `${(metrics.accuracy * 100).toFixed(2)}%` : '90.93%'}
          badge={<span className="badge badge-success">45,137 Correct</span>}
          subtext="Majority-class dominated"
          accentColor="#10b981"
        />

        <StatCard
          label="Balanced Accuracy"
          value={metrics ? `${(metrics.balanced_accuracy * 100).toFixed(2)}%` : '70.00%'}
          badge={<span className="badge badge-cyan">Unweighted Mean</span>}
          subtext="Equal weight to N, S, V, F"
          accentColor="var(--accent-cyan)"
        />

        <StatCard
          label="Macro F1 Score"
          value={metrics ? metrics.macro_f1.toFixed(4) : '0.6403'}
          badge={<span className="badge badge-warning">Harmonic Mean</span>}
          subtext={`Weighted F1: ${metrics ? metrics.weighted_f1.toFixed(4) : '0.9174'}`}
          accentColor="#f59e0b"
        />

        <StatCard
          label="Macro ROC-AUC"
          value={metrics ? metrics.roc_auc.toFixed(4) : '0.9425'}
          badge={<span className="badge badge-default">Discrimination</span>}
          subtext={`PR-AUC: ${metrics ? metrics.pr_auc.toFixed(4) : '0.6280'}`}
          accentColor="#a855f7"
        />
      </div>

      {/* Explanatory Callout: Interpreting Metrics for Teacher / Evaluation */}
      <Card style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', fontSize: '0.92rem' }}>
              📊 Distinguishing Live Record Analysis from the DS2 Benchmark
            </div>
            <p style={{ margin: 0 }}>
              <strong>Live Analysis</strong> executes dynamically in real time on any chosen individual patient recording. In contrast, the <strong>DS2 Benchmark</strong> is the precomputed, locked scientific evaluation conducted once across all 22 unseen test patients (49,639 usable beats). Demonstrating a single record analysis illustrates the operational pipeline; presenting the DS2 benchmark proves generalized model performance.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', fontSize: '0.92rem' }}>
              ⚖️ Why Balanced Accuracy (70.00%) Matters Over Raw Accuracy (90.93%)
            </div>
            <p style={{ margin: 0 }}>
              Because Normal sinus beats (Class N) constitute <strong>89.04%</strong> of the test cohort, a naive baseline guessing "Normal" for every heartbeat would achieve ~89% overall accuracy while detecting zero arrhythmias. Therefore, <strong>Balanced Accuracy (70.00%)</strong> and <strong>Macro F1 (0.6403)</strong> are the true scientific metrics evaluating minority-class arrhythmia detection.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', fontSize: '0.92rem' }}>
              ⚠️ Documented Minority Class Limitations (Saved DS2 Results)
            </div>
            <p style={{ margin: 0 }}>
              • <strong>Class S Precision (38.45%):</strong> While recall is 75.64% (catching ~3 of 4 S-beats), premature atrial contractions frequently share morphologic similarity with normal QRS complexes, leading to false positives.<br />
              • <strong>Class F Recall (24.74%):</strong> 96 of 388 fusion beats detected. In the DS2 cohort, <strong>93.3% of all fusion beats (362 of 388)</strong> originate from a single patient (Record 213), causing severe sampling concentration.
            </p>
          </div>
        </div>
      </Card>

      {/* 4. Interactive Application Modules Navigation */}
      <Card
        title="Application Navigation & Exploration Studios"
        subtitle="Direct access to all individual signal exploration, beat telemetry, prediction probabilities, and academic evaluation modules."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Step 1: Records */}
          <Link
            to="/records"
            className="btn btn-secondary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '1rem',
              textAlign: 'left',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>Step 1</span>
              <span style={{ fontSize: '1rem' }}>📁</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Explore ECG Records
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Browse the MIT-BIH records available to the application across DS1 and DS2 cohorts.
            </div>
          </Link>

          {/* Step 2: Waveform */}
          <Link
            to="/waveform/100"
            className="btn btn-secondary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '1rem',
              textAlign: 'left',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>Step 2</span>
              <span style={{ fontSize: '1rem' }}>📈</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Inspect Waveform
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Inspect continuous ECG signals, annotation markers, and temporal sliding windows.
            </div>
          </Link>

          {/* Step 3: Beat Inspector */}
          <Link
            to="/beat/100/1"
            className="btn btn-secondary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '1rem',
              textAlign: 'left',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>Step 3</span>
              <span style={{ fontSize: '1rem' }}>🔍</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Analyze Individual Beats
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Inspect the 200-sample morphology window and 9 canonical bidirectional RR features.
            </div>
          </Link>

          {/* Step 4: Prediction Confidence */}
          <Link
            to="/prediction/100/1"
            className="btn btn-secondary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '1rem',
              textAlign: 'left',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>Step 4</span>
              <span style={{ fontSize: '1rem' }}>🎯</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              View Prediction Confidence
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              View N/S/V/F probabilities from the frozen Random Forest model.
            </div>
          </Link>

          {/* Step 5: Benchmark */}
          <Link
            to="/benchmark"
            className="btn btn-secondary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '1rem',
              textAlign: 'left',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>Step 5</span>
              <span style={{ fontSize: '1rem' }}>📊</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Evaluate Model
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Review held-out DS2 performance, confusion matrix, and generalization gap.
            </div>
          </Link>

          {/* Step 6: Explainability */}
          <Link
            to="/interpretability"
            className="btn btn-secondary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '1rem',
              textAlign: 'left',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>Step 6</span>
              <span style={{ fontSize: '1rem' }}>💡</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Understand Feature Importance
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Inspect model-level feature importance across morphology and timing domains.
            </div>
          </Link>

          {/* Step 7: Error Analysis */}
          <Link
            to="/error-analysis"
            className="btn btn-secondary"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '1rem',
              textAlign: 'left',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>Step 7</span>
              <span style={{ fontSize: '1rem' }}>⚠️</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Investigate Errors
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Explore confusion patterns, misclassification pairs, and record-level errors.
            </div>
          </Link>
        </div>
      </Card>

      {/* 4. Model Pipeline Visual Schematic */}
      <Card
        title="Scientific Machine-Learning Pipeline"
        subtitle="End-to-end signal processing, feature extraction, and ensemble classification architecture."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.85rem',
          }}
        >
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', borderTop: '3px solid #38bdf8' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>1. Raw Signal</div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', margin: '0.25rem 0' }}>MIT-BIH ECG</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              360 Hz digitized continuous voltage signals from modified limb lead II (MLII).
            </div>
          </div>

          <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', borderTop: '3px solid #10b981' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>2. Preprocessing</div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', margin: '0.25rem 0' }}>Baseline & Scaling</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Moving-Average Baseline Removal (W = 217, Reflection Padding) + Local Per-Beat Z-Score Normalization.
            </div>
          </div>

          <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', borderTop: '3px solid #f59e0b' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>3. Feature Extraction</div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', margin: '0.25rem 0' }}>209-D Vector</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              200 Morphology Samples (offsets -90 to +109) + 9 Bidirectional RR Timing Features.
            </div>
          </div>

          <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', borderTop: '3px solid #a855f7' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>4. Ensemble Learner</div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', margin: '0.25rem 0' }}>Random Forest</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              200 decision trees trained with balanced sample weighting and Gini splitting.
            </div>
          </div>

          <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', borderTop: '3px solid #ec4899' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>5. Output Distribution</div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', margin: '0.25rem 0' }}>AAMI Classes</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Posterior probability distribution across N, S, V, and F arrhythmia categories.
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Dataset Information & Model Provenance Cards */}
      <div className="grid" style={{ marginBottom: '1.25rem' }}>
        <Card
          title="Dataset Information & AAMI Partitioning"
          subtitle="MIT-BIH Arrhythmia Database configuration and standard inter-patient isolation."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div>
              <strong>Database:</strong> MIT-BIH Arrhythmia Database (48 half-hour ambulatory recordings discovered).
            </div>
            <div>
              <strong>Primary Diagnostic Task:</strong> 4-class ANSI/AAMI EC57 classification (Normal, Supraventricular, Ventricular, Fusion).
            </div>
            <div>
              <strong>Cohort Partitioning:</strong>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem', lineHeight: 1.6 }}>
                <li><strong>DS1 Training & Validation:</strong> 22 patient records (50,947 beats) for hyperparameter tuning.</li>
                <li><strong>DS2 Held-Out Test:</strong> 22 independent patient records (49,639 beats) locked for final evaluation.</li>
                <li><strong>Paced Records:</strong> Records 102, 104, 107, and 217 contain surgically paced rhythms and are excluded from the primary four-class evaluation.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card
          title="Model Configuration & Provenance"
          subtitle="Details of the frozen Phase 8 Random Forest classifier."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
              <span>Model Architecture:</span>
              <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>RandomForestClassifier</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
              <span>Estimators (Trees):</span>
              <span className="font-mono" style={{ fontWeight: 700 }}>200 trees</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
              <span>Input Dimensions:</span>
              <span className="font-mono" style={{ fontWeight: 700 }}>209 (200 Morph + 9 RR)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
              <span>Class Weighting:</span>
              <span className="font-mono" style={{ fontWeight: 700 }}>balanced</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
              <span>Evaluation Status:</span>
              <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>LOCKED FOR EVALUATION</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 6. Diagnostic Class Taxonomy */}
      <Card
        title="ANSI/AAMI EC57 Arrhythmia Taxonomy"
        subtitle="Standard clinical reference groupings for arrhythmia algorithm benchmarking."
      >
        <ECGLegend />
      </Card>
    </PageContainer>
  );
}
