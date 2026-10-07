# RESEARCH REPOSITORY GUIDE: ECG ARRHYTHMIA CLASSIFICATION BENCHMARK
## ANSI/AAMI EC57 4-Class Machine Learning Pipeline

**Standard Protocol Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Database:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`)  
**Architecture:** Tuned & Frozen Random Forest Classifier ($D = 209$)  
**Status:** COMPLETE RESEARCH REPOSITORY & PUBLICATION ARTIFACT PACKAGE  

---

## 1. Project Overview

This repository contains the complete, reproducible machine learning benchmark pipeline for automated heartbeat classification under the ANSI/AAMI EC57 standard. The project systematically investigates the discriminative synergy between localized electrocardiogram (ECG) waveform morphology and cardiac cycle timing features (RR intervals), with a strict emphasis on **zero-leakage inter-patient evaluation**.

---

## 2. Dataset & Cohort Isolation

- **Source:** PhysioNet MIT-BIH Arrhythmia Database (48 half-hour ambulatory two-channel recordings, 360 Hz).
- **Paced Record Isolation:** Records `102, 104, 107, 217` contain pacing stimuli and are isolated from the benchmark (8,757 beats).
- **Primary 44-Record Cohort:** 44 non-paced records containing 100,689 total beats.
- **Class Q Isolation:** 15 unclassifiable beats isolated from primary targets.
- **Benchmark Partitioning (de Chazal Inter-Patient Split):**
  - **Training (DS1 — 16 Records):** 38,029 usable bidirectional beats (`101, 106, 109, 112, 115, 116, 119, 122, 124, 203, 205, 207, 208, 215, 223, 230`).
  - **Validation (DS1 — 6 Records):** 12,918 usable bidirectional beats (`108, 114, 118, 201, 209, 220`).
  - **Held-Out Test (DS2 — 22 Records):** 49,639 usable bidirectional beats (`100, 103, 105, 111, 113, 117, 121, 123, 200, 202, 210, 212, 213, 214, 219, 221, 222, 228, 231, 232, 233, 234`).
  - *Boundary Exclusions:* Exactly 2 edge beats per record (Beat 0 and Beat $N-1$) lacking preceding/subsequent timing context were excluded (total 88 beats, all Class N).

---

## 3. Pipeline Architecture & Feature Schema ($D = 209$)

The input feature vector is structured deterministically:
1. **ECG Morphology ($D = 200$, Features `0–199`):** 200 raw voltage samples (555.56 ms centered at annotation marker; 90 samples pre-R, 110 samples post-R). Preprocessed via moving-average baseline wander removal ($W=217$ samples, reflection padding) and local per-beat z-score standardization ($z_i = (x_i - \mu)/\sigma$).
2. **Canonical Bidirectional RR Timing ($D = 9$, Features `200–208`):**
   - `RR_prev`: Time interval from preceding valid beat ($s$).
   - `HR_prev`: Preceding instantaneous heart rate ($60.0 / RR_{\text{prev}}$ bpm).
   - `RR_local_median`: Running median of strictly prior valid intervals (window up to 10 beats).
   - `RR_ratio_prev`: Prematurity coupling ratio ($RR_{\text{prev}} / RR_{\text{local\_median}}$).
   - `RR_dev_prev`: Fractional deviation from running median.
   - `RR_next`: Time interval to subsequent valid beat ($s$).
   - `HR_next`: Subsequent instantaneous heart rate ($60.0 / RR_{\text{next}}$ bpm).
   - `RR_ratio_bidi`: Coupling ratio ($RR_{\text{prev}} / RR_{\text{next}}$).
   - `RR_bidi_diff`: Interval asymmetry difference ($RR_{\text{next}} - RR_{\text{prev}}$).

---

## 4. Machine Learning Methodology

- **Cost-Sensitive Learning:** Balanced bootstrap sample weights computed strictly from training partition label distributions ($w_c = N_{\text{train}} / (K \cdot N_{c, \text{train}})$).
- **Leakage-Free Cross-Validation:** Hyperparameter optimization performed via 4-fold `GroupKFold` grouped by patient record ID.
- **Single Test Pass:** The 22 held-out DS2 test recordings were accessed only once after all modeling, feature selection, and tuning decisions were permanently frozen.

---

## 5. Experimental Progression Across Phases

- **Phase 5 (Morphology Baseline):** Evaluated raw waveform morphology ($D=200$). Revealed severe supraventricular ectopic sensitivity ceiling (Class S recall = 38.40%, Macro F1 = 0.5824).
- **Phase 6 (Cardiac Timing Engineering):** Added causal RR features ($D=205$, Macro F1 = 0.6650) and bidirectional RR features ($D=209$, Macro F1 = 0.6985), breaking the morphological deadlock (+0.1161 Macro F1 gain).
- **Phase 7 (Controlled Model Optimization):** Tuned Random Forest tree depth and leaf parameters, achieving validation Macro F1 = 0.7095.
- **Phase 8 (Held-Out DS2 Benchmark):** Evaluated the frozen pipeline on 22 unseen recordings (49,639 beats).
- **Phase 9 (Visualizations & Tables):** Generated publication figures and CSV tables.
- **Phase 10 (Submission Package):** Audited cross-phase consistency and authored complete publication manuscript package.

---

## 6. Final Model & Stored Results

- **Model:** `RandomForestClassifier(n_estimators=200, max_depth=30, min_samples_split=5, min_samples_leaf=2, max_features='sqrt', class_weight='balanced', random_state=42)`
- **Serialized Artifact:** `backend/models/phase8/random_forest_final_phase8.joblib`
- **DS2 Test Benchmark Results (49,639 Beats):**
  - Overall Accuracy: **90.93%**
  - Balanced Accuracy: **70.00%**
  - Macro Precision: **63.48%**
  - Macro Recall: **70.00%**
  - Macro F1 Score: **0.6403**
  - Weighted F1 Score: **91.74%**
  - Multi-Class ROC-AUC (OvR): **0.9425**
  - Multi-Class PR-AUC (OvR): **0.6280**
  - Per-Class Metrics:
    - `N`: Precision = 97.71%, Recall = 92.42%, F1 = 0.9499 (Support: 44,197)
    - `S`: Precision = 38.45%, Recall = 75.64%, F1 = 0.5098 (Support: 1,835)
    - `V`: Precision = 69.75%, Recall = 87.20%, F1 = 0.7750 (Support: 3,220)
    - `F`: Precision = 48.00%, Recall = 24.74%, F1 = 0.3265 (Support: 388)

---

## 7. Repository Structure

```
ECG-ARRHYTHMIA-ANALYSIS/
├── backend/
│   ├── app/
│   │   ├── ml/
│   │   │   ├── rr_features.py              # Canonical 9 bidirectional RR feature extractor
│   │   │   ├── hyperparameter_tuning.py    # GroupKFold tuning engine
│   │   │   ├── phase7_trainer.py           # Training and DS1 validation runner
│   │   │   └── phase8_evaluator.py         # Final model freeze and DS2 evaluator
│   │   └── services/
│   │       ├── ecg_service.py              # Signal loading and beat extraction
│   │       └── signal_processor.py         # Baseline wander filter (W=217) & normalization
│   ├── data/
│   │   ├── raw/mitbih/                     # Raw PhysioNet MIT-BIH recordings (.dat, .hea, .atr)
│   │   └── processed/
│   │       ├── mitbih_processed_beats.npz  # Processed beat archive (109,446 beats)
│   │       ├── split_manifest.json         # Record partition assignments
│   │       └── ml_results/
│   │           ├── FINAL_MODEL_CONFIG.json # Locked model & feature configuration
│   │           ├── DS2_TEST_RESULTS.json   # Machine-readable held-out test metrics
│   │           ├── DS2_RECORD_RESULTS.csv  # 22-record performance breakdown
│   │           ├── DS2_ERROR_ANALYSIS.md   # Electrophysiological error analysis
│   │           ├── figures/                # 9 publication-grade figures (300 DPI)
│   │           ├── tables/                 # 6 publication-ready CSV tables
│   │           └── [Phase Reports & Manuscript Files]
│   ├── generate_phase9_artifacts.py        # 300-DPI publication figure generation script
│   ├── requirements.txt                    # Python package dependencies
│   ├── run_phase7.py                       # Phase 7 CLI entry point
│   └── run_phase8.py                       # Phase 8 CLI entry point
```

---

## 8. Reproducibility Instructions

To replicate the figures and verify the benchmark:
1. Ensure Python 3.10+ is installed with dependencies:
   ```powershell
   pip install -r backend/requirements.txt
   ```
2. Render publication figures (300 DPI):
   ```powershell
   python backend/generate_phase9_artifacts.py
   ```
3. Run automated test suites:
   ```powershell
   pytest backend/tests/test_phase8_eval.py
   ```

---

## 9. Key Limitations

- Historical retrospective benchmark (1975–1979); not validated on contemporary multi-lead hospital telemetry.
- No prospective clinical validation.
- Class F (Fusion) is heavily concentrated in Record 213 (93.3% of DS2 fusion beats).
- Bidirectional RR features require subsequent interval timing ($RR_{\text{next}}$) and are formulated strictly for offline retrospective analysis.
- Beat segmentation relied on expert human reference annotations.

---

## 10. Non-Clinical Regulatory Disclaimer

> [!CAUTION]
> **NOT A MEDICAL DIAGNOSTIC DEVICE:**  
> This software and model are developed strictly for academic, educational, and computational research purposes. This system is **NOT** a medical diagnostic device, clinical decision support system, or telemetry alarm monitor. It must **NEVER** be used for clinical decision-making, patient monitoring, diagnosis, triage, or treatment selection.
