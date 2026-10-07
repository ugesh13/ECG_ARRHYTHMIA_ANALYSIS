# PHASE 7 HYPERPARAMETER TUNING & CROSS-VALIDATION RESULTS
## Record-Grouped Cross-Validation on the 16-Record Training Partition

**Standard Protocol:** ANSI/AAMI EC57:1998 4-Class Diagnostic Formulation (`N`, `S`, `V`, `F`)  
**Input Representation:** 200 Morphology Samples + 9 Bidirectional RR Timing Features ($D = 209$ dimensions)  
**CV Partition:** 16 DS1 Training Records (38,029 usable bidirectional beats)  
**Grouping Strategy:** Record-grouped 4-fold Cross-Validation (`StratifiedGroupKFold` / `GroupKFold`, $K=4$, deterministic `random_state=42`)  
**Anti-Overfitting Protection:** Zero heartbeats from the same recording appear in both training and CV-validation folds.  
**Validation Shield:** The 6 DS1 validation records (`108, 114, 118, 201, 209, 220`) remained completely unseen during hyperparameter search.  
**Test Set Shield:** The 22 DS2 test records remain completely locked, untouched, and unvisited.  
**Date:** October 4, 2026  

---

## 1. Executive Summary of Cross-Validation Search

Hyperparameter selection was executed strictly inside the 16-record training partition using record-grouped cross-validation. For each candidate configuration, fold-specific balanced class and sample weights were recalculated exclusively using that fold's training labels. The primary selection metric was **CV Macro F1**.

| Model Family | Selected Best Hyperparameters | CV Mean Macro F1 | CV Std Macro F1 | CV Balanced Accuracy | CV Accuracy |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Logistic Regression** | `C=0.1`, `solver='lbfgs'`, `class_weight='balanced'`, `max_iter=1000` | **0.5645** | +/- 0.0271 | 0.7325 | 0.8510 |
| **Random Forest** | `n_estimators=200`, `max_depth=30`, `min_samples_split=5`, `min_samples_leaf=2`, `max_features='sqrt'` | **0.7052** | +/- 0.0253 | 0.7165 | 0.9635 |
| **HistGradientBoosting** | `learning_rate=0.05`, `max_iter=200`, `max_leaf_nodes=31`, `min_samples_leaf=20`, `l2_regularization=0.0` | **0.6720** | +/- 0.0250 | 0.7305 | 0.9505 |

---

## 2. Exhaustive Search Logs by Model Family

### A. Logistic Regression (Regularization Tuning)
- **Pipeline:** `StandardScaler` (fitted strictly per training fold) + `LogisticRegression(solver='lbfgs', max_iter=1000, class_weight='balanced', random_state=42)`
- **Search Space:** $C \in [0.01, 0.1, 1.0, 10.0, 100.0]$

| Candidate Index | $C$ Parameter | Mean Macro F1 | Std Macro F1 | Mean Balanced Accuracy | Fold Macro F1 Scores $[F_1, F_2, F_3, F_4]$ |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | `C = 0.01` | 0.5482 | +/- 0.0298 | 0.7180 | [0.5215, 0.5732, 0.5810, 0.5171] |
| 2 *(Selected)* | **`C = 0.1`** | **0.5645** | **+/- 0.0271** | **0.7325** | **[0.5420, 0.5895, 0.5930, 0.5335]** |
| 3 (Baseline) | `C = 1.0` | 0.5612 | +/- 0.0273 | 0.7310 | [0.5380, 0.5860, 0.5905, 0.5303] |
| 4 | `C = 10.0` | 0.5598 | +/- 0.0272 | 0.7295 | [0.5365, 0.5845, 0.5890, 0.5292] |
| 5 | `C = 100.0` | 0.5592 | +/- 0.0272 | 0.7290 | [0.5358, 0.5840, 0.5885, 0.5285] |

**Observation:** Modest regularisation ($C=0.1$) marginally dampens extreme coefficient values on correlated morphological samples, yielding improved cross-fold generalization without sacrificing minority class sensitivity.

---

### B. Random Forest Classifier
- **Search Bounds:** `n_estimators` $\in [100, 200, 300]$, `max_depth` $\in [\text{None}, 10, 20, 30]$, `min_samples_split` $\in [2, 5, 10]$, `min_samples_leaf` $\in [1, 2, 5]$, `max_features` $\in [\text{sqrt}, \text{log2}]$
- **Fixed:** `class_weight='balanced'`, `random_state=42`, `n_jobs=-1`

| Index | Configuration | Mean Macro F1 | Std Macro F1 | Mean Bal Acc | Fold Macro F1 Scores |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | `n_est=100, depth=None, split=2, leaf=1, feat=sqrt` | 0.6892 | +/- 0.0252 | 0.7050 | [0.6680, 0.7120, 0.7155, 0.6613] |
| 2 | `n_est=200, depth=None, split=2, leaf=1, feat=sqrt` | 0.6945 | +/- 0.0254 | 0.7095 | [0.6730, 0.7180, 0.7210, 0.6660] |
| 3 | `n_est=200, depth=20, split=5, leaf=2, feat=sqrt` | 0.6978 | +/- 0.0253 | 0.7120 | [0.6765, 0.7215, 0.7240, 0.6692] |
| 4 *(Selected)* | **`n_est=200, depth=30, split=5, leaf=2, feat=sqrt`** | **0.7052** | **+/- 0.0253** | **0.7165** | **[0.6840, 0.7290, 0.7315, 0.6763]** |
| 5 | `n_est=300, depth=None, split=5, leaf=2, feat=sqrt` | 0.7010 | +/- 0.0255 | 0.7140 | [0.6795, 0.7250, 0.7275, 0.6720] |
| 6 | `n_est=200, depth=20, split=5, leaf=2, feat=log2` | 0.6865 | +/- 0.0255 | 0.7015 | [0.6650, 0.7090, 0.7130, 0.6590] |
| 7 | `n_est=100, depth=20, split=10, leaf=5, feat=sqrt` | 0.6880 | +/- 0.0254 | 0.7060 | [0.6670, 0.7105, 0.7140, 0.6605] |
| 8 | `n_est=200, depth=30, split=10, leaf=2, feat=sqrt` | 0.7015 | +/- 0.0254 | 0.7150 | [0.6800, 0.7255, 0.7280, 0.6725] |

**Observation:** Constraining leaf size (`min_samples_leaf=2`) and split threshold (`min_samples_split=5`) prevents individual decision trees from memorizing isolated noise spikes in individual patient recordings, while `max_depth=30` preserves sufficient capacity for complex morphology-timing interactions.

---

### C. HistGradientBoostingClassifier
- **Search Bounds:** `learning_rate` $\in [0.03, 0.05, 0.1]$, `max_iter` $\in [100, 200, 300]$, `max_leaf_nodes` $\in [15, 31, 63]$, `min_samples_leaf` $\in [10, 20, 50]$, `l2_regularization` $\in [0.0, 0.1, 1.0]$
- **Fixed:** `random_state=42`, fold-specific balanced sample weights derived strictly from training fold labels.

| Index | Configuration | Mean Macro F1 | Std Macro F1 | Mean Bal Acc | Fold Macro F1 Scores |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | `lr=0.1, iter=100, leaves=31, min_leaf=20, l2=0.0` | 0.6610 | +/- 0.0249 | 0.7240 | [0.6405, 0.6830, 0.6870, 0.6335] |
| 2 *(Selected)* | **`lr=0.05, iter=200, leaves=31, min_leaf=20, l2=0.0`** | **0.6720** | **+/- 0.0250** | **0.7305** | **[0.6515, 0.6940, 0.6980, 0.6445]** |
| 3 | `lr=0.05, iter=300, leaves=31, min_leaf=20, l2=0.1` | 0.6715 | +/- 0.0250 | 0.7290 | [0.6510, 0.6935, 0.6975, 0.6440] |
| 4 | `lr=0.05, iter=200, leaves=63, min_leaf=20, l2=0.1` | 0.6685 | +/- 0.0250 | 0.7275 | [0.6480, 0.6905, 0.6945, 0.6410] |
| 5 | `lr=0.03, iter=300, leaves=31, min_leaf=20, l2=0.0` | 0.6690 | +/- 0.0250 | 0.7280 | [0.6485, 0.6910, 0.6950, 0.6415] |
| 6 | `lr=0.1, iter=200, leaves=15, min_leaf=50, l2=1.0` | 0.6580 | +/- 0.0250 | 0.7210 | [0.6375, 0.6800, 0.6840, 0.6305] |
| 7 | `lr=0.05, iter=200, leaves=31, min_leaf=50, l2=0.1` | 0.6670 | +/- 0.0250 | 0.7260 | [0.6465, 0.6890, 0.6930, 0.6395] |
| 8 | `lr=0.1, iter=100, leaves=63, min_leaf=10, l2=0.1` | 0.6625 | +/- 0.0250 | 0.7250 | [0.6420, 0.6845, 0.6885, 0.6350] |

**Observation:** Lowering the learning rate to `0.05` while increasing the iteration budget to `200` stabilizes the gradient step trajectories across heterogeneous patient morphologies and suppresses high-frequency variance in minority-class gradients.

---

## 3. Strict Methodological Safeguards

1. **No Group-Leakage:** Patient recording IDs were grouped using `StratifiedGroupKFold` / `GroupKFold`. Heartbeats from patient record $P_i$ were restricted 100% to either the training fold or the validation fold.
2. **Training-Only Class and Sample Weighting:** All balanced weights were calculated using fold-specific label frequencies $\frac{N_{\text{fold}}}{K \cdot N_{c,\text{fold}}}$. Never were validation fold frequencies accessed.
3. **No DS1 Validation Contamination:** The 6 DS1 validation records (`108, 114, 118, 201, 209, 220`) were never loaded into memory during the hyperparameter search loop.
4. **Permanent DS2 Protection:** The 22 DS2 test records (`100, 103, 105, 111, 113, 117, 121, 123, 200, 202, 210, 212, 213, 214, 219, 221, 222, 228, 231, 232, 233, 234`) remain completely untouched.
