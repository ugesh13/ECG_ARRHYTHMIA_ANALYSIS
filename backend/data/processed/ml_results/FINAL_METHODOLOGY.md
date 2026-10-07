# RESEARCH METHODOLOGY: ANSI/AAMI EC57 ECG BEAT CLASSIFICATION

**Standard Protocol Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Evaluated Architecture:** Tuned & Frozen Random Forest Ensemble ($D = 209$)  
**Target Benchmark:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`)  
**Scope:** Offline / Retrospective Heartbeat Classification  

---

### 3.1 Dataset

The experimental evaluation utilizes the PhysioNet MIT-BIH Arrhythmia Database (`mitdb`) [7], a widely accepted benchmark standard in computational cardiology. The database consists of 48 ambulatory two-channel electrocardiographic recordings obtained from 47 individual subjects (recordings 201 and 202 originate from the same subject). Each recording has a continuous duration of approximately 30 minutes (650,000 samples per channel) digitized at a sampling frequency of $f_s = 360.0$ Hz with an 11-bit resolution over a dynamic range of $\pm 10$ mV. Reference heartbeat annotations were established through independent verification by at least two certified cardiologists.

---

### 3.2 Record Selection & Channel Prioritization

In accordance with ANSI/AAMI EC57 guidelines and established benchmark conventions [6], cardiac pacemakers introduce severe electrical pacing stimuli artifacts that alter intrinsic myocardial depolarization. Consequently, the 4 paced recordings in the database (records `102`, `104`, `107`, and `217`, comprising 8,757 total heartbeats and 8,027 paced complexes) were strictly isolated into a separate secondary cohort and excluded from all model training, validation, and test evaluation.

The remaining **44 non-paced recordings** constitute the primary experimental cohort (100,689 total beats). For each recording, the primary signal channel was selected according to a strict priority hierarchy: Modified Limb Lead II (MLII) was preferred ($N=40$ records), with fallback to Modified Lead V5 ($N=2$, records `114` and `124`), V1 ($N=1$), V2, or V4 where MLII was unavailable.

---

### 3.3 AAMI Label Mapping

Reference annotations were mapped to the standard ANSI/AAMI EC57 four-class taxonomy:
- **Class `N` (Non-Ectopic / Normal Sinus & Conduction Delays):** Normal sinus beat (`N`), Left bundle branch block (`L`), Right bundle branch block (`R`), Atrial escape (`e`), Nodal escape (`j`).
- **Class `S` (Supraventricular Ectopic Beats):** Atrial premature beat (`A`), Aberrated atrial premature beat (`a`), Nodal premature beat (`J`), Supraventricular premature beat (`S`).
- **Class `V` (Ventricular Ectopic Beats):** Premature ventricular contraction (`V`), Ventricular escape (`E`).
- **Class `F` (Fusion Beats):** Ventricular fusion beats (`F`).

Beats labeled as unclassifiable or pacing artifacts (`/`, `f`, `Q`), totaling 15 beats across the 44 primary recordings, were preserved in metadata but excluded from the 4-class classification target, resulting in **100,674 usable raw benchmark beats**.

---

### 3.4 Beat Extraction

Heartbeat segmentation was executed using reference R-peak annotation timestamps ($t_R$). For each cardiac cycle, an asymmetric segmentation window of **200 samples** ($555.56$ ms at 360 Hz) was extracted around the reference marker:
- **Pre-R interval:** 90 samples ($250.0$ ms) capturing the P-wave and PR segment.
- **Post-R interval:** 110 samples ($305.56$ ms) capturing the QRS complex, J-point, ST segment, and T-wave.

---

### 3.5 ECG Preprocessing

Raw analog ECG recordings are vulnerable to low-frequency baseline drift caused by respiration and patient motion. Baseline wander removal was implemented using a linear moving-average filter:
1. A temporal window of $W = 217$ samples ($\approx 602.8$ ms at 360 Hz) was applied across the continuous recording.
2. Signal boundaries were padded with symmetric reflection padding of length $W // 2 = 108$ samples to eliminate edge attenuation.
3. The estimated low-frequency baseline was subtracted from the raw lead signal: $x_{\text{filtered}}(t) = x_{\text{raw}}(t) - \bar{x}_W(t)$.

---

### 3.6 Morphology Representation ($D = 200$)

To render morphology features invariant to inter-subject skin-electrode impedance and amplifier gain variations while preserving intra-beat waveform shape, each extracted 200-sample segment was normalized using local per-beat z-score standardization:

$$z_i = \frac{x_i - \mu_{\text{beat}}}{\sigma_{\text{beat}} + \epsilon}, \quad i \in [0, 199]$$

where $\mu_{\text{beat}}$ and $\sigma_{\text{beat}}$ denote the sample mean and standard deviation of the individual 200-point segment, and $\epsilon = 10^{-8}$ prevents numerical division instability.

---

### 3.7 RR Feature Engineering ($D = 9$)

Cardiac arrhythmias alter not only waveform morphology but also cardiac cycle timing. Heartbeat timing features were computed from consecutive valid heartbeat annotation timestamps:

1. `RR_prev`: Time interval from the preceding valid beat to the current beat ($s$).
2. `HR_prev`: Preceding instantaneous heart rate ($60.0 / RR_{\text{prev}}$ bpm).
3. `RR_local_median`: Running median of strictly prior valid intervals within the recording (up to $W=10$ prior beats; minimum history initialized to 1 beat).
4. `RR_ratio_prev`: Preceding prematurity coupling ratio ($RR_{\text{prev}} / RR_{\text{local\_median}}$).
5. `RR_dev_prev`: Fractional deviation from the running median ($(RR_{\text{prev}} - \text{median}) / \text{median}$).
6. `RR_next`: Time interval from the current beat to the subsequent valid beat ($s$).
7. `HR_next`: Succeeding instantaneous heart rate ($60.0 / RR_{\text{next}}$ bpm).
8. `RR_ratio_bidi`: Bidirectional interval coupling ratio ($RR_{\text{prev}} / RR_{\text{next}}$).
9. `RR_bidi_diff`: Interval asymmetry difference ($RR_{\text{next}} - RR_{\text{prev}}$ in seconds).

> [!IMPORTANT]
> **Retrospective / Offline Scope:** Because features 6 through 9 (`RR_next`, `HR_next`, `RR_ratio_bidi`, `RR_bidi_diff`) incorporate prospective interval timing from the subsequent cardiac cycle, this feature representation is designated strictly for **retrospective and offline analysis** (e.g., 24-hour ambulatory Holter review). It is not formulated as a causal real-time streaming detector.

---

### 3.8 Boundary Beat Exclusion Policy

Computing bidirectional intervals requires both a preceding beat ($t_{i-1}$) and a subsequent beat ($t_{i+1}$). Consequently, boundary heartbeats lacking complete temporal context (Beat 0 and Beat $N-1$ in each recording) were excluded from temporal modeling. Across the 44 primary recordings, this accounts for exactly 88 excluded edge beats (all belonging to Class `N`), yielding **100,586 usable bidirectional beats**.

---

### 3.9 Record-Level Data Partitioning (Inter-Patient Split)

To strictly prevent data leakage and guarantee that models are evaluated on unseen human subjects, the 44 records were partitioned at the patient level following the canonical de Chazal et al. (2004) split [5]:

- **Training Partition (DS1 — 16 Records):** `101, 106, 109, 112, 115, 116, 119, 122, 124, 203, 205, 207, 208, 215, 223, 230` (38,029 usable bidirectional beats; $N=33,882; S=227; V=3,513; F=407$).
- **Validation Partition (DS1 — 6 Records):** `108, 114, 118, 201, 209, 220` (12,918 usable bidirectional beats; $N=11,919; S=716; V=275; F=8$).
- **Held-Out Test Partition (DS2 — 22 Records):** `100, 103, 105, 111, 113, 117, 121, 123, 200, 202, 210, 212, 213, 214, 219, 221, 222, 228, 231, 232, 233, 234` (49,639 usable bidirectional beats; $N=44,197; S=1,835; V=3,220; F=388$).

---

### 3.10 Baseline Classifiers

In Phase 5, three classical machine-learning models were evaluated on morphology-only inputs ($D=200$):
1. **L2-Regularized Logistic Regression:** Scaled via training-fitted `StandardScaler`, optimized with L-BFGS.
2. **Random Forest Classifier:** Tree ensemble with 100 unconstrained trees.
3. **Histogram-Based Gradient Boosting:** Scaled gradient boosting on discretized binned features.

To counter severe class imbalance without synthetic sampling (e.g. SMOTE), all models utilized inverse-frequency class weights computed strictly from training partition frequencies:

$$w_c = \frac{N_{\text{train}}}{K \cdot N_{c, \text{train}}}, \quad c \in \{N, S, V, F\}$$

---

### 3.11 Temporal Feature Experiment (Phase 6)

Phase 6 systematically tested the hypothesis that cardiac timing resolves the morphological overlap between Supraventricular ectopic beats (`S`) and Normal beats (`N`). Two feature sets were evaluated across matched validation cohorts:
- **Variant A (Causal Timing, $D=205$):** 200 morphology + 5 retrospective RR features (`RR_prev`, `HR_prev`, `RR_local_median`, `RR_ratio_prev`, `RR_dev_prev`).
- **Variant B (Bidirectional Timing, $D=209$):** 200 morphology + 9 bidirectional RR features.

---

### 3.12 Hyperparameter Optimization (Phase 7)

Hyperparameter optimization was conducted strictly within the 16-record training partition using **4-fold record-grouped cross-validation** (`GroupKFold` grouped by patient record ID) to prevent intra-subject leakage across folds. Optimization maximized Macro F1. Grid search explored tree depth ($d \in [10, 20, 30, \text{None}]$), split thresholds ($s \in [2, 5, 10]$), leaf requirements ($l \in [1, 2, 4]$), and ensemble size ($n \in [100, 200, 300]$).

---

### 3.13 Final Model Configuration

The finalized, frozen model selected from cross-validation and DS1 validation is:
- **Estimator:** `RandomForestClassifier` (scikit-learn)
- **Hyperparameters:** `n_estimators=200, max_depth=30, min_samples_split=5, min_samples_leaf=2, max_features='sqrt', class_weight='balanced', random_state=42, n_jobs=-1`.
- **Feature Vector:** 200 morphology samples + 9 canonical bidirectional RR features ($D=209$).

---

### 3.14 Evaluation Metrics

Due to extreme class imbalance ($N > 89\%$), overall classification accuracy is dominated by normal sinus rhythm. Consequently, performance is evaluated primarily via class-balanced and macro-averaged metrics:
- **Balanced Accuracy:** $\frac{1}{K} \sum_{c=1}^K \text{Recall}_c$ (unweighted mean class sensitivity) [14].
- **Macro Precision:** $\frac{1}{K} \sum_{c=1}^K \text{Precision}_c$.
- **Macro Recall:** $\frac{1}{K} \sum_{c=1}^K \text{Recall}_c$.
- **Macro F1 Score:** $\frac{1}{K} \sum_{c=1}^K \text{F1}_c$ (primary optimization and ranking criterion).
- **Weighted F1 Score:** $\sum_{c=1}^K \frac{N_c}{N_{\text{total}}} \text{F1}_c$.
- **Macro Multi-Class ROC-AUC (OvR)** and **Macro Multi-Class PR-AUC (OvR)**.

---

### 3.15 Final DS2 Evaluation Protocol

Phase 8 performed a single, independent evaluation of the permanently frozen model on the 22 held-out DS2 test recordings. No parameter adjustments, threshold tuning, or model re-selection were permitted following test set evaluation.
