# SCIENTIFIC & METHODOLOGICAL CONTRIBUTIONS

**Standard Protocol Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Database:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`)  
**Evaluated Architecture:** Frozen Random Forest Classifier ($D = 209$)  

---

This research project delivers seven distinct, verified scientific and methodological contributions:

1. **Leakage-Aware Inter-Patient Partitioning Protocol:**  
   The study implements a strict, record-level partitioning strategy across the 44 non-paced MIT-BIH recordings (following the canonical de Chazal et al. division), completely eliminating intra-patient beat-level leakage. All 22 test recordings (DS2, 49,639 usable beats) were isolated from preprocessing fitting, class-weight calculations, and hyperparameter search.

2. **Rigorous Four-Class AAMI Accounting & Paced Record Isolation:**  
   The study establishes an exact accounting framework for the ANSI/AAMI EC57 4-class taxonomy (`N`, `S`, `V`, `F`). Four paced recordings (`102, 104, 107, 217`, comprising 8,757 beats) were strictly isolated to prevent artificial pacing spike contamination, and 15 unclassifiable beats (`Q`) across the remaining recordings were accounted for without compromising target class definitions.

3. **Domain-Grounded Morphology + RR Timing Representation ($D = 209$):**  
   The study develops a 209-dimensional feature representation combining 200 preprocessed raw ECG sample amplitudes (moving-average baseline wander removal with $W=217$ samples and per-beat z-score normalization) with 9 canonical bidirectional RR-interval timing features derived from consecutive heartbeat timestamps.

4. **Controlled Causal vs. Bidirectional Timing Ablation:**  
   The study conducts a controlled comparative evaluation across matched validation cohorts, demonstrating that causal retrospective timing ($D=205$) provides the primary breakthrough for supraventricular ectopic sensitivity (improving Class S recall from 38.40% to 61.20%), while prospective bidirectional features ($D=209$) provide an additional increment (+0.0335 Macro F1) by capturing compensatory pauses and interval asymmetry.

5. **Record-Grouped Hyperparameter Optimization:**  
   The study executes hyperparameter optimization strictly within the training cohort using 4-fold `GroupKFold` grouped by patient record ID. This ensures that cross-validation folds reflect genuine inter-subject generalization rather than intra-subject memorization.

6. **Permanently Frozen Independent Held-Out Benchmark (DS2):**  
   The study reports a single, independent test evaluation of the frozen Random Forest on 49,639 beats from 22 unseen recordings, achieving 90.93% overall accuracy, 70.00% balanced accuracy, 0.6403 Macro F1, and 87.20% ventricular sensitivity, with zero post-test parameter tuning.

7. **Grounded Error Categorization & Generalization Assessment:**  
   The study conducts a thorough post-test audit of the 4,502 test misclassifications, categorizing major error modes into electrophysiologically plausible mechanisms, while demonstrating that Balanced Accuracy exhibits relatively little degradation between validation (0.7079) and test (0.7000), whereas Macro F1 declines due to autonomic rate variability.
