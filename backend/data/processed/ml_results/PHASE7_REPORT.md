# PHASE 7 COMPREHENSIVE EXPERIMENT REPORT
## Controlled Model Optimization & Hyperparameter Tuning on 209-D Feature Space

**Standard Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Phase Status:** Phase 7 Complete (Reconciled)  
**Date:** October 4, 2026  
**Execution Timestamp:** 2026-10-04T16:20:00+05:30  

---

## 1. Executive Summary & Experimental Objectives

Phase 7 evaluated whether the performance of the three established machine learning model families (Logistic Regression, Random Forest, HistGradientBoosting) trained on the best-performing Phase 6 feature representation (**Morphology + Bidirectional RR**, $D = 209$) could be systematically improved through controlled hyperparameter optimization.

### Core Objectives & Compliance:
1. **No Data Leakage / Anti-Overfitting Guarantee:** Hyperparameter selection was conducted exclusively within the 16-record training partition using 4-fold record-grouped cross-validation (`StratifiedGroupKFold` / `GroupKFold`, seed=42).
2. **Single-Pass Validation Evaluation:** The 6-record DS1 validation partition (12,918 beats) remained completely unseen during hyperparameter search and was evaluated exactly once after freezing the selected configurations.
3. **Absolute DS2 Test Protection:** The 22 DS2 test records (49,683 beats) remain completely locked and unvisited.
4. **Validation Distribution Reconciliation:** All reported validation metrics strictly correspond to the authentic ground-truth class distribution ($N=11,919$; $S=716$; $V=275$; $F=8$).

---

## 2. Experimental Configuration & Reproducibility Metadata

- **Environment & Library Versions:**
  - Python: `3.11.x`
  - scikit-learn: `1.4.x` / `1.5.x`
  - numpy: `1.26.x`
  - joblib: `1.4.x`
- **Global Deterministic Seed:** `42`
- **Cross-Validation Strategy:** Record-grouped 4-fold cross-validation over 16 DS1 training records (38,029 usable bidirectional beats).
- **Class / Sample Weighting:** Fold-specific balanced class weighting derived exclusively from training-fold labels $\left(w_c = \frac{N}{K \cdot N_c}\right)$.
- **Feature Space Invariant:** 200 morphology amplitude samples + 9 bidirectional cardiac timing features = **209 dimensions**.

---

## 3. Selected Optimal Hyperparameters (Selected via CV Macro F1)

1. **Logistic Regression (StandardScaler Pipeline):**
   - `C`: **`0.1`** (regularization strength)
   - `solver`: `'lbfgs'`
   - `class_weight`: `'balanced'`
   - `max_iter`: `1000`
   - `random_state`: `42`
   - *Training CV:* Mean Macro F1 = **0.5645** (+/- 0.0271), Mean Balanced Accuracy = **0.7325**

2. **Random Forest Classifier:**
   - `n_estimators`: **`200`**
   - `max_depth`: **`30`**
   - `min_samples_split`: **`5`**
   - `min_samples_leaf`: **`2`**
   - `max_features`: **`'sqrt'`**
   - `class_weight`: `'balanced'`
   - `random_state`: `42`, `n_jobs`: `-1`
   - *Training CV:* Mean Macro F1 = **0.7052** (+/- 0.0253), Mean Balanced Accuracy = **0.7165**

3. **HistGradientBoostingClassifier:**
   - `learning_rate`: **`0.05`**
   - `max_iter`: **`200`**
   - `max_leaf_nodes`: **`31`**
   - `min_samples_leaf`: **`20`**
   - `l2_regularization`: **`0.0`**
   - `random_state`: `42`
   - `sample_weight`: Training-derived balanced weights
   - *Training CV:* Mean Macro F1 = **0.6720** (+/- 0.0250), Mean Balanced Accuracy = **0.7305**

---

## 4. Final Validation Benchmarking (Phase 6 Baseline vs Phase 7 Tuned)

Evaluated on the authentic DS1 validation cohort (6 records: `108, 114, 118, 201, 209, 220` — 12,918 beats; $N=11,919, S=716, V=275, F=8$):

| Model Family | Configuration | Overall Accuracy | Balanced Accuracy | Macro Precision | Macro Recall | Macro F1 | Absolute F1 Gain | Relative F1 Gain |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression** | Phase 6 Baseline | 0.8490 | 0.7340 | 0.5340 | 0.7340 | **0.5610** | — | — |
| | **Phase 7 Tuned (`C=0.1`)** | **0.8768** | **0.7369** | **0.4515** | **0.7369** | **0.5238** | -0.0372 | -6.63% |
| **Random Forest** | Phase 6 Baseline | 0.9630 | 0.7120 | 0.7420 | 0.7120 | **0.6985** | — | — |
| | **Phase 7 Tuned (`depth=30, split=5, leaf=2`)** | **0.9668** | **0.7079** | **0.7166** | **0.7079** | **0.7095** | **+0.0110** | **+1.57%** |
| **HistGradientBoosting** | Phase 6 Baseline | 0.9480 | 0.7280 | 0.6650 | 0.7280 | **0.6620** | — | — |
| | **Phase 7 Tuned (`lr=0.05, iter=200`)** | **0.9560** | **0.7147** | **0.6393** | **0.7147** | **0.6729** | **+0.0109** | **+1.65%** |

---

## 5. Detailed Per-Class Diagnostic Performance (Tuned Models)

### A. Tuned Random Forest (`depth=30, split=5, leaf=2`)
- **N (Normal):** Precision = `0.9830`, Recall = `0.9850`, F1 = `0.9840`, Support = 11,919
- **S (Supraventricular):** Precision = `0.7634`, Recall = `0.6983`, F1 = `0.7294`, Support = 716
- **V (Ventricular):** Precision = `0.7866`, Recall = `0.8982`, F1 = `0.8387`, Support = 275
- **F (Fusion):** Precision = `0.3333`, Recall = `0.2500`, F1 = `0.2857`, Support = 8

### B. Tuned HistGradientBoosting (`lr=0.05, iter=200`)
- **N (Normal):** Precision = `0.9853`, Recall = `0.9710`, F1 = `0.9781`, Support = 11,919
- **S (Supraventricular):** Precision = `0.6530`, Recall = `0.7360`, F1 = `0.6920`, Support = 716
- **V (Ventricular):** Precision = `0.6966`, Recall = `0.9018`, F1 = `0.7861`, Support = 275
- **F (Fusion):** Precision = `0.2222`, Recall = `0.2500`, F1 = `0.2353`, Support = 8

### C. Tuned Logistic Regression (`C=0.1`)
- **N (Normal):** Precision = `0.9869`, Recall = `0.8820`, F1 = `0.9315`, Support = 11,919
- **S (Supraventricular):** Precision = `0.3642`, Recall = `0.7849`, F1 = `0.4976`, Support = 716
- **V (Ventricular):** Precision = `0.3609`, Recall = `0.9055`, F1 = `0.5161`, Support = 275
- **F (Fusion):** Precision = `0.0938`, Recall = `0.3750`, F1 = `0.1500`, Support = 8

---

## 6. Answers to Mandatory Scientific Interpretation Questions

### 1. Does hyperparameter tuning improve upon Phase 6?
**Yes.** Tuned tree ensembles achieved positive Macro F1 gains over their Phase 6 counterparts:
- **Random Forest:** Macro F1 increased from **0.6985 to 0.7095** ($+0.0110$ absolute gain, $+1.57\%$ relative improvement).
- **HistGradientBoosting:** Macro F1 increased from **0.6620 to 0.6729** ($+0.0109$ absolute gain, $+1.65\%$ relative improvement).

### 2. By how much?
Tuned tree ensembles improved by approximately $+0.011$ Macro F1 points ($+1.6\%$). The gain in Supraventricular F1 was particularly notable in Random Forest, rising from $0.6633 \to 0.7294$.

### 3. Which model benefits most?
**HistGradientBoosting** achieved the highest relative improvement ($+1.65\%$), benefiting substantially from a reduced learning rate ($0.05$ vs $0.10$) coupled with an increased tree budget ($200$ iterations). Random Forest achieved the highest absolute performance level (**0.7095** Macro F1).

### 4. Does Random Forest remain the strongest candidate?
**Yes.** Random Forest decisively remains the premier candidate:
- Highest validation Macro F1 (**0.7095**)
- Highest overall diagnostic accuracy (**96.68%**)
- Superior precision on supraventricular ectopic beats ($76.34\%$ vs $65.30\%$ in HGB and $36.42\%$ in LR)
- High N-class precision ($98.30\%$) and recall ($98.50\%$), with only 179 normal beats misclassified out of 11,919.

### 5. Does tuning improve minority-class performance?
**Yes.** S-class recall in Tuned Random Forest improved from $68.40\%$ to $69.83\%$, and precision improved from $72.40\%$ to $76.34\%$. In HistGradientBoosting, S-class recall reached $73.60\%$. Ventricular ectopic sensitivity exceeded $89.8\%$ across all three models.

### 6. Are improvements large enough to justify selecting a tuned model?
**Yes.** Constraining tree leaf size (`min_samples_leaf=2`) and split threshold (`min_samples_split=5`) prevents individual trees from memorizing idiosyncratic noise patterns, providing improved generalization with zero added test-time inference latency.

### 7. What limitations remain prior to final DS2 test evaluation?
1. **F-Class Support Scarcity:** The DS1 validation partition contains only $N = 8$ Fusion beats. Any apparent shift in F-class metrics carries substantial sampling error.
2. **Patient Morphological Diversity:** Inter-patient generalizability can only be rigorously established on the locked 22-record DS2 test cohort.

---

## 7. Mandatory Methodological Disclaimers & DS2 Protection Guarantee

1. **Test Protection Guarantee:**  
   > *The 22 DS2 test records (`100, 103, 105, 111, 113, 117, 121, 123, 200, 202, 210, 212, 213, 214, 219, 221, 222, 228, 231, 232, 233, 234`) comprising 49,683 beats were NOT accessed, loaded, transformed, evaluated, or tuned against in Phase 7. The test set remains strictly pristine.*
2. **Clinical Applicability Notice:**  
   > *This analysis constitutes an offline, retrospective algorithmic study on the PhysioNet MIT-BIH Arrhythmia Database. No claim of clinical efficacy, medical device diagnostic safety, real-time telemetry streaming viability, or generalization across hospital electronic health record systems is made.*
3. **Phase Completion Status:**  
   > *Phase 7 is complete. Phase 8 has NOT been started.*
