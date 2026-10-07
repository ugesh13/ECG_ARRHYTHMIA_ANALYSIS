# MODEL CARD: FROZEN RANDOM FOREST ECG BEAT CLASSIFIER
## ANSI/AAMI EC57 4-Class Arrhythmia Classification Benchmark

**Model Name:** `RandomForestClassifier_ECG_Phase8_Frozen`  
**Model Version:** 1.0 (Permanently Frozen)  
**Standard Reference:** ANSI/AAMI EC57:1998 / de Chazal et al. (*IEEE TBME*, 2004)  
**Date:** October 4, 2026  
**License / Intended Use:** Academic and Educational Research Only  

---

## 1. Model Purpose & Description

This machine learning model performs automated single-lead electrocardiogram (ECG) heartbeat classification according to the ANSI/AAMI EC57 standard diagnostic categories. It was developed to evaluate whether classical machine learning ensembles combining localized ECG morphology with engineered cardiac cycle timing features (RR intervals) can achieve robust inter-patient generalization on held-out recordings.

---

## 2. Dataset & Partition Provenance

- **Data Source:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`), sampled at 360.0 Hz.
- **Record Cohort:** 44 non-paced ambulatory ECG records (4 paced records `102, 104, 107, 217` isolated).
- **Partition Governance (Inter-Patient Split):**
  - **Training Partition (16 DS1 Records):** `101, 106, 109, 112, 115, 116, 119, 122, 124, 203, 205, 207, 208, 215, 223, 230` (38,029 usable bidirectional beats).
  - **Validation Partition (6 DS1 Records):** `108, 114, 118, 201, 209, 220` (12,918 usable bidirectional beats).
  - **Test Partition (22 DS2 Records):** `100, 103, 105, 111, 113, 117, 121, 123, 200, 202, 210, 212, 213, 214, 219, 221, 222, 228, 231, 232, 233, 234` (49,639 usable bidirectional beats).

---

## 3. Classification Task

Standard ANSI/AAMI EC57 4-class formulation:
- **`N` (Normal / Bundle Branch Block):** Normal sinus beats (`N`), Left/Right bundle branch block (`L`, `R`), Atrial escape (`e`), Nodal escape (`j`).
- **`S` (Supraventricular Ectopic):** Atrial premature beats (`A`), Aberrated atrial premature (`a`), Nodal premature (`J`), Supraventricular premature (`S`).
- **`V` (Ventricular Ectopic):** Premature ventricular contractions (`V`), Ventricular escape (`E`).
- **`F` (Fusion):** Ventricular fusion beats (`F`).

*(Note: Unclassifiable pacing and noise beats [`Q`] are isolated from primary evaluation).*

---

## 4. Feature Representation ($D = 209$)

The input feature vector consists of 209 continuous numerical features:
1. **ECG Morphology ($D = 200$):**
   - 200 raw voltage samples extracted around the reference R-peak (90 samples pre-R, 110 samples post-R, corresponding to a 555 ms window at 360 Hz).
   - Preprocessing: Moving-average filtering (217 samples, ~0.6 s, reflection padding) for baseline wander removal followed by per-beat z-score amplitude normalization.
2. **Bidirectional RR Timing Features ($D = 9$):**
   - `RR_prev`: Preceding interval from previous valid beat ($s$)
   - `HR_prev`: Preceding instantaneous heart rate ($60.0 / RR_{\text{prev}}$ bpm)
   - `RR_local_median`: Running median of up to 10 prior valid intervals within record ($s$)
   - `RR_ratio_prev`: Prematurity coupling ratio ($RR_{\text{prev}} / \text{median}$)
   - `RR_dev_prev`: Fractional deviation ($(RR_{\text{prev}} - \text{median}) / \text{median}$)
   - `RR_next`: Subsequent interval to next valid beat ($s$)
   - `HR_next`: Subsequent instantaneous heart rate ($60.0 / RR_{\text{next}}$ bpm)
   - `RR_ratio_bidi`: Coupling ratio ($RR_{\text{prev}} / RR_{\text{next}}$)
   - `RR_bidi_diff`: Interval asymmetry ($RR_{\text{next}} - RR_{\text{prev}}$ in seconds)


---

## 5. Frozen Hyperparameters

- **Algorithm:** `sklearn.ensemble.RandomForestClassifier`
- `n_estimators`: `200`
- `max_depth`: `30`
- `min_samples_split`: `5`
- `min_samples_leaf`: `2`
- `max_features`: `'sqrt'`
- `class_weight`: `'balanced'` (bootstrap class weighting)
- `random_state`: `42`
- `n_jobs`: `-1`

---

## 6. Training Procedure & Leakage Controls

- **Zero Inter-Patient Leakage:** All beats from a given patient record reside exclusively in one partition. Never do beats from the same patient appear in both training and test data.
- **Learned Statistics Isolation:** No z-scoring parameters, scaling metrics, or imputations were derived from the test set.
- **Training-Only Class Weighting:** Sample weights were computed strictly from the training partition label frequencies.

---

## 7. Performance Benchmarks

### A. Phase 7 DS1 Validation Results (12,918 Beats):
- **Macro F1:** **0.7095**
- **Balanced Accuracy:** **0.7079**
- **Overall Accuracy:** **0.9668**
- **Per-Class Recall:** `N`: 98.50%, `S`: 69.83%, `V`: 89.82%, `F`: 25.00%

### B. Phase 8 Final DS2 Held-Out Test Results (49,639 Beats):
- **Macro F1:** **0.6403** (Generalization gap: -0.0692)
- **Balanced Accuracy:** **0.7000** (Generalization gap: -0.0079)
- **Overall Accuracy:** **0.9093** (90.93%)
- **Per-Class Precision:** `N`: 97.71%, `S`: 38.45%, `V`: 69.75%, `F`: 48.00%
- **Per-Class Recall:** `N`: 92.42%, `S`: 75.64%, `V`: 87.20%, `F`: 24.74%
- **Per-Class F1:** `N`: 0.9499, `S`: 0.5098, `V`: 0.7750, `F`: 0.3265

---

## 8. Mandatory Limitations & Cautions

1. **Benchmark Scope:** The MIT-BIH Arrhythmia Database is a historical retrospective benchmark collected in the late 1970s. Results obtained on this cohort do not establish clinical deployment efficacy.
2. **Generalization Constraints:** Generalization is strictly demonstrated across the 22 held-out MIT-BIH DS2 recordings. Performance may differ on other ECG acquisition hardware, electrode placements, patient populations, sampling rates, and clinical environments.
3. **F-Class Sampling Uncertainty:** In DS2, 93.3% of all Fusion beats (362 of 388) originate from a single patient record (Record 213). F-class metrics reflect high sampling uncertainty and must not be interpreted as generalizable fusion recognition.
4. **Offline Bidirectional Timing:** Because the feature pipeline utilizes prospective interval timing ($RR_{\text{post}}$), the model is designated strictly for offline/retrospective Holter analysis. It cannot be deployed in causal real-time streaming without introducing algorithmic latency.
5. **Reference Annotation Reliance:** Beat detection and R-peak localization were derived from human reference annotations. Clinical systems requiring automated QRS detection will experience lower performance due to peak jitter and false detections.
6. **No External Hospital Validation:** The model has not been validated on prospective clinical trials or multi-center electronic health record databases.

---

## 9. Regulatory & Ethical Disclaimer

> [!CAUTION]
> **NOT A MEDICAL DIAGNOSTIC DEVICE:**  
> This software and model are developed strictly for academic, educational, and computational research purposes. This system is **NOT** a medical diagnostic device, clinical decision support system, or telemetry alarm monitor. It must **NEVER** be used for clinical decision-making, patient monitoring, diagnosis, triage, or treatment selection.
