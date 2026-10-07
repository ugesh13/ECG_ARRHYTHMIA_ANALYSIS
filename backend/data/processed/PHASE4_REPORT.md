# PHASE 4 REPORT — RECORD-LEVEL DATA SPLITTING & LEAKAGE-SAFE EXPERIMENT FRAMEWORK

**Project:** ECG Arrhythmia Analysis using PhysioNet MIT-BIH Arrhythmia Database  
**Phase:** Phase 4 — Record-Level Data Splitting + Leakage-Safe ML Experiment Framework  
**Status:** COMPLETE & VERIFIED  
**Date:** October 4, 2026  

---

## 1. Dataset Overview

- **Total Records:** 48 complete MIT-BIH clinical recordings
- **Total Annotations Examined:** 112,647 annotations
- **True Heartbeats Examined:** 109,494 beats
- **Non-Beat Annotations Excluded:** 3,153 markers (rhythm changes, flutter waves, noise)
- **Boundary Truncations Excluded:** 48 initial beats ($t < 250$ ms)
- **Final Usable Beats:** **109,446 beats**
- **Sampling Frequency:** 360.0 Hz
- **Beat Window:** 200 samples (555.56 ms duration; 90 samples pre-R, 110 samples post-R; aligned at index 90)
- **Lead Distribution:** MLII = 105,032 beats (46 records); V5 = 4,414 beats (2 records: 102, 104)

---

## 2. Splitting Methodology & Leakage Prevention

### Why Beat-Level Splitting is Invalid
Splitting individual beats randomly (`train_test_split(all_beats)`) produces catastrophic data leakage. A single recording contains thousands of heartbeats from the same patient under uniform electrode impedance, posture, and basal heart rate. Beats from the same patient are heavily auto-correlated. Random beat splitting evaluates the model on the same patient's morphological signature, inflating test accuracy artificially to >98% while failing completely on real unseen patients.

### Record-Level Grouping (Inter-Patient Protocol)
All partitioning is strictly enforced at the **RECORD level**. Every patient recording belongs exclusively to one subset:
$$\text{set(Train)} \cap \text{set(Validation)} = \emptyset$$
$$\text{set(Train)} \cap \text{set(Test)} = \emptyset$$
$$\text{set(Validation)} \cap \text{set(Test)} = \emptyset$$
$$\text{Train} \cup \text{Validation} \cup \text{Test} \cup \text{Paced} = \text{All 48 Records}$$

---

## 3. Split Design & Exact Record IDs

Adhering to the ANSI/AAMI EC57:1998 standard and the de Chazal et al. (IEEE Trans. Biomed. Eng., 2004) benchmark protocol:

### Training Split (16 Records, 38,069 Beats)
`['101', '106', '109', '112', '115', '116', '119', '122', '124', '203', '205', '207', '208', '215', '223', '230']`

### Validation Split (6 Records, 12,930 Beats)
`['108', '114', '118', '201', '209', '220']`

### Held-Out Test Split (DS2, 22 Records, 49,690 Beats)
`['100', '103', '105', '111', '113', '117', '121', '123', '200', '202', '210', '212', '213', '214', '219', '221', '222', '228', '231', '232', '233', '234']`

### Excluded Paced Records (4 Records, 8,757 Beats)
`['102', '104', '107', '217']`

---

## 4. Class Distribution Across Splits

### Reconciled Five-Class Split Accounting:
| Split | Records | Total Beats | Class N | Class S | Class V | Class F | Class Q |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Train** | **16** | **38,069** | 33,914 (89.09%) | 227 (0.60%) | 3,513 (9.23%) | 407 (1.07%) | 8 (0.02%) |
| **Validation** | **6** | **12,930** | 11,931 (92.27%) | 716 (5.54%) | 275 (2.13%) | 8 (0.06%) | 0 (0.00%) |
| **Test (DS2)** | **22** | **49,690** | 44,241 (89.03%) | 1,835 (3.69%) | 3,220 (6.48%) | 388 (0.78%) | 7 (0.01%) |
| **Primary Total** | **44** | **100,689** | **90,086 (89.47%)** | **2,779 (2.76%)** | **7,008 (6.96%)** | **803 (0.80%)** | **15 (0.01%)** |
| **Paced (Excl.)** | **4** | **8,757** | 503 (5.74%) | 0 (0.00%) | 227 (2.59%) | 0 (0.00%) | 8,027 (91.66%) |
| **TOTAL** | **48** | **109,446** | **90,589** | **2,779** | **7,235** | **803** | **8,040** |

### Primary Four-Class Benchmark Dataset (`N`, `S`, `V`, `F`):
Excluding the 15 unclassifiable Q beats from primary benchmark evaluation yields the standard AAMI four-class dataset:
| Split | Records | 4-Class Beats | Class N | Class S | Class V | Class F |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Train** | **16** | **38,061** | 33,914 (89.10%) | 227 (0.60%) | 3,513 (9.23%) | 407 (1.07%) |
| **Validation** | **6** | **12,930** | 11,931 (92.27%) | 716 (5.54%) | 275 (2.13%) | 8 (0.06%) |
| **Test (DS2)** | **22** | **49,683** | 44,241 (89.05%) | 1,835 (3.69%) | 3,220 (6.48%) | 388 (0.78%) |
| **TOTAL 4-CLASS** | **44** | **100,674** | **90,086 (89.48%)** | **2,779 (2.76%)** | **7,008 (6.96%)** | **803 (0.80%)** |

All numbers balance to the single beat across all 48 records.

---

## 5. Paced Records Policy

Records `102`, `104`, `107`, and `217` are derived from patients with artificial electronic pacemakers:
- **Decision:** Excluded from the primary arrhythmia benchmark strictly conforming to ANSI/AAMI EC57 recommendations.
- **Data Integrity:** No records or beats are deleted. They are preserved in `record_inventory.json` and `split_manifest.json` under `excluded_records` with reason `"paced_rhythm_aami_ec57_standard"`.
- **Loader Support:** Accessible via `get_paced_data()` in `ECGDatasetLoader` for isolated secondary evaluation.

---

## 6. Reproducibility & Determinism

- **Random Seed:** `42`
- **Manifest:** Saved as machine-readable JSON in [split_manifest.json](file:///c:/Users/ugesh/Desktop/Projects/ECG_Anomaly_Detection/ECG-ARRHYTHMIA-ANALYSIS/backend/data/processed/split_manifest.json).
- **Balanced Class Weights (4-Class Formulation, 38,061 Train Samples):**
  - $w_{\text{N}} = \frac{38,061}{4 \times 33,914} = 0.2806$
  - $w_{\text{V}} = \frac{38,061}{4 \times 3,513} = 2.7083$
  - $w_{\text{F}} = \frac{38,061}{4 \times 407} = 23.3790$
  - $w_{\text{S}} = \frac{38,061}{4 \times 227} = 41.9174$
  - Validation and test labels never enter weight computation.

---

## 7. Scientific Limitations & Methodological Risk

1. **Severe Imbalance:** Class `F` (Fusion) and Class `S` (Supraventricular) represent only 1.07% and 0.60% of the training set respectively.
2. **Q-Class Methodological Risk:** If formulated as a 5-class task on non-paced records, an extreme class-weight imbalance and insufficient Q-class training representation (only 8 training beats) create a substantial risk of unstable or non-generalizable learning. This is a methodological risk, not an observed model result.
3. **Patient-Specific Arrhythmia Concentration:** Ectopic events are concentrated in specific patients (e.g. Record 208 contributes 992 PVCs and 373 Fusion beats; Record 232 in the test set contributes 1,381 APCs).
4. **Paced Generalization:** Algorithms trained on spontaneous ventricular waveforms will not accurately classify artificially paced beats without dedicated pacing spike pre-filters. Dedicated evaluation on records 102, 104, 107, 217 is preserved as a secondary experiment.

---

## 8. Machine Learning Status Declaration

> [!IMPORTANT]
> **No final machine learning model has been trained in Phase 4.**
> 
> No Random Forest, XGBoost, CNN, LSTM, or SVM models have been fitted. No SMOTE, artificial oversampling, or synthetic ECG generation has been performed. No test accuracies, ROC-AUC, or confusion matrices have been computed. The held-out Test set (DS2) remains completely untouched and pristine.
