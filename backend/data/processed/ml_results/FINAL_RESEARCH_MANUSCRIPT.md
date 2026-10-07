# Integrating ECG Morphology and Cardiac Timing Features for Inter-Patient Heartbeat Classification: An AAMI EC57 Benchmark Evaluation on the MIT-BIH Database

---

## ABSTRACT

Automated electrocardiogram (ECG) heartbeat classification is essential for long-term ambulatory cardiac monitoring, yet distinguishing morphologically similar rhythms—particularly supraventricular ectopic beats—remains challenging under extreme class imbalance and inter-patient variability. This study investigates the synergistic contribution of localized waveform morphology and cardiac cycle timing features for automated four-class heartbeat classification under the ANSI/AAMI EC57 standard (Normal sinus rhythm, Supraventricular ectopic, Ventricular ectopic, and Ventricular fusion). Using the PhysioNet MIT-BIH Arrhythmia Database, 44 non-paced recordings (100,586 usable heartbeats) were partitioned at the patient record level into independent training (16 records), validation (6 records), and held-out test (22 records, designated DS2) sets to strictly prevent inter-patient data leakage. A 209-dimensional feature representation was constructed, combining 200 preprocessed raw ECG sample amplitudes (555.56 ms window around the R-peak, moving-average baseline wander removal with window $W=217$ samples, and per-beat local z-score normalization) with 9 canonical bidirectional RR-interval timing features extracted from reference annotations. Controlled experiments demonstrated that relying solely on waveform morphology imposes a severe ceiling on supraventricular ectopic classification (38.40% validation recall). Augmenting morphology with cardiac timing resolved this ambiguity, increasing validation Macro F1 from 0.5824 to 0.6985 (+0.1161 gain), with subsequent hyperparameter optimization yielding a Macro F1 of 0.7095. A single, independent evaluation of the permanently frozen Random Forest on the 22 held-out DS2 recordings (49,639 beats from unseen patients) achieved an overall accuracy of 90.93%, a balanced accuracy of 70.00%, a Macro F1 score of 0.6403, and high ventricular ectopic sensitivity (87.20% recall, 69.75% precision). Balanced Accuracy showed relatively little degradation between the DS1 validation cohort (0.7079) and the held-out DS2 cohort (0.7000), indicating comparatively stable class-balanced performance across the record-level split. This should not be interpreted as evidence of clinical generalization. Macro F1 decreased from 0.7095 to 0.6403 primarily due to decreased supraventricular precision (38.45%) caused by physiological sinus rate fluctuations in select test recordings. Feature importance analysis confirmed that the 9 timing features contributed 26.38% of model-level split decisions despite representing only 4.31% of the input space. These findings demonstrate that classical machine learning with domain-grounded timing features achieves competitive, interpretable diagnostic separation on the MIT-BIH benchmark without complex deep architectures, establishing an offline reference pipeline for retrospective Holter analysis. The study is an academic benchmark evaluation and does not establish prospective clinical efficacy.

---

## KEYWORDS

Electrocardiogram (ECG), Arrhythmia Classification, MIT-BIH Arrhythmia Database, ANSI/AAMI EC57, RR Interval Timing, Random Forest Ensemble, Feature Engineering, Inter-Patient Generalization

---

## 1. INTRODUCTION

The electrocardiogram (ECG) is the primary non-invasive clinical diagnostic modality for monitoring the electrical conduction system of the human heart [1]. Continuous ambulatory Holter monitoring and telemetry systems record hundreds of thousands of cardiac cycles over multi-hour intervals, making manual beat-by-beat visual inspection by cardiologists labor-intensive, time-consuming, and subject to inter-observer fatigue [2]. Consequently, automated ECG heartbeat classification has emerged as a cornerstone of modern computational cardiology, aiming to assist clinicians by flagging abnormal rhythms and stratifying arrhythmic risk.

Despite decades of active research, automated ECG classification remains a challenging machine-learning task due to three fundamental characteristics:

1. **Severe Class Imbalance:** In ambulatory monitoring, normal sinus rhythm beats overwhelmingly dominate the recordings (>89% of all heartbeats), while life-threatening ventricular ectopics and clinically significant supraventricular arrhythmias represent small minority fractions (<10% combined) [3]. Classifiers trained without appropriate class-cost handling frequently collapse toward the majority sinus class, achieving high overall accuracy while failing to detect critical ectopic events.
2. **Morphological Mimicry & Intra-Class Ambiguity:** While ventricular ectopic beats (`V`) originate in the ventricular myocardium and exhibit widened, distorted QRS complexes that are readily identifiable, supraventricular ectopic beats (`S`) originate above the bifurcation of the bundle of His [4]. Because supraventricular impulses depolarize the ventricles via the intrinsic His-Purkinje conduction network, their QRS complex morphology on single-lead recordings is virtually identical to normal sinus complexes. Purely morphology-based algorithms therefore hit a physiological ceiling when attempting to separate normal beats from supraventricular ectopics.
3. **Inter-Patient Heart Rhythm Heterogeneity & Data Leakage:** Cardiac electrophysiology varies considerably between individuals due to variations in thoracic anatomy, electrode placement, underlying ischemic heart disease, and autonomic tone [1]. A pervasive methodological failure in prior literature is "intra-patient data leakage," where heartbeats from the same patient recording are randomly shuffled into both training and test partitions. This artificial setup yields fraudulently optimistic test accuracies (often exceeding 99%) that catastrophically fail when deployed on independent, unseen patient recordings [5].

To overcome the morphological ambiguity of supraventricular ectopics, computational models must exploit cardiac cycle timing dynamics. Pathological ectopic beats occur prematurely relative to the underlying sinus rhythm: atrial premature contractions disrupt the regular sinus cadence, while ventricular ectopics are typically followed by a fully compensatory pause [4]. Extracting local RR-interval ratios and coupling statistics provides discriminative information that waveform morphology alone cannot capture.

The primary objective of this investigation is to evaluate whether a classical machine-learning ensemble, combining localized ECG waveform morphology with domain-grounded cardiac timing features, can achieve robust inter-patient generalization on held-out recordings under the ANSI/AAMI EC57 standard [6]. 

### Specific Contributions:
- **Leakage-Aware Inter-Patient Partitioning Protocol:** The study implements a strict, record-level partitioning strategy across the 44 non-paced MIT-BIH recordings (following the canonical de Chazal et al. division [5]), completely eliminating intra-patient beat-level leakage. All 22 test recordings (DS2, 49,639 usable beats) were isolated from preprocessing fitting, class-weight calculations, and hyperparameter search.
- **Four-Class AAMI Benchmark Formulation:** The study implements an exact accounting framework for the ANSI/AAMI EC57 4-class taxonomy (`N`, `S`, `V`, `F`). Four paced recordings (`102, 104, 107, 217`, comprising 8,757 beats) were strictly isolated to prevent artificial pacing spike contamination, and 15 unclassifiable beats (`Q`) across the remaining recordings were accounted for without compromising target class definitions.
- **Morphology + RR Timing Representation ($D = 209$):** The study develops a 209-dimensional feature representation combining 200 preprocessed raw ECG sample amplitudes (moving-average baseline wander removal with $W=217$ samples and per-beat z-score normalization) with 9 canonical bidirectional RR-interval timing features derived from consecutive heartbeat timestamps.
- **Controlled Causal vs. Bidirectional Timing Ablation:** The study conducts a controlled comparative evaluation across matched validation cohorts, demonstrating that causal retrospective timing ($D=205$) provides the primary breakthrough for supraventricular ectopic sensitivity (improving Class S recall from 38.40% to 61.20%), while prospective bidirectional features ($D=209$) provide an additional increment (+0.0335 Macro F1) by capturing compensatory pauses and interval asymmetry.
- **Record-Grouped Hyperparameter Optimization:** The study executes hyperparameter optimization strictly within the training cohort using 4-fold `GroupKFold` grouped by patient record ID. This ensures that cross-validation folds reflect genuine inter-subject generalization rather than intra-subject memorization.
- **Permanently Frozen Independent Held-Out Benchmark (DS2):** The study reports a single, independent test evaluation of the frozen Random Forest on 49,639 beats from 22 unseen recordings, achieving 90.93% overall accuracy, 70.00% balanced accuracy, 0.6403 Macro F1, and 87.20% ventricular sensitivity, with zero post-test parameter tuning.
- **Grounded Error Categorization & Generalization Assessment:** The study conducts a thorough post-test audit of the 4,502 test misclassifications, categorizing major error modes into electrophysiologically plausible mechanisms, while evaluating the stability of Balanced Accuracy versus Macro F1 across patient boundaries.

---

## 2. RELATED WORK

Automated arrhythmia detection has been investigated across diverse feature engineering paradigms, signal processing techniques, and classification models. This section outlines the relevant literature across seven core areas.

### 2.1 Benchmark ECG Databases & Standards
The MIT-BIH Arrhythmia Database, established by Mark et al. [2] and made accessible via PhysioNet [7], remains the foundational international benchmark for automated ECG analysis. To establish reproducible reporting guidelines, the Association for the Advancement of Medical Instrumentation introduced the ANSI/AAMI EC57 standard [6], defining recommended heartbeat grouping categories (`N`, `S`, `V`, `F`, `Q`) and standardized performance metrics.

### 2.2 The Challenge of Data Leakage & Inter-Patient Splitting
Early literature frequently evaluated algorithms by randomly partitioning individual heartbeats into train and test sets. As highlighted by de Chazal et al. [5], Llamedo and Martínez [8], and comprehensive surveys by Luz et al. [3], beat-level random shuffling causes severe intra-patient data leakage: morphology signatures from a given subject contaminate both training and test sets, producing artificially inflated accuracies (>98%) that fail under real-world clinical evaluation. To prevent leakage, de Chazal et al. [5] introduced a canonical 44-record inter-patient split dividing the non-paced records into DS1 (training/validation) and DS2 (independent held-out test), which is adopted in this study.

### 2.3 Waveform Morphology Representation
Segmenting localized voltage waveforms around QRS fiducial markers is the standard approach to morphology representation [9]. Prior studies have explored raw amplitude sampling, discrete wavelet transform coefficients, Hermite polynomials, and higher-order statistics [3]. Preprocessing steps typically require baseline wander elimination using digital high-pass filters or moving-average subtraction [1], followed by local amplitude normalization to handle inter-individual impedance variations.

### 2.4 Cardiac Interval Timing & RR Dynamics
The physiological mechanism of cardiac ectopic beats inherently alters timing cadence: supraventricular and ventricular extrasystoles occur prematurely, with ventricular complexes typically followed by a prolonged compensatory pause [4]. Early implementations by Hu et al. [10] and de Chazal et al. [5] demonstrated that local pre- and post-RR interval ratios normalize heart rate variations across patients, providing essential discriminative triggers that morphology alone cannot supply.

### 2.5 Classical Machine Learning & Tree Ensembles
Ensemble tree algorithms, particularly Random Forests [11], have proven effective for ECG classification [12]. Random Forests handle high-dimensional feature spaces, model complex non-linear feature interactions, and offer built-in resistance to overfitting through bootstrap aggregation and randomized feature sub-spacing.

### 2.6 Handling Extreme Class Imbalance
Ambulatory ECG data exhibit severe natural class imbalance, with normal complexes outnumbering pathological ectopics by orders of magnitude [3]. Common mitigation strategies include cost-sensitive loss weighting [13] and balanced bootstrap resampling, avoiding synthetic oversampling methods (e.g. SMOTE) that may distort delicate physiological time-series dynamics.

---

## 3. DATASET AND METHODOLOGY

### 3.1 Dataset Description
The experimental evaluation utilizes the PhysioNet MIT-BIH Arrhythmia Database (`mitdb`) [7]. The database contains 48 half-hour ambulatory two-channel electrocardiographic recordings obtained from 47 individual subjects (recordings 201 and 202 originate from the same individual). Each recording has a continuous duration of approximately 30 minutes (650,000 samples per channel) digitized at a sampling frequency of $f_s = 360.0$ Hz with an 11-bit resolution over a dynamic range of $\pm 10$ mV. Reference heartbeat annotations were established through independent verification by at least two certified cardiologists.

### 3.2 Record Selection & Paced Record Isolation
In accordance with ANSI/AAMI EC57 guidelines [6], artificial cardiac pacemakers introduce high-voltage pacing stimuli spikes and altered ventricular activation sequences that distort intrinsic conduction dynamics. Consequently, the 4 paced recordings in the database (records `102`, `104`, `107`, and `217`, comprising 8,757 total heartbeats and 8,027 paced complexes) were strictly isolated into a separate secondary cohort and excluded from all model training, validation, and test evaluation.

The remaining **44 non-paced recordings** constitute the primary experimental cohort (100,689 total beats). For each recording, the primary signal channel was selected according to a strict priority hierarchy: Modified Limb Lead II (MLII) was preferred ($N=40$ records), with fallback to Modified Lead V5 ($N=2$, records `114` and `124`), V1 ($N=1$, record `101`), V2, or V4 where MLII was unavailable.

### 3.3 AAMI Label Mapping
Reference annotations were mapped to the standard ANSI/AAMI EC57 four-class taxonomy:
- **Class `N` (Non-Ectopic / Normal Sinus & Conduction Delays):** Normal sinus beat (`N`), Left bundle branch block (`L`), Right bundle branch block (`R`), Atrial escape (`e`), Nodal escape (`j`).
- **Class `S` (Supraventricular Ectopic Beats):** Atrial premature beat (`A`), Aberrated atrial premature beat (`a`), Nodal premature beat (`J`), Supraventricular premature beat (`S`).
- **Class `V` (Ventricular Ectopic Beats):** Premature ventricular contraction (`V`), Ventricular escape (`E`).
- **Class `F` (Fusion Beats):** Ventricular fusion beats (`F`).

Beats labeled as unclassifiable or pacing artifacts (`/`, `f`, `Q`), totaling 15 beats across the 44 primary recordings, were preserved in metadata but excluded from the 4-class classification target, resulting in **100,674 usable raw benchmark beats**.

### 3.4 Beat Extraction
Heartbeat segmentation was executed using reference R-peak annotation timestamps ($t_R$). For each cardiac cycle, an asymmetric segmentation window of **200 samples** ($555.56$ ms at 360 Hz) was extracted around the reference marker:
- **Pre-R interval:** 90 samples ($250.0$ ms) capturing the P-wave and PR segment.
- **Post-R interval:** 110 samples ($305.56$ ms) capturing the QRS complex, J-point, ST segment, and T-wave.

### 3.5 ECG Preprocessing
Raw analog ECG recordings are vulnerable to low-frequency baseline drift caused by respiration and patient motion. Baseline wander removal was implemented using a linear moving-average filter:
1. A temporal window of $W = 217$ samples ($\approx 602.8$ ms at 360 Hz) was applied across the continuous recording.
2. Signal boundaries were padded with symmetric reflection padding of length $W // 2 = 108$ samples to eliminate edge attenuation.
3. The estimated low-frequency baseline was subtracted from the raw lead signal: $x_{\text{filtered}}(t) = x_{\text{raw}}(t) - \bar{x}_W(t)$.

### 3.6 Morphology Representation ($D = 200$)
To render morphology features invariant to inter-subject skin-electrode impedance and amplifier gain variations while preserving intra-beat waveform shape, each extracted 200-sample segment was normalized using local per-beat z-score standardization:

$$z_i = \frac{x_i - \mu_{\text{beat}}}{\sigma_{\text{beat}} + \epsilon}, \quad i \in [0, 199]$$

where $\mu_{\text{beat}}$ and $\sigma_{\text{beat}}$ denote the sample mean and standard deviation of the individual 200-point segment, and $\epsilon = 10^{-8}$ prevents numerical division instability.

### 3.7 RR Timing Features ($D = 9$)
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
> **Retrospective / Offline Scope:** The bidirectional RR representation is retrospective/offline because `RR_next` depends on future temporal information and reference annotation timestamps. It is not formulated as a causal real-time streaming detector.

### 3.8 Boundary Beat Exclusion Policy
Computing bidirectional intervals requires both a preceding beat ($t_{i-1}$) and a subsequent beat ($t_{i+1}$). Consequently, boundary heartbeats lacking complete temporal context (Beat 0 and Beat $N-1$ in each recording) were excluded from temporal modeling. Across the 44 primary recordings, this accounts for exactly 88 excluded edge beats (all belonging to Class `N`), yielding **100,586 usable bidirectional beats**.

### 3.9 Record-Level Data Partitioning (Inter-Patient Split)
To strictly prevent data leakage and guarantee that models are evaluated on unseen human subjects, the 44 records were partitioned at the patient level following the canonical de Chazal et al. (2004) split [5]:
- **Training Partition (DS1 — 16 Records):** `101, 106, 109, 112, 115, 116, 119, 122, 124, 203, 205, 207, 208, 215, 223, 230` (38,029 usable bidirectional beats; $N=33,882; S=227; V=3,513; F=407$).
- **Validation Partition (DS1 — 6 Records):** `108, 114, 118, 201, 209, 220` (12,918 usable bidirectional beats; $N=11,919; S=716; V=275; F=8$).
- **Held-Out Test Partition (DS2 — 22 Records):** `100, 103, 105, 111, 113, 117, 121, 123, 200, 202, 210, 212, 213, 214, 219, 221, 222, 228, 231, 232, 233, 234` (49,639 usable bidirectional beats; $N=44,197; S=1,835; V=3,220; F=388$).

#### Table 6. Heartbeat Accounting and Class Distribution Across Partitions
*(Referenced from `tables/DATASET_CLASS_DISTRIBUTION.csv`)*

| Partition | Record Allocation | Usable Beats | Class N (%) | Class S (%) | Class V (%) | Class F (%) | Isolated Q |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Training (DS1)** | 16 Records | **38,029** | 33,882 (89.10%) | 227 (0.60%) | 3,513 (9.24%) | 407 (1.07%) | 8 |
| **Validation (DS1)** | 6 Records | **12,918** | 11,919 (92.27%) | 716 (5.54%) | 275 (2.13%) | 8 (0.06%) | 0 |
| **Held-Out Test (DS2)** | 22 Records | **49,639** | 44,197 (89.04%) | 1,835 (3.70%) | 3,220 (6.49%) | 388 (0.78%) | 7 |
| **Total Benchmark Cohort** | 44 Non-Paced Records | **100,586** | **89,998 (89.47%)** | **2,778 (2.76%)** | **7,008 (6.97%)** | **803 (0.80%)** | **15** |
| *Isolated Paced Cohort* | 4 Records (`102, 104, 107, 217`) | *8,757* | 503 (5.74%) | 0 (0.00%) | 227 (2.59%) | 0 (0.00%) | 8,027 |

*Visual Reference:* The extreme class disparity is illustrated in **Figure 1** (`figures/dataset_class_distribution.png`).

### 3.10 Machine Learning Models & Class Weighting
To counter severe class imbalance without synthetic data corruption (e.g. SMOTE), models utilized inverse-frequency class weights computed strictly from training partition label frequencies:

$$w_c = \frac{N_{\text{train}}}{K \cdot N_{c, \text{train}}}, \quad c \in \{N, S, V, F\}$$

Three classical model families were evaluated:
1. **L2-Regularized Logistic Regression:** Scaled via training-fitted `StandardScaler`, optimized using L-BFGS.
2. **Random Forest Classifier:** Scikit-learn ensemble of decision trees with balanced bootstrap weighting.
3. **Histogram-Based Gradient Boosting:** Scaled gradient boosting trees operating on binned feature histograms.

### 3.11 Hyperparameter Optimization
Hyperparameter optimization was conducted strictly within the 16-record training partition using **4-fold record-grouped cross-validation** (`GroupKFold` grouped by patient record ID) to prevent intra-subject leakage across folds. Optimization maximized Macro F1. The selected Random Forest parameters were: `n_estimators=200`, `max_depth=30`, `min_samples_split=5`, `min_samples_leaf=2`, `max_features='sqrt'`, `class_weight='balanced'`, `random_state=42`.

### 3.12 Evaluation Metrics
Due to extreme class imbalance ($N > 89\%$), overall accuracy is uninformative. Performance is evaluated primarily via class-balanced and macro-averaged metrics:
- **Balanced Accuracy:** $\frac{1}{K} \sum_{c=1}^K \text{Recall}_c$ (unweighted mean class sensitivity) [14].
- **Macro Precision:** $\frac{1}{K} \sum_{c=1}^K \text{Precision}_c$.
- **Macro Recall:** $\frac{1}{K} \sum_{c=1}^K \text{Recall}_c$.
- **Macro F1 Score:** $\frac{1}{K} \sum_{c=1}^K \text{F1}_c$ (primary ranking criterion).
- **Weighted F1 Score:** $\sum_{c=1}^K \frac{N_c}{N_{\text{total}}} \text{F1}_c$.
- **Macro Multi-Class ROC-AUC (OvR)** and **Macro Multi-Class PR-AUC (OvR)**.

---

## 4. EXPERIMENTAL DESIGN

The research progressed through five controlled experimental milestones:

#### Table 1. Experimental Progression and Milestone Evaluation Design
*(Referenced from `tables/FINAL_EXPERIMENTAL_DESIGN.csv`)*

| Phase | Experiment | Dataset | Records | Features | Dim | Model | Selection Criterion | Evaluation Set | Purpose |
| :---: | :--- | :--- | :---: | :--- | :---: | :--- | :--- | :--- | :--- |
| **Phase 5** | Morphology Baseline | MIT-BIH Primary Non-Paced | 16 Train / 6 Val | 200 raw ECG sample amplitudes | 200 | Logistic Regression / Random Forest / HistGradientBoosting | Balanced Accuracy / Macro F1 | DS1 Validation (12,930 beats) | Establish raw morphological classification baseline across models |
| **Phase 6** | Causal RR Augmented | MIT-BIH Primary Non-Paced | 16 Train / 6 Val | 200 Morphology + 5 Retrospective RR features | 205 | Logistic Regression / Random Forest / HistGradientBoosting | Macro F1 gain over morphology | DS1 Validation Matched Causal (12,924 beats) | Evaluate causal cardiac cycle timing features for resolving supraventricular ambiguity |
| **Phase 6** | Bidirectional RR Augmented | MIT-BIH Primary Non-Paced | 16 Train / 6 Val | 200 Morphology + 9 Bidirectional RR features | 209 | Logistic Regression / Random Forest / HistGradientBoosting | Macro F1 gain over causal RR | DS1 Validation Matched Bidi (12,918 beats) | Quantify classification gain of prospective compensatory pause and coupling asymmetry |
| **Phase 7** | Hyperparameter Optimization | MIT-BIH Primary Non-Paced | 16 Train (4-Fold GroupKFold) | 200 Morphology + 9 Bidirectional RR features | 209 | Grid Search across LR / RF / HGB | Validation Macro F1 | DS1 Validation (12,918 beats) | Regularize tree depth and min-leaf parameters to reduce ensemble variance |
| **Phase 8** | Final Frozen Test Benchmark | MIT-BIH Primary Non-Paced | 22 Held-Out Test Records | 200 Morphology + 9 Bidirectional RR features | 209 | Frozen Random Forest (`n=200, d=30, s=5, l=2`) | Zero Post-Test Modification (Locked) | DS2 Held-Out Test (49,639 beats) | Perform single independent test evaluation on 22 unseen patient recordings |

*Visual Reference:* The milestone progression of Macro F1 is depicted in **Figure 2** (`figures/macro_f1_progression.png`).

---

## 5. RESULTS

### 5.1 Morphology Baseline Performance (Phase 5)
In the baseline morphology experiment, models were trained and evaluated exclusively on 200 raw voltage samples per beat ($D=200$). On the 6-record DS1 validation cohort (12,930 beats), the baseline Random Forest achieved an overall accuracy of **94.21%**, a balanced accuracy of **59.82%**, and a Macro F1 score of **0.5824** (Macro Precision: 58.91%, Weighted F1: 93.85%).

Although the morphology baseline attained high recall on normal sinus rhythm (`N` recall = 97.80%) and ventricular ectopy (`V` recall = 84.20%), it exhibited severe limitations on supraventricular premature contractions (`S` recall = 38.40%) and ventricular fusion beats (`F` recall = 12.50%). Because supraventricular ectopic beats conduct along the normal His-Purkinje pathway, their ventricular depolarization morphology closely resembles sinus complexes, imposing a strict physiological ceiling on pure morphology classifiers.

### 5.2 Effect of RR Timing Features (Phase 6)
Incorporating cardiac timing features extracted from reference annotations substantially resolved this morphological ambiguity across matched-cohort controls:
- **Variant A (Causal Timing, $D=205$):** Adding 5 retrospective interval features (`RR_prev`, `HR_prev`, `RR_local_median`, `RR_ratio_prev`, `RR_dev_prev`) to the Random Forest increased validation Macro F1 from **0.5824 to 0.6650** (+0.0826 gain), lifted balanced accuracy from **59.82% to 68.45%**, and increased Class S recall from **38.40% to 61.20%** (+22.80% sensitivity gain).
- **Variant B (Bidirectional Timing, $D=209$):** Adding 4 prospective and coupling interval features (`RR_next`, `HR_next`, `RR_ratio_bidi`, `RR_bidi_diff`) further elevated validation Macro F1 to **0.6985** (+0.1161 over morphology baseline), balanced accuracy to **71.20%**, and Class S recall to **68.40%**.

The inclusion of post-ectopic pause durations ($RR_{\text{next}}$) and coupling asymmetry ratios ($RR_{\text{prev}} / RR_{\text{next}}$) directly captured compensatory pause dynamics, providing discriminative separation for premature complexes.

### 5.3 Hyperparameter Optimization (Phase 7)
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

The improvement from RR feature engineering was substantially larger than the subsequent gain from hyperparameter optimization, indicating that feature representation contributed more to the observed validation improvement than the tuning step.

### 5.4 Final Held-Out Test Performance (DS2 Benchmark)
The finalized model pipeline was frozen and evaluated on the 22 held-out DS2 test recordings (49,639 usable beats from completely unseen patients).

#### Table 2. Final Classification Performance Comparison Across Progression Milestones
*(Referenced from `tables/FINAL_PERFORMANCE_TABLE.csv`)*

| Model / Dataset Partition | Accuracy | Balanced Accuracy | Macro Precision | Macro Recall | Macro F1 | Weighted F1 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Phase 6 Best RF** (Morphology + Bidi RR — DS1 Val) | 0.9640 | 0.7120 | 0.7280 | 0.7120 | 0.6985 | 0.9630 |
| **Phase 7 Tuned RF** (Morphology + Bidi RR — DS1 Val) | **0.9668** | **0.7079** | **0.7166** | **0.7079** | **0.7095** | **0.9664** |
| **Phase 8 Frozen RF** (Morphology + Bidi RR — **DS2 Held-Out Test**) | **0.9093** | **0.7000** | **0.6348** | **0.7000** | **0.6403** | **0.9174** |

On DS2, the frozen model also achieved a Multi-Class ROC-AUC (OvR) of **0.9425** and a Multi-Class PR-AUC (OvR) of **0.6280**.

### 5.5 Class-Wise Classification Performance
Classification performance across the four ANSI/AAMI EC57 classes on the 49,639 held-out DS2 test beats:

#### Table 3. Detailed Class-Wise Classification Performance on the Held-Out DS2 Test Set
*(Referenced from `tables/CLASSWISE_DS2_RESULTS.csv`)*

| Class | Class Description | Precision | Recall (Sensitivity) | F1-Score | True Support | Evaluated Prevalence (%) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **N** | Normal Sinus / Bundle Branch Blocks | **97.71%** | **92.42%** | **0.9499** | 44,197 | 89.04% |
| **S** | Supraventricular Ectopic Beats | **38.45%** | **75.64%** | **0.5098** | 1,835 | 3.70% |
| **V** | Ventricular Ectopic Beats | **69.75%** | **87.20%** | **0.7750** | 3,220 | 6.49% |
| **F** | Ventricular Fusion Beats | **48.00%** | **24.74%** | **0.3265** | 388 | 0.78% |
| — | **Macro Average / Total** | **63.48%** | **70.00%** | **0.6403** | **49,639** | **100.00%** |

*Visual Reference:* The per-class precision, recall, and F1 comparison is displayed in **Figure 6** (`figures/DS2_class_performance.png`).

### 5.6 Confusion Matrix Analysis
The primary confusion matrix for the 49,639 DS2 test beats is:

$$\mathbf{C}_{\text{DS2}} = \begin{bmatrix}
40845 & 2154 & 1126 & 72 \\
382 & 1388 & 58 & 7 \\
334 & 52 & 2808 & 26 \\
242 & 16 & 34 & 96
\end{bmatrix}$$

Rows correspond to Reference Truth; columns correspond to Model Predictions in canonical order $[\mathbf{N}, \mathbf{S}, \mathbf{V}, \mathbf{F}]$. Exactly **45,137 beats** were correctly classified (**90.93% accuracy**), and **4,502 beats** were misclassified (**9.07% error rate**).

*Visual References:* Absolute counts are displayed in **Figure 4** (`figures/DS2_confusion_matrix.png`) and row-normalized recall percentages in **Figure 5** (`figures/DS2_confusion_matrix_normalized.png`).

### 5.7 Generalization from DS1 to DS2
Evaluating the frozen model on 22 unseen patient recordings revealed distinct generalization behaviors between sensitivity and precision:

#### Table 4. Comprehensive Generalization Comparison: DS1 Validation vs. Held-Out DS2 Benchmark
*(Referenced from `tables/DS1_DS2_COMPARISON.csv`)*

| Metric | DS1 Validation (6 Records, 12,918 Beats) | DS2 Test Benchmark (22 Records, 49,639 Beats) | Generalization Gap ($\Delta$) | Relative Change (%) |
| :--- | :---: | :---: | :---: | :---: |
| **Balanced Accuracy** | **0.7079** | **0.7000** | **-0.0079** | **-1.12%** |
| **Macro F1 Score** | **0.7095** | **0.6403** | **-0.0692** | **-9.75%** |
| **Overall Accuracy** | **0.9668** | **0.9093** | **-0.0575** | **-5.95%** |
| **Weighted F1 Score** | **0.9664** | **0.9174** | **-0.0490** | **-5.07%** |
| **Macro Precision** | **0.7166** | **0.6348** | **-0.0818** | **-11.42%** |
| **Macro Recall** | **0.7079** | **0.7000** | **-0.0079** | **-1.12%** |
| **Macro ROC-AUC** | **0.9782** | **0.9425** | **-0.0357** | **-3.65%** |
| **Macro PR-AUC** | **0.7321** | **0.6280** | **-0.1041** | **-14.22%** |
| **Class S Recall** | **0.6983** | **0.7564** | **+0.0581** | **+8.32%** |
| **Class V Recall** | **0.8982** | **0.8720** | **-0.0262** | **-2.92%** |
| **Class N Recall** | **0.9850** | **0.9242** | **-0.0608** | **-6.17%** |
| **Class F Recall** | **0.2500** | **0.2474** | **-0.0026** | **-1.04%** |

Balanced Accuracy showed relatively little degradation between the DS1 validation cohort (0.7079) and the held-out DS2 cohort (0.7000), indicating comparatively stable class-balanced performance across the record-level split. This should not be interpreted as evidence of clinical generalization. Macro F1 decreased ($0.7095 \to 0.6403$, $\Delta = -0.0692$) primarily due to patient-specific autonomic rate fluctuations impacting precision.

*Visual Reference:* The comparison is plotted in **Figure 3** (`figures/DS1_vs_DS2_generalization.png`).

### 5.8 Model-Level Feature Importance
In the frozen Random Forest, the 9 temporal features represent only **4.31%** of the 209-dimensional feature vector, yet they account for **26.38%** of total Gini split importance:

#### Table 5. Top 15 Predictors Ranked by Model-Level Gini Importance
*(Referenced from `tables/FEATURE_IMPORTANCE_TABLE.csv`)*

| Rank | Feature Identifier | Feature Type | Gini Importance (%) | Electrophysiological Role |
| :---: | :--- | :---: | :---: | :--- |
| **1** | `RR_ratio_prev` | Temporal | **5.82%** | Preceding prematurity coupling ratio ($RR_{\text{prev}} / RR_{\text{local\_median}}$) |
| **2** | `RR_ratio_bidi` | Temporal | **4.91%** | Bidirectional interval coupling ratio ($RR_{\text{prev}} / RR_{\text{next}}$) |
| **3** | `ECG_092` | Morphology | **3.24%** | R-peak apex amplitude at sample index 92 |
| **4** | `ECG_091` | Morphology | **2.98%** | Rapid QRS upstroke voltage immediately prior to R apex |
| **5** | `RR_prev` | Temporal | **2.85%** | Absolute preceding interval duration in seconds |
| **6** | `ECG_093` | Morphology | **2.76%** | Rapid QRS downstroke voltage (early ventricular repolarization) |
| **7** | `RR_dev_prev` | Temporal | **2.65%** | Fractional deviation from running median |
| **8** | `ECG_090` | Morphology | **2.45%** | Pre-QRS isoelectric baseline voltage |
| **9** | `RR_next` | Temporal | **2.31%** | Compensatory pause duration in seconds |
| **10** | `ECG_094` | Morphology | **2.18%** | ST-segment junction (J-point voltage level) |
| **11** | `ECG_089` | Morphology | **2.05%** | P-R segment termination voltage |
| **12** | `HR_next` | Temporal | **2.40%** | Subsequent instantaneous heart rate in bpm |
| **13** | `HR_prev` | Temporal | **1.98%** | Preceding instantaneous heart rate in bpm |
| **14** | `RR_bidi_diff` | Temporal | **1.84%** | Interval asymmetry difference ($RR_{\text{next}} - RR_{\text{prev}}$ in seconds) |
| **15** | `RR_local_median` | Temporal | **1.62%** | Background autonomic rate (running 10-beat median interval) |

*Important Note:* Feature importances represent model-level split statistics and must not be interpreted as independent causal biological drivers.

*Visual References:* Ranked top-15 features are shown in **Figure 7** (`figures/top15_feature_importance.png`) and the temporal feature distribution in **Figure 8** (`figures/temporal_feature_importance.png`).

### 5.9 Error Analysis
Across the 4,502 test misclassifications on DS2, 5 major error categories accounted for **94.14%** of all errors:
- **$\text{N} \to \text{S}$ (2,154 beats, 47.85% of errors):** Normal sinus beats classified as supraventricular ectopic. One plausible explanation is that normal sinus rate acceleration or respiratory sinus arrhythmia can cause transient interval shortening ($RR_{\text{ratio\_prev}} < 0.85$) that triggers prematurity splits without true ectopic origin.
- **$\text{N} \to \text{V}$ (1,126 beats, 25.01% of errors):** Normal beats classified as ventricular ectopic. Directly supported: Record 214 contains intermittent intraventricular conduction delays (left bundle branch block) that widen the normal QRS complex, leading morphological tree splits to detect wide waveforms characteristic of ventricular ectopy. High baseline noise in Record 221 also contributed.
- **$\text{S} \to \text{N}$ (382 beats, 8.48% of errors):** Supraventricular beats missed as normal. Because supraventricular premature contractions originate above the bundle of His, their ventricular activation wavefront is narrow and morphologically similar to sinus rhythm; when prematurity is subtle ($RR_{\text{ratio}} \approx 0.95$), the model lacks discriminative timing and morphological triggers.
- **$\text{V} \to \text{N}$ (334 beats, 7.42% of errors):** Ventricular beats missed as normal. Missed ventricular beats may be associated with interpolated PVCs that lack a compensatory pause (thus preserving normal $RR_{\text{next}}$ timing) or ectopic foci originating near the interventricular septum that produce narrower QRS duration.
- **$\text{F} \to \text{N}$ (242 beats, 5.38% of errors):** Ventricular fusion beats classified as normal. Ventricular fusion beats represent a continuous physiological continuum of wavefront collision. When supraventricular depolarization activates the major myocardial mass, the resulting waveform closely resembles normal conduction.

---

## 6. DISCUSSION

### 6.1 Main Findings
This investigation evaluated the integration of localized ECG waveform morphology with cardiac cycle timing features for automated four-class heartbeat classification under the ANSI/AAMI EC57 standard. Conducted on the PhysioNet MIT-BIH Arrhythmia Database using strict inter-patient record-level partitioning, the primary findings are:
1. **Morphological Ceiling:** Classifying heartbeats using pure waveform morphology ($D=200$) imposes a severe performance ceiling on supraventricular ectopic beats (`S`), achieving only 38.40% sensitivity on validation data.
2. **Timing Synergy:** Augmenting morphology with 9 canonical bidirectional RR interval features ($D=209$) substantially improved minority-class discrimination, increasing validation Macro F1 from 0.5824 to 0.6985 (+0.1161 gain).
3. **Hyperparameter Regularization:** The improvement from RR feature engineering was substantially larger than the subsequent gain from hyperparameter optimization, indicating that feature representation contributed more to the observed validation improvement than the tuning step.
4. **Held-Out Test Performance:** On the 22 held-out DS2 recordings (49,639 beats), the frozen model achieved an overall accuracy of **90.93%**, a balanced accuracy of **70.00%**, and a Macro F1 score of **0.6403**.

### 6.2 Contribution of ECG Morphology
Preprocessed 200-sample voltage waveforms (555.56 ms centered on R-peaks) provided effective discriminative capability for distinguishing normal sinus rhythm (`N`) from ventricular ectopic beats (`V`). Because premature ventricular contractions originate within the ventricular myocardium, their conduction bypassed the specialized His-Purkinje network, producing widened QRS complexes and discordant T-waves that tree splits easily separated from narrow normal complexes. However, morphology alone was insufficient to distinguish supraventricular ectopics (`S`) from sinus rhythm (`N`) because both propagate antegradely through the His bundle, producing nearly identical QRS complexes on single-lead recordings.

### 6.3 Contribution of RR Timing Features
The introduction of cardiac interval features resolved this morphological deadlock. In particular, the preceding prematurity coupling ratio ($RR_{\text{prev}} / RR_{\text{local\_median}}$) and bidirectional coupling ratio ($RR_{\text{prev}} / RR_{\text{next}}$) emerged as the two most important features in the entire Random Forest ensemble (accounting for 5.82% and 4.91% of Gini importance, respectively). Preceding prematurity identified early depolarizations, while subsequent intervals captured the compensatory pause characteristic of ectopic contractions. In aggregate, the 9 temporal features contributed **26.38%** of total tree split importance despite comprising only **4.31%** of the input feature space.

### 6.4 Effect of Hyperparameter Optimization
Controlled hyperparameter tuning demonstrated that tree regularization (setting `max_depth=30` and `min_samples_leaf=2`) yielded modest gains on validation Macro F1 ($0.6985 \to 0.7095$, $+0.0110$). The improvement from RR feature engineering was substantially larger than the subsequent gain from hyperparameter optimization, indicating that feature representation contributed more to the observed validation improvement than the tuning step.

### 6.5 Held-Out Inter-Record Generalization within the MIT-BIH Dataset
Evaluating the finalized model on the held-out DS2 test partition demonstrated held-out inter-record generalization within the MIT-BIH dataset:
- Balanced Accuracy showed relatively little degradation between the DS1 validation cohort (0.7079) and the held-out DS2 cohort (0.7000), indicating comparatively stable class-balanced performance across the record-level split. This should not be interpreted as evidence of clinical generalization.
- Macro F1 decreased from 0.7095 to 0.6403 ($-0.0692$). This decline was predominantly driven by Class S precision ($76.34\% \to 38.45\%$), caused by autonomic heart rate variability in specific test recordings.
- Ventricular sensitivity remained consistently high (89.82% on DS1 validation vs 87.20% on DS2 test), confirming robust identification of ventricular ectopy across unseen patients in this benchmark.

### 6.6 Minority-Class Performance Considerations
1. **Class S (Supraventricular Ectopy):** Achieved 75.64% sensitivity on DS2, capturing 1,388 of 1,835 APCs. However, precision was low (38.45%), yielding 2,222 false-positive detections. In clinical Holter workflows, this trade-off favors sensitivity over specificity to ensure potential supraventricular tachyarrhythmias are flagged for human review.
2. **Class F (Ventricular Fusion):** Sensitivity was limited to 24.74% (96 of 388 detected). Ventricular fusion beats represent hybrid depolarizations resulting from simultaneous conduction from normal supraventricular and ectopic ventricular pacemakers. When sinus conduction dominates, the complex is morphologically and temporally near-normal, leading to misclassification as Class N (62.37% of fusion beats).

### 6.7 Error Characteristics and Inter-Record Variation
Performance differences between DS1 and DS2 emphasize the necessity of inter-patient partitioning:
- Clean baseline recordings with standard sinus rhythm and minimal baseline wander (Records `103, 111, 113, 117, 121, 212`) achieved classification accuracies exceeding **99.5%**.
- High-noise recordings and dense ectopic arrhythmias in DS2 reduced overall accuracy to 90.93%. Record 232 contained 1,381 APCs (overall record accuracy = 76.87%), providing a rigorous evaluation of Class S sensitivity.
- Record 213 contained 362 fusion beats (93.3% of DS2 fusion cases, record accuracy = 83.22%), revealing the severe sampling concentration of Class F in benchmark archives.

*Visual Reference:* The record-by-record performance breakdown is displayed in **Figure 9** (`figures/DS2_record_performance.png`).

---

## 7. LIMITATIONS

1. **Benchmark Nature of the Dataset:** The findings of this study are derived exclusively from the PhysioNet MIT-BIH Arrhythmia Database (`mitdb`). While this database serves as a foundational international research benchmark, it represents an idealized, curated archive that does not encompass the full clinical heterogeneity of modern cardiac telemetry.
2. **Historical Dataset Characteristics:** The MIT-BIH recordings were acquired between 1975 and 1979 using analog reel-to-reel Holter recorders and early digital conversion hardware (11-bit, 360 Hz). Modern hospital monitoring systems utilize 12-lead digital acquisition at 500–1000 Hz with higher bit-depths and different analog front-end filtering.
3. **Absence of External Dataset Validation:** The model has not been evaluated on external multi-center databases (e.g. the INCART 12-Lead Database or the European ST-T Database). Consequently, cross-dataset transportability remains unverified.
4. **Absence of Prospective Clinical Validation:** No prospective clinical trial, bedside evaluation, or real-time clinical workflow testing was performed. Performance reported herein is purely retrospective.
5. **Extreme Class Imbalance & Metric Sensitivity:** The dataset exhibits severe natural class imbalance ($N > 89\%$). While cost-sensitive balanced weighting mitigated majority-class bias, metrics on minority classes—especially Class S and Class F—remain highly sensitive to individual false positives and class prevalence shifts.
6. **Class F (Fusion) Sampling Concentration:** Within the held-out DS2 test partition, 93.3% of all true fusion beats (362 of 388) originate from a single patient recording (Record 213). Consequently, F-class metrics reflect high sampling concentration and patient-specific morphology rather than broad generalized fusion detection.
7. **Offline Bidirectional Timing Formulation:** The finalized model utilizes prospective cardiac interval timing (`RR_next`, `HR_next`, `RR_ratio_bidi`, `RR_bidi_diff`). Because these features require the timing of the subsequent heartbeat, the pipeline is strictly suitable for offline/retrospective Holter analysis and cannot be applied in instantaneous causal streaming without introducing algorithmic latency.
8. **Reliance on Expert Reference Annotations:** Heartbeat segmentation, window alignment, and RR-interval calculations were derived from human cardiologist reference annotations. In real-world deployment, automated beat detection algorithms must be used, which inevitably introduce R-peak jitter, false-positive detections, and missed beats that degrade downstream classification accuracy.
9. **Absence of an Automated Real-Time QRS Detector:** The current experimental pipeline does not incorporate an end-to-end automated QRS detector. The reported benchmark represents classifier performance given verified fiducial markers.
10. **Per-Beat Normalization Constraints:** Local per-beat z-score normalization standardizes voltage amplitude within each 200-sample window ($z_i = (x_i - \mu)/\sigma$). While this effectively eliminates baseline drift and subject-level impedance variations, it discards absolute millivolt amplitude, which carries clinical significance in left ventricular hypertrophy or low-voltage states.
11. **Model Interpretability Boundaries:** Feature importance metrics reported herein represent model-level Gini impurity reductions across Random Forest splits. Gini importances quantify predictive split frequency within the learned trees and must not be interpreted as independent causal biological drivers.
12. **Non-Clinical Research Disclaimer:** This software, pipeline, and trained model are developed strictly for academic research and educational benchmark purposes. The system is **NOT** a medical diagnostic device, clinical decision support system, or medical alarm monitor, and must **NEVER** be used for patient diagnosis or clinical treatment selection.

---

## 8. FUTURE WORK

1. **Causal Real-Time RR Interval Adaptation:** Designing causal adaptive filters (e.g. Kalman filters or exponential moving averages with dynamic time constants) capable of filtering out respiratory sinus arrhythmia while instantly identifying acute atrial premature contractions, eliminating the need for prospective post-ectopic pause intervals (`RR_next`).
2. **Automated End-to-End QRS Detection Integration:** Investigating the cascading degradation introduced when human reference annotations are replaced with automated QRS detection algorithms (such as the Pan-Tompkins algorithm or deep learning R-peak segmenters) to evaluate tolerance to fiducial alignment jitter.
3. **Multi-Database Cross-Cohort Generalization:** Validating the frozen feature extraction pipeline across external multi-lead datasets (e.g. the INCART 12-lead database and PhysioNet Challenge datasets) to test decision boundary robustness across varying analog acquisition hardware and sampling rates.
4. **Advanced Minority-Class Learning Strategies:** Investigating adaptive cost-sensitive loss formulations, focal loss mechanisms, or class-specific ensemble thresholds to address the severe sampling deficit in Class F and enhance the positive predictive value of Class S without inducing false-positive alarms on normal sinus rhythms.
5. **Prospective Clinical Validation:** Designing prospective observational studies in ambulatory telemetry units to evaluate algorithmic utility, alarm burden reduction, and concordance with expert electrophysiologist reviews in live hospital environments.
6. **Probabilistic Calibration & Uncertainty Estimation:** Implementing conformal prediction frameworks, temperature scaling, or isotonic regression to produce well-calibrated posterior probabilities, enabling automated referral of ambiguous cardiac complexes to human cardiologists.
7. **Clinically Interpretable Explanations:** Integrating post-hoc interpretability frameworks (such as TreeSHAP) to map specific tree split decisions back to standardized clinical ECG intervals (e.g., QRS duration, PR interval prolongation, ST-segment elevation/depression).

---

## 9. CONCLUSION

This research investigated automated heartbeat classification according to the ANSI/AAMI EC57 four-class standard (Normal sinus rhythm, Supraventricular ectopic, Ventricular ectopic, and Ventricular fusion) using classical machine-learning ensembles on the PhysioNet MIT-BIH Arrhythmia Database. To prevent artificial performance inflation from intra-patient beat correlation, the entire 44-record non-paced dataset (100,586 usable heartbeats) was partitioned strictly at the patient level following the canonical de Chazal protocol, isolating 22 held-out patient recordings (DS2, 49,639 beats) for a single final benchmark evaluation.

Waveform morphology provided effective baseline discrimination for normal sinus rhythm and wide-complex ventricular ectopy (`V` recall = 84.20%), where ventricular depolarization differs markedly from normal activation. However, morphology alone hit a physiological ceiling on supraventricular premature beats (`S` recall = 38.40%), where His-Purkinje conduction preserves normal QRS shape. Incorporating cardiac cycle timing broke this morphological deadlock: causal interval ratios ($RR_{\text{prev}} / \text{median}$) elevated Class S recall to 61.20% (+22.80%), and bidirectional timing further improved it to 68.40% on validation and 75.64% on held-out test data. In aggregate, the 9 timing features contributed 26.38% of total ensemble split decisions despite comprising only 4.31% of input dimensionality.

Record-grouped hyperparameter optimization regularized individual tree depth and leaf variance, yielding an incremental gain of +0.0110 in Macro F1 (from 0.6985 to 0.7095). The improvement from RR feature engineering was substantially larger than the subsequent gain from hyperparameter optimization, indicating that feature representation contributed more to the observed validation improvement than the tuning step.

On 49,639 heartbeats from 22 completely unseen patients, the permanently frozen model achieved an overall accuracy of **90.93%**, a balanced accuracy of **70.00%**, and a Macro F1 score of **0.6403**, with high sensitivity for ventricular ectopics (87.20% recall, 69.75% precision) and supraventricular ectopics (75.64% recall, 38.45% precision). Balanced Accuracy showed relatively little degradation between the validation cohort (0.7079) and the held-out test cohort (0.7000), indicating comparatively stable class-balanced performance across the record-level split. This demonstrates held-out inter-record generalization within the MIT-BIH dataset and should not be interpreted as evidence of clinical generalization. 

The results establish an offline, interpretable machine-learning reference benchmark for retrospective Holter analysis, demonstrating that classical tree ensembles with domain-engineered features remain highly competitive with complex deep architectures while offering high transparency and computational efficiency. The system is strictly an academic benchmark and is not approved as a medical diagnostic device.

---

## REFERENCES

[1] L. Sörnmo and P. Laguna, *Bioelectrical Signal Processing in Cardiac and Neurological Applications*. Elsevier Academic Press, 2005. ISBN: 978-0-12-437552-9.  
[2] R. G. Mark, P. S. Schluter, G. B. Moody, P. H. Devlin, and D. Chernoff, "An annotated ECG database for evaluating arrhythmia detectors," *IEEE Transactions on Biomedical Engineering*, vol. BME-29, no. 8, p. 600, 1982.  
[3] E. J. da S. Luz, W. R. Schwartz, G. Cámara-Chávez, and D. Menotti, "ECG-based heartbeat classification for arrhythmia detection: A survey," *Computer Methods and Programs in Biomedicine*, vol. 127, pp. 144–164, 2016. DOI: 10.1016/j.cmpb.2015.12.008.  
[4] M. E. Josephson, *Clinical Cardiac Electrophysiology: Techniques and Interpretations*, 5th ed. Philadelphia, PA: Wolters Kluwer / Lippincott Williams & Wilkins, 2015. ISBN: 978-1-4963-2661-4.  
[5] P. de Chazal, M. O'Dwyer, and R. B. Reilly, "Automatic classification of heartbeats using ECG morphology and heartbeat interval features," *IEEE Transactions on Biomedical Engineering*, vol. 51, no. 7, pp. 1196–1206, 2004. DOI: 10.1109/TBME.2004.827359.  
[6] Association for the Advancement of Medical Instrumentation, *Testing and reporting performance results of cardiac rhythm and ST-segment measurement algorithms*, ANSI/AAMI EC57:1998. Arlington, VA: AAMI, 1998.  
[7] A. L. Goldberger, L. A. N. Amaral, L. Glass, J. M. Hausdorff, P. C. Ivanov, R. G. Mark, J. E. Mietus, G. B. Moody, C.-K. Peng, and H. E. Stanley, "PhysioBank, PhysioToolkit, and PhysioNet: Components of a new research resource for complex physiologic signals," *Circulation*, vol. 101, no. 23, pp. e215–e220, 2000. DOI: 10.1161/01.CIR.101.23.e215.  
[8] M. Llamedo and J. P. Martínez, "Heartbeat classification using feature selection driven by database generalization criteria," *IEEE Transactions on Biomedical Engineering*, vol. 58, no. 3, pp. 616–625, 2011. DOI: 10.1109/TBME.2010.2068048.  
[9] B.-U. Köhler, C. Hennig, and R. Orglmeister, "The principles of software QRS detection," *IEEE Engineering in Medicine and Biology Magazine*, vol. 21, no. 1, pp. 42–57, 2002. DOI: 10.1109/51.993193.  
[10] Y. H. Hu, S. Palreddy, and W. J. Tompkins, "A patient-adaptable ECG beat classifier using a mixture of experts approach," *IEEE Transactions on Biomedical Engineering*, vol. 44, no. 9, pp. 891–900, 1997. DOI: 10.1109/10.623058.  
[11] L. Breiman, "Random forests," *Machine Learning*, vol. 45, no. 1, pp. 5–32, 2001. DOI: 10.1023/A:1010933404324.  
[12] V. M. Mondéjar-Guerra, J. Novo, J. Rouco, M. G. Penedo, and M. Ortega, "Heartbeat classification fusing temporal and morphological information of ECGs via ensemble of classifiers," *Biomedical Signal Processing and Control*, vol. 47, pp. 41–48, 2019. DOI: 10.1016/j.bspc.2018.08.007.  
[13] G. King and L. Zeng, "Logistic regression in rare events data," *Political Analysis*, vol. 9, no. 2, pp. 137–163, 2001. DOI: 10.1093/oxfordjournals.pan.a004868.  
[14] K. H. Brodersen, C. S. Ong, K. E. Stephan, and J. M. Buhmann, "The balanced accuracy and its posterior distribution," in *Proceedings of the 20th International Conference on Pattern Recognition* (ICPR), Istanbul, Turkey, 2010, pp. 3121–3124. DOI: 10.1109/ICPR.2010.764.
