# EXPERIMENTAL RESULTS: ANSI/AAMI EC57 BEAT CLASSIFICATION BENCHMARK

**Standard Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Evaluated Architecture:** Frozen Random Forest Classifier ($D = 209$)  
**Status:** Canonical Results Section for Research Publication  

---

### 5.1 Baseline Morphology Performance

In the baseline morphology experiment (Phase 5), models were trained and evaluated exclusively on 200 raw voltage samples per beat ($D=200$). On the 6-record DS1 validation cohort (12,930 beats), the baseline Random Forest achieved an overall accuracy of **94.21%**, a balanced accuracy of **59.82%**, and a Macro F1 score of **0.5824** (Macro Precision: 58.91%, Weighted F1: 93.85%).

Although the morphology baseline attained high recall on normal sinus rhythm (`N` recall = 97.80%) and ventricular ectopy (`V` recall = 84.20%), it exhibited severe limitations on supraventricular premature contractions (`S` recall = 38.40%) and ventricular fusion beats (`F` recall = 12.50%). Because supraventricular ectopic beats conduct along the normal His-Purkinje pathway, their ventricular depolarization morphology closely resembles sinus complexes, imposing a strict physiological ceiling on pure morphology classifiers.

---

### 5.2 Effect of Cardiac Cycle Timing (RR Intervals)

Incorporating cardiac timing features extracted from reference annotations substantially resolved this morphological ambiguity across matched-cohort controls:

- **Variant A (Causal Timing, $D=205$):** Adding 5 retrospective interval features (`RR_prev`, `HR_prev`, `RR_local_median`, `RR_ratio_prev`, `RR_dev_prev`) to the Random Forest increased validation Macro F1 from **0.5824 to 0.6650** (+0.0826 gain), lifted balanced accuracy from **59.82% to 68.45%**, and increased Class S recall from **38.40% to 61.20%** (+22.80% sensitivity gain).
- **Variant B (Bidirectional Timing, $D=209$):** Adding 4 prospective and coupling interval features (`RR_next`, `HR_next`, `RR_ratio_bidi`, `RR_bidi_diff`) further elevated validation Macro F1 to **0.6985** (+0.1161 over morphology baseline), balanced accuracy to **71.20%**, and Class S recall to **68.40%**.

The inclusion of post-ectopic pause durations ($RR_{\text{next}}$) and coupling asymmetry ratios ($RR_{\text{prev}} / RR_{\text{next}}$) directly captured compensatory pause dynamics, providing discriminative separation for premature complexes.

---

### 5.3 Hyperparameter Optimization

In Phase 7, 4-fold record-grouped cross-validation on the 16 training recordings identified optimal Random Forest hyperparameters: an ensemble of 200 trees (`n_estimators=200`), constrained tree depth (`max_depth=30`), minimum samples per split of 5 (`min_samples_split=5`), and minimum samples per leaf of 2 (`min_samples_leaf=2`). 

When re-evaluated on the DS1 validation cohort (12,918 usable beats), the tuned Random Forest achieved:
- **Overall Accuracy:** **96.68%**
- **Balanced Accuracy:** **70.79%**
- **Macro Precision:** **71.66%**
- **Macro Recall:** **70.79%**
- **Macro F1 Score:** **0.7095** (+0.0110 gain over untuned bidirectional RF)
- **Weighted F1 Score:** **96.64%**
- **Multi-Class ROC-AUC (OvR):** **0.9782**
- **Multi-Class PR-AUC (OvR):** **0.7321**

Tree regularization constrained individual tree variance, yielding modest but consistent improvements across the minority classes (`S` recall: 69.83%, `V` recall: 89.82%).

---

### 5.4 Final Held-Out Test Performance (DS2 Benchmark)

The finalized model pipeline was frozen and evaluated on the 22 held-out DS2 test recordings (49,639 usable beats from completely unseen patients). The model achieved:

| Performance Metric | Stored Test Score | Percentage Representation | Technical Interpretation |
| :--- | :---: | :---: | :--- |
| **Overall Accuracy** | **0.9093** | **90.93%** | Agreement across all 49,639 evaluated heartbeats |
| **Balanced Accuracy** | **0.7000** | **70.00%** | Unweighted mean recall across the 4 distinct diagnostic rhythms |
| **Macro Precision** | **0.6348** | **63.48%** | Unweighted mean positive predictive value |
| **Macro Recall** | **0.7000** | **70.00%** | Unweighted mean class sensitivity |
| **Macro F1 Score** | **0.6403** | — | Harmonic mean of unweighted precision and recall |
| **Weighted F1 Score** | **0.9174** | **91.74%** | Support-weighted F1 across all evaluated classes |
| **Multi-Class ROC-AUC (OvR)** | **0.9425** | — | Overall area under the receiver operating characteristic curve |
| **Multi-Class PR-AUC (OvR)** | **0.6280** | — | Area under the precision-recall curve under extreme class imbalance |

---

### 5.5 Class-Wise Performance Breakdown (DS2 Benchmark)

| Class | Diagnostic Description | Precision | Recall (Sensitivity) | F1-Score | True Support | Evaluated Prevalence (%) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **N** | Normal Sinus / Bundle Branch Blocks | **97.71%** | **92.42%** | **0.9499** | 44,197 | 89.04% |
| **S** | Supraventricular Ectopic Beats | **38.45%** | **75.64%** | **0.5098** | 1,835 | 3.70% |
| **V** | Ventricular Ectopic Beats | **69.75%** | **87.20%** | **0.7750** | 3,220 | 6.49% |
| **F** | Ventricular Fusion Beats | **48.00%** | **24.74%** | **0.3265** | 388 | 0.78% |
| — | **Macro Average / Total** | **63.48%** | **70.00%** | **0.6403** | **49,639** | **100.00%** |

1. **Class N:** High precision (97.71%) and recall (92.42%), with 40,845 normal beats accurately identified. Approximately 3,352 normal beats were misclassified into ectopic categories due to respiratory sinus arrhythmia and intraventricular conduction delays.
2. **Class S:** Achieved robust diagnostic sensitivity on unseen patients (75.64%, 1,388 of 1,835 APCs identified). Precision was moderate (38.45%), reflecting false-positive alarms on non-pathological sinus rate acceleration.
3. **Class V:** High sensitivity and precision for clinically critical ventricular arrhythmias (Recall: 87.20%, Precision: 69.75%, F1: 0.7750), capturing 2,808 of 3,220 PVCs.
4. **Class F:** Moderate precision (48.00%) but lower sensitivity (24.74%, 96 of 388 detected). 242 fusion beats (62.37%) were classified as Class N due to dominant supraventricular capture.

---

### 5.6 Confusion Matrix Analysis

The primary confusion matrix for the 49,639 DS2 test beats is:

$$\mathbf{C}_{\text{DS2}} = \begin{bmatrix}
40845 & 2154 & 1126 & 72 \\
382 & 1388 & 58 & 7 \\
334 & 52 & 2808 & 26 \\
242 & 16 & 34 & 96
\end{bmatrix}$$

Rows correspond to Reference Truth; columns correspond to Model Predictions in canonical order $[\mathbf{N}, \mathbf{S}, \mathbf{V}, \mathbf{F}]$. Exactly **45,137 beats** were correctly classified (**90.93% accuracy**), and **4,502 beats** were misclassified (**9.07% error rate**).

---

### 5.7 Generalization from DS1 to DS2

Evaluating the frozen model on 22 unseen patient recordings revealed distinct generalization behaviors between sensitivity and precision:

| Metric | DS1 Validation (6 Records, 12,918 Beats) | DS2 Test Benchmark (22 Records, 49,639 Beats) | Generalization Gap ($\Delta$) | Relative Change (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Balanced Accuracy** | **0.7079** | **0.7000** | **-0.0079** | **-1.12%** |
| **Macro F1 Score** | **0.7095** | **0.6403** | **-0.0692** | **-9.75%** |
| **Overall Accuracy** | **0.9668** | **0.9093** | **-0.0575** | **-5.95%** |
| **Weighted F1 Score** | **0.9664** | **0.9174** | **-0.0490** | **-5.07%** |
| **Class S Recall** | **0.6983** | **0.7564** | **+0.0581** | **+8.32%** |
| **Class V Recall** | **0.8982** | **0.8720** | **-0.0262** | **-2.92%** |
| **Class N Recall** | **0.9850** | **0.9242** | **-0.0608** | **-6.17%** |
| **Class F Recall** | **0.2500** | **0.2474** | **-0.0026** | **-1.04%** |

Balanced Accuracy showed relatively little degradation between the DS1 validation cohort (0.7079) and the held-out DS2 cohort (0.7000), indicating comparatively stable class-balanced performance across the record-level split. This should not be interpreted as evidence of clinical generalization. The Macro F1 drop ($-0.0692$) was predominantly driven by Class S precision ($76.34\% \to 38.45\%$), caused by autonomic rate variability in select test recordings.

---

### 5.8 Model-Level Feature Importance

In the frozen Random Forest, the 9 temporal features represent only **4.31%** of the 209-dimensional feature vector, yet they account for **26.38%** of total Gini split importance:
1. `RR_ratio_prev`: **5.82%** (Preceding prematurity coupling ratio)
2. `RR_ratio_bidi`: **4.91%** (Bidirectional interval coupling ratio, $RR_{\text{prev}} / RR_{\text{next}}$)
3. `ECG_092`: **3.24%** (R-peak apex amplitude)
4. `ECG_091`: **2.98%** (Rapid QRS upstroke)
5. `RR_prev`: **2.85%** (Absolute preceding interval duration in seconds)
6. `ECG_093`: **2.76%** (Rapid QRS downstroke)
7. `RR_dev_prev`: **2.65%** (Fractional deviation from running median)
8. `ECG_090`: **2.45%** (Pre-QRS isoelectric baseline)
9. `RR_next`: **2.31%** (Compensatory pause duration in seconds)
10. `ECG_094`: **2.18%** (ST-segment junction)

*Note:* Feature importances represent model-level split statistics and must not be interpreted as independent causal biological drivers.

---

### 5.9 Error Analysis

Across the 4,502 test misclassifications, 5 major error categories accounted for **94.14%** of all errors:
- **$\text{N} \to \text{S}$ (2,154 beats, 47.85% of errors):** Normal sinus beats classified as supraventricular ectopic due to physiological respiratory sinus arrhythmia causing transient interval shortening ($RR_{\text{ratio}} < 0.85$).
- **$\text{N} \to \text{V}$ (1,126 beats, 25.01% of errors):** Normal beats classified as ventricular ectopic due to conduction delays (e.g., bundle branch blocks in Record 214) and baseline noise widening the QRS complex.
- **$\text{S} \to \text{N}$ (382 beats, 8.48% of errors):** Late-cycle atrial premature beats with marginal prematurity ($RR_{\text{ratio}} \approx 0.95$) that lack morphological distinction from sinus beats.
- **$\text{V} \to \text{N}$ (334 beats, 7.42% of errors):** Interpolated PVCs lacking compensatory pauses, and narrow ventricular ectopics originating near the septum.
- **$\text{F} \to \text{N}$ (242 beats, 5.38% of errors):** Ventricular fusion beats with dominant supraventricular myocardial capture.
