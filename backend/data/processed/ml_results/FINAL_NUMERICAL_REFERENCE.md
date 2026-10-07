# FINAL NUMERICAL REFERENCE: SINGLE SOURCE OF TRUTH FOR PUBLICATION

**Standard Protocol Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Database:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`)  
**Evaluated Architecture:** Frozen Random Forest Classifier ($D = 209$)  
**Status:** PERMANENTLY LOCKED NUMERICAL REFERENCE  

---

## 1. Database Accounting & Partition Invariants

| Category / Accounting Field | Exact Value | Notes & Constraints |
| :--- | :---: | :--- |
| **Total Database Recordings** | **48 records** | Two-channel ambulatory analog recordings; 47 subjects |
| **Paced Cohort Recordings (Isolated)** | **4 records** | Records `102, 104, 107, 217` (isolated from primary target) |
| **Paced Cohort Total Beats** | **8,757 beats** | Contains 8,027 paced complexes; excluded from training/testing |
| **Primary Non-Paced Recordings** | **44 records** | Benchmark evaluation cohort |
| **Primary 44-Record Total Beats** | **100,689 beats** | Ground truth count across all 44 records |
| **Isolated Unclassifiable / Paced Beats (Q)**| **15 beats** | Isolated from primary 4-class target (8 train, 0 val, 7 test) |
| **Primary 4-Class Raw Beats** | **100,674 beats** | $90,086 \text{ (N)} + 2,779 \text{ (S)} + 7,008 \text{ (V)} + 803 \text{ (F)}$ |
| **Bidirectional Boundary Exclusions** | **88 beats** | Exactly 2 beats per record (Beat 0 and Beat $N-1$); all Class N |
| **Total Usable Bidirectional Beats** | **100,586 beats** | Evaluated across train (38,029), val (12,918), and test (49,639) |
| **Training Partition (DS1 — 16 Records)** | **38,029 beats** | $N=33,882; S=227; V=3,513; F=407$ (32 edge beats excluded) |
| **Validation Partition (DS1 — 6 Records)** | **12,918 beats** | $N=11,919; S=716; V=275; F=8$ (12 edge beats excluded) |
| **Held-Out Test Partition (DS2 — 22 Records)**| **49,639 beats** | $N=44,197; S=1,835; V=3,220; F=388$ (44 edge beats excluded) |

---

## 2. Model & Pipeline Specifications

| Specification Item | Exact Configured Value |
| :--- | :--- |
| **Classifier Algorithm** | `sklearn.ensemble.RandomForestClassifier` |
| **Number of Estimators ($n_{\text{trees}}$)** | `200` |
| **Maximum Tree Depth ($d_{\text{max}}$)** | `30` |
| **Minimum Samples to Split ($s_{\text{split}}$)** | `5` |
| **Minimum Samples per Leaf ($l_{\text{leaf}}$)** | `2` |
| **Maximum Features per Split ($f_{\text{max}}$)** | `'sqrt'` ($\sqrt{209} \approx 14.45$) |
| **Class Weighting Scheme** | `'balanced'` (bootstrap balanced sample weights from $N_{\text{train}}$) |
| **Random Seed** | `42` |
| **Parallel Workers ($n_{\text{jobs}}$)** | `-1` (all CPU cores) |
| **Total Input Dimension ($D$)** | **209 features** |
| **Morphology Window Length** | 200 samples ($555.56$ ms at 360 Hz; 90 samples pre-R, 110 post-R) |
| **Baseline Wander Filter** | Moving-average filter ($W = 217$ samples, reflection padding) |
| **Morphology Normalization** | Per-beat local z-score normalization ($z = (x - \mu)/\sigma$) |
| **Temporal Feature Count** | 9 canonical bidirectional RR timing features |

---

## 3. Benchmark Metric Comparison (Validation vs Held-Out Test)

| Metric | DS1 Validation Benchmark (6 Records, 12,918 Beats) | DS2 Held-Out Test Benchmark (22 Records, 49,639 Beats) | Generalization Gap ($\Delta$) | Relative Change (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Overall Accuracy** | **0.9668** (96.68%) | **0.9093** (90.93%) | **-0.0575** | **-5.95%** |
| **Balanced Accuracy** | **0.7079** (70.79%) | **0.7000** (70.00%) | **-0.0079** | **-1.12%** |
| **Macro Precision** | **0.7166** (71.66%) | **0.6348** (63.48%) | **-0.0818** | **-11.42%** |
| **Macro Recall** | **0.7079** (70.79%) | **0.7000** (70.00%) | **-0.0079** | **-1.12%** |
| **Macro F1 Score** | **0.7095** | **0.6403** | **-0.0692** | **-9.75%** |
| **Weighted F1 Score** | **0.9664** (96.64%) | **0.9174** (91.74%) | **-0.0490** | **-5.07%** |
| **Multi-Class ROC-AUC (OvR)** | **0.9782** | **0.9425** | **-0.0357** | **-3.65%** |
| **Multi-Class PR-AUC (OvR)** | **0.7321** | **0.6280** | **-0.1041** | **-14.22%** |

---

## 4. Per-Class Diagnostic Performance on DS2 Held-Out Test (49,639 Beats)

| Class Symbol | AAMI EC57 Diagnostic Category | Precision (%) | Recall (%) | F1-Score | True Support | Pre-Evaluation Prevalence |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **`N`** | Normal Sinus / Bundle Branch Blocks | **97.71%** | **92.42%** | **0.9499** | 44,197 | 89.04% |
| **`S`** | Supraventricular Ectopic Beats | **38.45%** | **75.64%** | **0.5098** | 1,835 | 3.70% |
| **`V`** | Ventricular Ectopic Beats | **69.75%** | **87.20%** | **0.7750** | 3,220 | 6.49% |
| **`F`** | Ventricular Fusion Beats | **48.00%** | **24.74%** | **0.3265** | 388 | 0.78% |
| **Macro** | **Unweighted Metric Average** | **63.48%** | **70.00%** | **0.6403** | **49,639** | **100.00%** |

---

## 5. Frozen 4x4 Confusion Matrix (DS2 Benchmark)

$$\mathbf{C}_{\text{DS2}} = \begin{bmatrix}
40845 & 2154 & 1126 & 72 \\
382 & 1388 & 58 & 7 \\
334 & 52 & 2808 & 26 \\
242 & 16 & 34 & 96
\end{bmatrix}$$

- **Correct Classifications:** $40,845 + 1,388 + 2,808 + 96 = \mathbf{45,137}$ beats (**90.93%**)
- **Total Misclassifications:** $\mathbf{4,502}$ beats (**9.07%**)
