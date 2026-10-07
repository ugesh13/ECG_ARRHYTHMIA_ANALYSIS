# PUBLICATION-READY FIGURE CAPTIONS

**Standard Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Database:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`)  
**Evaluated Architecture:** Frozen Random Forest Classifier ($D = 209$)  

---

**Figure 1. ANSI/AAMI EC57 Class Distribution Across Experimental Partitions.**  
Heartbeat counts plotted on a logarithmic scale across the Training partition (DS1, 16 records, 38,029 usable beats), Validation partition (DS1, 6 records, 12,918 usable beats), and Held-Out Test partition (DS2, 22 records, 49,639 usable beats). The plot illustrates the severe class imbalance characteristic of ambulatory ECG archives, where Normal sinus rhythm (`N`) exceeds 89% of all cycles, while Supraventricular ectopics (`S`, 0.6%–5.5%), Ventricular ectopics (`V`, 2.1%–9.2%), and Ventricular fusion beats (`F`, 0.06%–1.1%) represent small fractions of total data. Paced recordings (`102, 104, 107, 217`) were isolated prior to partitioning.

---

**Figure 2. Experimental Milestone Progression of Macro F1 Score Across Phases 5 through 8.**  
Evolution of the primary evaluation metric (Macro F1) on the DS1 validation cohort and final DS2 test partition. Progressing from the raw morphology baseline ($D=200$, Macro F1 = 0.5824) to causal RR interval features ($D=205$, Macro F1 = 0.6650) and bidirectional RR interval features ($D=209$, Macro F1 = 0.6985) yielded a substantial feature engineering gain of +0.1161. Subsequent tree depth and leaf regularization during hyperparameter optimization contributed an incremental gain of +0.0110 (Macro F1 = 0.7095). Evaluation of the frozen model on the independent 22-record DS2 test cohort yielded a Macro F1 of 0.6403, establishing an inter-record generalization gap of -0.0692.

---

**Figure 3. Diagnostic Generalization Comparison: DS1 Validation vs. Held-Out DS2 Benchmark.**  
Comparison of six performance metrics between the 6-record DS1 validation cohort (12,918 beats) and the 22-record held-out DS2 test cohort (49,639 beats). Balanced Accuracy showed minimal degradation between validation (0.7079) and test (0.7000, $\Delta = -0.0079$), indicating comparatively stable class-balanced performance across the record-level split. In contrast, Macro F1 dropped from 0.7095 to 0.6403 ($\Delta = -0.0692$), driven predominantly by a decline in Class S precision caused by non-pathological sinus rate acceleration in unseen patients.

---

**Figure 4. Absolute Confusion Matrix for the Held-Out DS2 Test Set ($N=49,639$ Beats).**  
Primary 4x4 confusion matrix depicting absolute beat counts on the 22 independent DS2 recordings evaluated by the frozen Random Forest. Rows denote cardiologist reference annotations; columns denote model predictions. Class ordering: Normal sinus rhythm (`N`), Supraventricular ectopic (`S`), Ventricular ectopic (`V`), and Ventricular fusion (`F`). Exactly 45,137 beats were correctly classified (90.93% overall accuracy), with 4,502 total misclassifications (9.07% error rate).

---

**Figure 5. Row-Normalized Confusion Matrix for the Held-Out DS2 Test Set.**  
Row-normalized confusion matrix showing per-class sensitivity (recall) percentages alongside absolute counts on the 49,639 held-out DS2 beats. Diagonal elements report diagnostic recall for each AAMI rhythm: Class N = 92.42% (40,845/44,197), Class S = 75.64% (1,388/1,835), Class V = 87.20% (2,808/3,220), and Class F = 24.74% (96/388). Off-diagonal cells illustrate major confusion pathways, including 2,154 normal beats misclassified as S (4.87% of N) and 242 fusion beats misclassified as N (62.37% of F).

---

**Figure 6. Per-Class Diagnostic Precision, Recall, and F1-Score on the Held-Out DS2 Cohort.**  
Grouped bar chart detailing class-wise performance for classes `N`, `S`, `V`, and `F` on the 49,639 DS2 test beats. Class N demonstrated high precision (97.71%) and recall (92.42%, F1 = 0.9499). Class V exhibited robust sensitivity (87.20%) and precision (69.75%, F1 = 0.7750). Class S achieved strong sensitivity (75.64%) but lower precision (38.45%, F1 = 0.5098) due to false-positive alarms on sinus rate variations. Class F demonstrated moderate precision (48.00%) but limited sensitivity (24.74%, F1 = 0.3265) due to dominant sinus wavefront capture.

---

**Figure 7. Top 15 Predictors Ranked by Model-Level Gini Importance in the Frozen Random Forest.**  
Horizontal bar chart displaying the 15 most important features by mean Gini impurity reduction across the 200 ensemble trees. Features are color-coded to differentiate temporal timing features (blue, 7 features in the top 15) from raw ECG morphology amplitudes (gray, 8 features in the top 15). The preceding prematurity coupling ratio (`RR_ratio_prev`, 5.82%) and bidirectional coupling ratio (`RR_ratio_bidi`, 4.91%) occupy the top two ranks, followed by R-peak apex amplitudes (`ECG_092`, 3.24%) and QRS upstroke voltages (`ECG_091`, 2.98%).

---

**Figure 8. Model-Level Gini Importance Breakdown of All 9 Canonical Temporal Features.**  
Horizontal bar chart showing the individual Gini importance values for all 9 canonical bidirectional RR timing features extracted from reference annotations. While temporal features constitute only 4.31% of the 209-dimensional feature space, they collectively account for 26.38% of total ensemble split decisions. Top temporal predictors include interval coupling ratios (`RR_ratio_prev` = 5.82%, `RR_ratio_bidi` = 4.91%), absolute preceding interval (`RR_prev` = 2.85%), and running median deviation (`RR_dev_prev` = 2.65%). Importance metrics reflect model-level split statistics and do not denote independent causal biological drivers.

---

**Figure 9. Inter-Record Classification Accuracy Variation Across All 22 Held-Out DS2 Patients.**  
Horizontal bar chart illustrating diagnostic accuracy across each of the 22 held-out patient recordings in DS2, ordered by accuracy. The vertical dashed line indicates aggregate DS2 accuracy (90.93%). Clean recordings with standard sinus rhythm and minimal baseline wander (e.g. Records 103, 111, 117, 212) achieved accuracies exceeding 99.5%, whereas recordings characterized by dense ectopic runs (Record 232 with 1,381 APCs, accuracy = 76.87%) or high fusion concentration (Record 213 with 362 F beats, accuracy = 83.22%) exhibited lower record-level agreement.
