# REPRODUCIBILITY MANIFEST
## ANSI/AAMI EC57 Arrhythmia Classification Benchmark Pipeline

**Standard Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Model Family:** `RandomForestClassifier` (scikit-learn)  
**Feature Dimension:** $D = 209$ (200 ECG Morphology Samples + 9 Canonical Bidirectional RR Timing Features)  
**Status:** PERMANENTLY FROZEN  
**Execution Timestamp:** October 4, 2026  

---

## 1. Dataset Provenance & Hardware Specifications

- **Database:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`)
- **Sampling Frequency ($f_s$):** 360.0 Hz
- **ADC Resolution:** 11-bit over a $\pm 10$ mV range (200 adu/mV)
- **Signal Channels:** Standard modified limb lead II (MLII) preferred, fallback to modified lead V5, V1, V2, or V4 if MLII unavailable.
- **Total Records:** 48 half-hour ambulatory two-channel recordings from 47 subjects.
- **Paced Cohort Exclusion:** Records `102`, `104`, `107`, and `217` contain pacemaker stimuli and are completely isolated from benchmark training and evaluation (8,757 total beats).
- **Primary 44-Record Cohort:** 44 non-paced records containing 100,689 total beats.
- **Class Q Isolation:** 15 unclassifiable beats across the 44 records are isolated from the primary 4-class target.
- **Usable 4-Class Raw Beats:** 100,674 beats ($N=90,086; S=2,779; V=7,008; F=803$).

---

## 2. Preprocessing & Windowing Specifications

- **Baseline Wander Removal:**
  - Method: Moving-average subtraction filter.
  - Window Size: $W = 217$ samples ($\approx 602.8$ ms at 360 Hz).
  - Boundary Handling: Symmetric reflection padding (`reflect` mode) of length $W // 2 = 108$ samples at both signal ends.
- **Heartbeat Segmentation:**
  - Reference fiducial marker: Expert R-peak annotation timestamp ($t_R$).
  - Pre-R interval: 90 samples ($250.0$ ms).
  - Post-R interval: 110 samples ($305.56$ ms).
  - Total Segment Length: 200 samples ($555.56$ ms).
- **Amplitude Normalization:**
  - Method: Per-beat local z-score normalization ($z_i = (x_i - \mu) / \sigma$).
  - Offset parameter: $\epsilon = 10^{-8}$ added to standard deviation to prevent zero-division.

---

## 3. Label Taxonomy & AAMI EC57 Mapping

Target classes strictly follow the 4-class AAMI EC57 standard:
- **`N` (Normal Sinus & Conduction Delays):** MIT-BIH symbols `N` (Normal beat), `L` (Left bundle branch block), `R` (Right bundle branch block), `e` (Atrial escape), `j` (Nodal escape).
- **`S` (Supraventricular Ectopic):** MIT-BIH symbols `A` (Atrial premature beat), `a` (Aberrated atrial premature beat), `J` (Nodal premature beat), `S` (Supraventricular premature beat).
- **`V` (Ventricular Ectopic):** MIT-BIH symbols `V` (Premature ventricular contraction), `E` (Ventricular escape).
- **`F` (Fusion):** MIT-BIH symbol `F` (Fusion of ventricular and normal beat).
- **`Q` (Unclassifiable / Paced / Isolated):** MIT-BIH symbols `/` (Paced beat), `f` (Fusion of paced and normal beat), `Q` (Unclassifiable beat). Preserved in metadata, excluded from 4-class training/evaluation.

---

## 4. Partition Split Manifest (Inter-Patient Division)

Strict inter-patient partitioning following de Chazal et al. (2004):
- **Training Partition (16 DS1 Records):**
  - Records: `101, 106, 109, 112, 115, 116, 119, 122, 124, 203, 205, 207, 208, 215, 223, 230`
  - Raw 4-class beats: 38,061
  - Edge boundary exclusions: 32 beats (1 first + 1 last beat per record)
  - Usable bidirectional beats: **38,029** ($N=33,882; S=227; V=3,513; F=407$)
- **Validation Partition (6 DS1 Records):**
  - Records: `108, 114, 118, 201, 209, 220`
  - Raw 4-class beats: 12,930
  - Edge boundary exclusions: 12 beats (all Class N)
  - Usable bidirectional beats: **12,918** ($N=11,919; S=716; V=275; F=8$)
- **Held-Out Test Partition (22 DS2 Records):**
  - Records: `100, 103, 105, 111, 113, 117, 121, 123, 200, 202, 210, 212, 213, 214, 219, 221, 222, 228, 231, 232, 233, 234`
  - Raw 4-class beats: 49,683
  - Edge boundary exclusions: 44 beats (all Class N)
  - Usable bidirectional beats: **49,639** ($N=44,197; S=1,835; V=3,220; F=388$)

---

## 5. Canonical Feature Schema ($D = 209$)

The feature vector order is strictly fixed:
- **Indices 0–199 (200 features):** Preprocessed ECG morphology voltage amplitudes `ECG_000` through `ECG_199`.
- **Indices 200–208 (9 canonical temporal features):**
  1. `RR_prev`: Time interval from preceding valid beat to current beat ($s$).
  2. `HR_prev`: Preceding instantaneous heart rate ($60.0 / RR_{\text{prev}}$ bpm).
  3. `RR_local_median`: Running median of up to 10 strictly preceding valid intervals in the record ($s$).
  4. `RR_ratio_prev`: Prematurity coupling ratio ($RR_{\text{prev}} / RR_{\text{local\_median}}$).
  5. `RR_dev_prev`: Fractional deviation ($(RR_{\text{prev}} - \text{median}) / \text{median}$).
  6. `RR_next`: Time interval from current beat to subsequent valid beat ($s$).
  7. `HR_next`: Succeeding instantaneous heart rate ($60.0 / RR_{\text{next}}$ bpm).
  8. `RR_ratio_bidi`: Coupling ratio ($RR_{\text{prev}} / RR_{\text{next}}$).
  9. `RR_bidi_diff`: Interval asymmetry ($RR_{\text{next}} - RR_{\text{prev}}$ in seconds).

---

## 6. Frozen Model Hyperparameters

- **Classifier:** `sklearn.ensemble.RandomForestClassifier`
- `n_estimators`: `200`
- `max_depth`: `30`
- `min_samples_split`: `5`
- `min_samples_leaf`: `2`
- `max_features`: `'sqrt'`
- `class_weight`: `'balanced'` (bootstrap balanced weighting based on training partition frequencies)
- `random_state`: `42`
- `n_jobs`: `-1`

---

## 7. Software Environment & Dependencies

- Python: `3.10+`
- `scikit-learn`: `1.3+`
- `numpy`: `1.24+`
- `scipy`: `1.10+`
- `pandas`: `2.0+`
- `wfdb`: `4.1+`
- `matplotlib`: `3.7+`

---

## 8. Frozen Artifact Registry

All artifacts reside in `backend/data/processed/ml_results/`:
1. `FINAL_MODEL_CONFIG.json`: Machine-readable frozen pipeline configuration.
2. `DS2_TEST_RESULTS.json`: Machine-readable held-out DS2 test evaluation results.
3. `DS2_RECORD_RESULTS.csv`: Record-by-record performance breakdown across all 22 DS2 recordings.
4. `DS2_ERROR_ANALYSIS.md`: Detailed electrophysiological categorization of test misclassifications.
5. `PHASE8_FINAL_TEST_REPORT.md`: Comprehensive final test report.
6. `PHASE8_FEATURE_FREEZE_AUDIT.md`: Complete audit report verifying pipeline invariance across phases.
7. `FINAL_MODEL_CARD.md`: Standard model card documenting intended use and clinical disclaimers.
8. `tables/FINAL_PERFORMANCE_TABLE.csv`: Publication-ready summary performance table.
9. `tables/CLASSWISE_DS2_RESULTS.csv`: Per-class precision, recall, F1, and support on DS2.
10. `tables/DS1_DS2_COMPARISON.csv`: Validation vs test generalization comparison.
11. `tables/FEATURE_IMPORTANCE_TABLE.csv`: Model-level feature importance table.
12. `tables/RECORD_LEVEL_RESULTS.csv`: Complete record-level metrics table.
13. `tables/DATASET_CLASS_DISTRIBUTION.csv`: Exact class distribution across all splits.
14. `backend/models/phase8/random_forest_final_phase8.joblib`: Serialized frozen model weights.

---

## 9. Final Benchmark Result Summary (DS2 Held-Out Test Set)

- **Total Evaluated Beats:** **49,639**
- **Overall Accuracy:** **0.9093** (90.93%)
- **Balanced Accuracy:** **0.7000** (70.00%)
- **Macro Precision:** **0.6348**
- **Macro Recall:** **0.7000**
- **Macro F1 Score:** **0.6403**
- **Weighted F1 Score:** **0.9174**
- **Macro ROC-AUC:** **0.9425**
- **Macro PR-AUC:** **0.6280**
- **Confusion Matrix ($[N, S, V, F]$):**
  $$\begin{bmatrix}
  40845 & 2154 & 1126 & 72 \\
  382 & 1388 & 58 & 7 \\
  334 & 52 & 2808 & 26 \\
  242 & 16 & 34 & 96
  \end{bmatrix}$$
