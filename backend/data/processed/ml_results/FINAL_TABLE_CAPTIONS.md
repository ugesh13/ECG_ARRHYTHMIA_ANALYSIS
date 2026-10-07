# PUBLICATION-READY TABLE CAPTIONS

**Standard Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Database:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`)  
**Evaluated Architecture:** Frozen Random Forest Classifier ($D = 209$)  

---

**Table 1. Experimental Progression and Milestone Evaluation Design.**  
Chronological summary of all five experimental stages across Phases 5 through 8. Columns detail the project phase, experimental condition, dataset partitions, record allocations, input feature sets, total feature dimensionality, model families, selection criteria, evaluation cohorts, and primary scientific objectives. Clearly delineates initial model exploration and feature engineering (Phases 5 and 6), hyperparameter optimization via record-grouped cross-validation (Phase 7), and single independent test evaluation on the held-out DS2 cohort (Phase 8).  
*Source File:* `tables/FINAL_EXPERIMENTAL_DESIGN.csv`

---

**Table 2. Final Diagnostic Performance Comparison Across Progression Milestones.**  
Comparative headline performance metrics evaluating the Phase 6 best baseline configuration (Random Forest with Morphology + Bidirectional RR on DS1 Validation), Phase 7 tuned Random Forest (on DS1 Validation), and Phase 8 frozen Random Forest (on Held-Out DS2 Test). Reported metrics include Overall Accuracy, Balanced Accuracy, Macro Precision, Macro Recall, Macro F1 Score, and Weighted F1 Score, utilizing exact unrounded underlying calculations rounded to four decimal places.  
*Source File:* `tables/FINAL_PERFORMANCE_TABLE.csv`

---

**Table 3. Detailed Class-Wise Diagnostic Performance on the Held-Out DS2 Test Set.**  
Diagnostic performance breakdown across the four ANSI/AAMI EC57 heartbeat classes on the 49,639 usable beats from the 22 held-out DS2 recordings. For each clinical class (`N`, `S`, `V`, `F`), the table reports precision (positive predictive value), recall (sensitivity), F1-score, true sample support, and evaluated prevalence percentage within the test partition. Demonstrates high ventricular ectopy sensitivity (87.20%), robust normal sinus precision (97.71%), and the diagnostic trade-off observed in supraventricular ectopy (75.64% recall vs 38.45% precision).  
*Source File:* `tables/CLASSWISE_DS2_RESULTS.csv`

---

**Table 4. Comprehensive Generalization Comparison: DS1 Validation vs. Held-Out DS2 Benchmark.**  
Systematic evaluation of inter-patient generalization between the 6-record DS1 validation cohort (12,918 beats) and the 22-record held-out DS2 test cohort (49,639 beats). Compares overall accuracy, balanced accuracy, macro precision, macro recall, macro F1, weighted F1, multi-class ROC-AUC, multi-class PR-AUC, and per-class sensitivities and precisions. Lists absolute performance deltas ($\Delta = \text{DS2} - \text{DS1}$) and relative percentage changes, documenting the stability of Balanced Accuracy (-1.12%) versus the precision-driven degradation in Macro F1 (-9.75%).  
*Source File:* `tables/DS1_DS2_COMPARISON.csv`

---

**Table 5. Top 15 Most Important Predictors Ranked by Model-Level Gini Importance.**  
Feature rank, feature name, feature category (Temporal Timing vs Local ECG Morphology), Gini impurity importance, and electrophysiological role for the top 15 predictors in the frozen Random Forest. Highlights that interval timing features occupy the top two predictive positions (`RR_ratio_prev` at 5.82% and `RR_ratio_bidi` at 4.91%), followed by central R-peak apex amplitudes (`ECG_092` at 3.24%) and rapid QRS upstroke voltages (`ECG_091` at 2.98%). Notes that Gini importance measures tree split frequency and does not imply independent biological causality.  
*Source File:* `tables/FEATURE_IMPORTANCE_TABLE.csv`

---

**Table 6. Heartbeat Accounting and Class Distribution Across Partitions.**  
Exact heartbeat counts and relative prevalence percentages for each ANSI/AAMI EC57 class (`N`, `S`, `V`, `F`) and isolated unclassifiable beats (`Q`) across the Training partition (16 records, 38,029 usable beats), Validation partition (6 records, 12,918 usable beats), Held-Out Test partition (22 records, 49,639 usable beats), Total 44-record primary benchmark cohort (100,586 usable beats), and the isolated 4-record paced cohort (8,757 beats). Documents zero-leakage accounting across all 48 recordings of the MIT-BIH Arrhythmia Database.  
*Source File:* `tables/DATASET_CLASS_DISTRIBUTION.csv`
