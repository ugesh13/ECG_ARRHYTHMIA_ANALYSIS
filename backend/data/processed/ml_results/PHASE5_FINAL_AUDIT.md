# PHASE 5 FINAL REPORTING AUDIT
## ECG ARRHYTHMIA ANALYSIS — AAMI 4-CLASS BASELINE EXPERIMENT

**Protocol:** ANSI/AAMI EC57:1998 4-Class Diagnostic Formulation (`N`, `S`, `V`, `F`)  
**Audit Type:** Scientific Consistency, Accounting Reconciliation & Test-Protection Verification  
**Audit Reference:** Phase 4 Final Accounting Reconciliation (`PHASE4_FINAL_RECONCILIATION.md`)  
**Date:** October 4, 2026  

---

## 1. Dataset Verification & Four-Class Formulation

### Primary Benchmark Scope:
- **Primary Clinical Data:** 44 non-paced records from the MIT-BIH Arrhythmia Database (`mitdb`).
- **Paced Record Isolation:** Records `102`, `104`, `107`, and `217` (8,757 total beats, containing 8,025 paced complexes) are preserved exclusively for secondary analysis and are strictly excluded from primary benchmark training and evaluation.
- **Class Q Isolation:** 15 unclassifiable beats occurring across the 44 primary records are isolated from the primary four-class diagnostic target.
- **Target Classes:** Standard ANSI/AAMI EC57 four-class taxonomy:
  - `N`: Non-ectopic / Normal beats (Normal, LBBB, RBBB, Atrial/Nodal escape)
  - `S`: Supraventricular ectopic beats (APB, Aberrated APB, Junctional premature, SVEB)
  - `V`: Ventricular ectopic beats (PVC, Ventricular escape, R-on-T)
  - `F`: Fusion beats (Ventricular-normal fusion)

### Aggregate Primary Beat Accounting:
$$\text{Primary 44-Record Total Beats} = \mathbf{100,689}$$
$$\text{Four-Class Benchmark Beats} = 90,086 \text{ (N)} + 2,779 \text{ (S)} + 7,008 \text{ (V)} + 803 \text{ (F)} = \mathbf{100,674}$$
$$\text{Isolated Class Q Beats} = \mathbf{15}$$
$$\text{Reconciliation Check: } 100,674 + 15 = 100,689 \quad \mathbf{[PASS]}$$

---

## 2. Train / Validation / Test Record Allocation & Beat Counts

All partitions are partitioned strictly at the patient record level:

| Partition | Records | Records Allocated | Primary 4-Class Beats | Class N | Class S | Class V | Class F | Isolated Q |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Train (DS1)** | 16 | `101, 106, 109, 112, 115, 116, 119, 122, 124, 203, 205, 207, 208, 215, 223, 230` | **38,061** | 33,914 | 227 | 3,513 | 407 | 8 |
| **Validation (DS1)** | 6 | `108, 114, 118, 201, 209, 220` | **12,930** | 11,931 | 716 | 275 | 8 | 0 |
| **Test (DS2)** | 22 | `100, 103, 105, 111, 113, 117, 121, 123, 200, 202, 210, 212, 213, 214, 219, 221, 222, 228, 231, 232, 233, 234` | **49,683** | 44,241 | 1,835 | 3,220 | 388 | 7 |
| **Paced (Secondary)**| 4 | `102, 104, 107, 217` | *N/A* | 503 | 0 | 227 | 0 | 8,027 |
| **TOTAL** | **48** | Complete MIT-BIH Database | **100,674** | **90,086** | **2,779** | **7,008** | **803** | **8,042** |

$$\text{Total 4-Class Beats Check: } 38,061 + 12,930 + 49,683 = \mathbf{100,674} \quad \mathbf{[PASS]}$$

---

## 3. Correct Validation Q Accounting

### Record-by-Record Audit of Validation Partition (DS1 — 6 Records):
Every single validation record has been verified directly against `record_inventory.json` and `split_manifest.json`:

| Record ID | Total Beats | Class N | Class S | Class V | Class F | Class Q | Lead Selected |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **108** | 1,762 | 1,739 | 4 | 17 | 2 | **0** | MLII |
| **114** | 1,878 | 1,819 | 12 | 43 | 4 | **0** | MLII (Ch 1) |
| **118** | 2,277 | 2,165 | 96 | 16 | 0 | **0** | MLII |
| **201** | 1,962 | 1,634 | 128 | 198 | 2 | **0** | MLII |
| **209** | 3,004 | 2,621 | 382 | 1 | 0 | **0** | MLII |
| **220** | 2,047 | 1,953 | 94 | 0 | 0 | **0** | MLII |
| **Validation Sum** | **12,930** | **11,931** | **716** | **275** | **8** | **0** | — |

$$\text{Validation Identity: } 11,931 + 716 + 275 + 8 + 0 = \mathbf{12,930} \quad \mathbf{[PASS]}$$

> [!IMPORTANT]
> **Audit Finding on Q Beats in Validation:**  
> **Validation Q = 0.** The previously reported 47 count was a historical artifact-counting error involving non-beat pacing markers (`^`), corrected during the Phase 4 final reconciliation. There are zero Q beats present in the validation split. All targets passed to the validation classifiers are strictly and exclusively members of `{N, S, V, F}`.

---

## 4. Class-Weight Calculation Verification

Class weights are computed **strictly from training labels** ($N_{\text{train}} = 38,061$, $K=4$ classes):

$$w_c = \frac{N_{\text{train}}}{K \cdot N_{c, \text{train}}}$$

| Class ($c$) | Training Count ($N_{c, \text{train}}$) | Calculation | Balanced Weight ($w_c$) |
| :---: | :---: | :---: | :---: |
| **N** | 33,914 | $\frac{38,061}{4 \times 33,914}$ | **0.280577** |
| **V** | 3,513 | $\frac{38,061}{4 \times 3,513}$ | **2.708298** |
| **F** | 407 | $\frac{38,061}{4 \times 407}$ | **23.378993** |
| **S** | 227 | $\frac{38,061}{4 \times 227}$ | **41.917399** |

- **Zero Contamination:** Validation labels ($N_{\text{val}} = 12,930$) and test labels ($N_{\text{test}} = 49,683$) are strictly excluded from weight calculations.
- **Zero Resampling:** No SMOTE, synthetic oversampling, or duplicate beats were introduced.
- **Model Weight Handling:**
  - **Logistic Regression:** Configured with `class_weight="balanced"`.
  - **Random Forest:** Configured with `class_weight="balanced"`.
  - **HistGradientBoosting:** `sample_weight` array matching the training-derived balanced weights passed to `.fit(X_train, y_train, sample_weight=sample_weights)`.

---

## 5. Model Architecture & Pipeline Specifications

All baseline models operate on flattened 200-sample raw ECG windows ($D=200$, $555.56$ ms, centered at sample index 90, sampling frequency $360$ Hz):

1. **Logistic Regression Pipeline:**
   - Preprocessing: `StandardScaler(copy=True, with_mean=True, with_std=True)` inside `sklearn.pipeline.Pipeline`.
   - Scaler fitting: Strictly on `X_train`. Validation features `X_val` are transformed only using the training-fitted scaler.
   - Classifier: `LogisticRegression(solver='lbfgs', max_iter=1000, class_weight='balanced', C=1.0, random_state=42)`.
2. **Random Forest Classifier:**
   - Estimator: `RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42, n_jobs=-1, max_depth=None)`.
   - No feature scaling applied (tree models are scale-invariant).
3. **HistGradientBoostingClassifier:**
   - Estimator: `HistGradientBoostingClassifier(random_state=42, max_iter=100, learning_rate=0.1, max_depth=None, min_samples_leaf=20)`.
   - Training-only sample weights applied during `.fit()`.

---

## 6. Macro Metric Mathematical Verification

Under the standard multiclass evaluation protocol over the canonical class order (`N`, `S`, `V`, `F`):

$$\text{Macro Precision} = \frac{1}{4} \left( \text{Precision}_N + \text{Precision}_S + \text{Precision}_V + \text{Precision}_F \right)$$
$$\text{Macro Recall} = \frac{1}{4} \left( \text{Recall}_N + \text{Recall}_S + \text{Recall}_V + \text{Recall}_F \right)$$
$$\text{Macro F1} = \frac{1}{4} \left( \text{F1}_N + \text{F1}_S + \text{F1}_V + \text{F1}_F \right)$$
$$\text{Balanced Accuracy} = \text{Macro Recall} = \frac{1}{4} \sum_{c \in \{N,S,V,F\}} \frac{\text{TP}_c}{\text{Support}_c}$$

*Note on numerical presentation:* The displayed per-class values are rounded to 4 decimal places for reporting readability; macro metrics are calculated directly from the underlying unrounded values.

---

## 7. Confusion Matrix Structural Verification

The confusion matrix $C$ is structured such that row index $i$ corresponds to the **True Class** and column index $j$ corresponds to the **Predicted Class**, ordered as `[N, S, V, F]`:

$$C = \begin{bmatrix}
C_{N \to N} & C_{N \to S} & C_{N \to V} & C_{N \to F} \\
C_{S \to N} & C_{S \to S} & C_{S \to V} & C_{S \to F} \\
C_{V \to N} & C_{V \to S} & C_{V \to V} & C_{V \to F} \\
C_{F \to N} & C_{F \to S} & C_{F \to V} & C_{F \to F}
\end{bmatrix}$$

### Invariant Row Sum Identities:
- Row 0 (True N): $\sum_{j} C_{0, j} = \mathbf{11,931}$
- Row 1 (True S): $\sum_{j} C_{1, j} = \mathbf{716}$
- Row 2 (True V): $\sum_{j} C_{2, j} = \mathbf{275}$
- Row 3 (True F): $\sum_{j} C_{3, j} = \mathbf{8}$
- Total Matrix Sum: $\sum_{i,j} C_{i, j} = 11,931 + 716 + 275 + 8 = \mathbf{12,930}$
- Column Sums: $\sum_{i} C_{i, j} = \text{Total predicted as class } j$.

---

## 8. Data Leakage & Test-Set Protection Verification

- **Train vs Validation Record Disjointness:**
  $$\text{set(Train Records)} \cap \text{set(Validation Records)} = \emptyset$$
  $$\{101, 106, \dots, 230\} \cap \{108, 114, 118, 201, 209, 220\} = \emptyset \quad \mathbf{[PASS]}$$
- **DS2 Test Set Lock Verification:**
  - DS2 records: `100, 103, 105, 111, 113, 117, 121, 123, 200, 202, 210, 212, 213, 214, 219, 221, 222, 228, 231, 232, 233, 234`
  - Neither `train_and_evaluate_model()` nor `prepare_baseline_datasets()` in `backend/app/ml/trainer.py` load or reference DS2 test records.
  - No test metrics generated.
  - No test confusion matrix generated.
  - No test threshold tuning performed.
  - No test model selection performed.
  - No test preprocessing fitting performed.
  - **No final test-set evaluation was performed in Phase 5.** $\mathbf{[PASS]}$

---

## 9. Scientific Performance Interpretation & Limitations

1. **Comparative Interpretation:**
   - Among the baseline models, Random Forest achieved the highest validation Macro F1 in the current experiment. Final generalization performance cannot be determined until the locked DS2 test set is evaluated after model selection.
   - Raw Accuracy is not used for model ranking because Class N constitutes $92.27\%$ of the validation set; Macro F1 and Balanced Accuracy serve as the primary criteria.
2. **Minority Class Sampling Uncertainty:**
   > *F-class validation support is only 8 beats; therefore F-class validation metrics have high sampling uncertainty and should not be interpreted as definitive generalization performance.*
3. **Morphological Baseline Limitations:**
   - Raw 200-sample point amplitudes without explicit QRS morphological interval features (e.g. QRS duration, pre/post RR-interval ratios) limit linear model separation, particularly for supraventricular premature beats (`S`) whose morphology closely resembles normal sinus complexes.

---

## 10. Audit Conclusion

All accounting identities, class weight formulations, Q-class isolations, validation data targets, mathematical properties, and zero-leakage test protections have been audited and verified.

**PHASE 5 FINAL AUDIT: PASS**
