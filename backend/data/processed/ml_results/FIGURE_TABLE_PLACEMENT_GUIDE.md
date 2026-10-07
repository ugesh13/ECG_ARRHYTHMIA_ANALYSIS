# FIGURE AND TABLE PLACEMENT GUIDE FOR PUBLICATION MANUSCRIPT

**Standard Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Evaluated Architecture:** Frozen Random Forest Classifier ($D = 209$)  
**Target Manuscript:** Classical Machine Learning Arrhythmia Benchmark Paper  

---

## 1. Figure Mapping & Section Placement

| Figure Identifier & Filename | Recommended Manuscript Section | Primary Scientific Purpose / What it Demonstrates | Where it Should be Discussed in Text |
| :--- | :--- | :--- | :--- |
| **Figure 1**<br>`dataset_class_distribution.png` | **Section 3.1 & 3.9**<br>(Dataset & Partitioning) | Log-scale distribution of cardiac cycles across Training, Validation, and Test cohorts, highlighting extreme class imbalance ($N > 89\%$, minority classes totaling $\approx 10\%$). | Discuss in Section 3.1 to justify class weighting and explain why macro-averaged metrics (rather than raw accuracy) are mandatory. |
| **Figure 2**<br>`macro_f1_progression.png` | **Section 4 & 5.1–5.3**<br>(Progression & Baseline) | Milestones trajectory tracking Macro F1 across Phases 5 through 8, demonstrating feature engineering gain (+0.1161) vs hyperparameter tuning gain (+0.0110) vs generalization gap (-0.0692). | Discuss in Section 5.2 to show that the improvement from RR feature engineering was substantially larger than the subsequent gain from hyperparameter optimization, indicating that feature representation contributed more to the observed validation improvement than the tuning step. |
| **Figure 3**<br>`DS1_vs_DS2_generalization.png` | **Section 5.4 & 5.7**<br>(Generalization Analysis) | Side-by-side comparison of DS1 Validation vs DS2 Test across 6 key metrics, displaying the exact generalization deltas ($\Delta$). | Discuss in Section 5.7 to show the stability of Balanced Accuracy (-0.0079) and explain the drop in Macro F1 (-0.0692). |
| **Figure 4**<br>`DS2_confusion_matrix.png` | **Section 5.6**<br>(DS2 Benchmark Results) | Absolute beat-count 4x4 confusion matrix for the held-out DS2 test cohort ($N=49,639$). | Discuss in Section 5.6 to present raw diagnostic agreements ($45,137$ correct) and major off-diagonal error counts. |
| **Figure 5**<br>`DS2_confusion_matrix_normalized.png` | **Section 5.6**<br>(DS2 Benchmark Results) | Row-normalized confusion matrix presenting per-class sensitivity (recall) percentages on unseen patients. | Discuss in Section 5.6 alongside absolute counts to emphasize true positive recall across minority classes. |
| **Figure 6**<br>`DS2_class_performance.png` | **Section 5.5**<br>(Class-Wise Performance) | Grouped bar chart comparing precision, recall, and F1-score across AAMI classes `N`, `S`, `V`, and `F`. | Discuss in Section 5.5 to illustrate the sensitivity-precision trade-off in Class S (75.64% recall vs 38.45% precision). |
| **Figure 7**<br>`top15_feature_importance.png` | **Section 5.8**<br>(Feature Importance) | Horizontal ranked bar chart of top 15 predictors in the frozen Random Forest, color-coded for 7 temporal vs 8 morphological features. | Discuss in Section 5.8 to show that interval ratios (`RR_ratio_prev`, `RR_ratio_bidi`) occupy the top two predictive ranks. |
| **Figure 8**<br>`temporal_feature_importance.png` | **Section 5.8**<br>(Feature Importance) | Individual Gini split importances for all 9 canonical bidirectional temporal features and their aggregate contribution (26.38%). | Discuss in Section 5.8 to highlight the disproportionate impact of timing features (26.38% importance from 4.31% of dimensions). |
| **Figure 9**<br>`DS2_record_performance.png` | **Section 5.9 & 6.8**<br>(Record-Level Variation) | Patient-level accuracy variation across all 22 DS2 recordings, contrasting clean sinus records (>99.5%) with challenging arrhythmia records. | Discuss in Section 6.8 to demonstrate inter-patient heterogeneity and explain record-specific error concentrations. |

---

## 2. Table Mapping & Section Placement

| Table Identifier & Filename | Recommended Manuscript Section | Primary Scientific Purpose / What it Demonstrates | Where it Should be Discussed in Text |
| :--- | :--- | :--- | :--- |
| **Table 1**<br>`FINAL_EXPERIMENTAL_DESIGN.csv` | **Section 4**<br>(Experimental Design) | Chronological structure of all 5 experimental milestones (Phases 5–8), detailing models, feature dimensions, and evaluation cohorts. | Discuss in Section 4 to clearly delineate model development, validation, and single held-out testing phases. |
| **Table 2**<br>`FINAL_PERFORMANCE_TABLE.csv` | **Section 5.4**<br>(Results Overview) | High-level publication performance table comparing Phase 6 Best RF, Phase 7 Tuned RF (Validation), and Phase 8 Final Frozen RF (DS2 Test). | Discuss in Section 5.4 as the primary headline summary table of the research paper. |
| **Table 3**<br>`CLASSWISE_DS2_RESULTS.csv` | **Section 5.5**<br>(Class-Wise Results) | Exact precision, recall, F1-score, and sample support for each AAMI class on the 49,639 held-out test beats. | Discuss in Section 5.5 to document exact clinical category metrics under the EC57 standard. |
| **Table 4**<br>`DS1_DS2_COMPARISON.csv` | **Section 5.7**<br>(Generalization Analysis) | Detailed comparison of all macro and class-wise metrics between DS1 and DS2, listing absolute deltas and percentage changes. | Discuss in Section 5.7 to support the detailed generalization discussion. |
| **Table 5**<br>`FEATURE_IMPORTANCE_TABLE.csv` | **Section 5.8**<br>(Feature Importance) | Gini importances, ranks, feature types, and electrophysiological descriptions for top 15 predictors. | Discuss in Section 5.8 alongside Figures 7 and 8. |
| **Table 6**<br>`DATASET_CLASS_DISTRIBUTION.csv` | **Section 3.1 & 3.9**<br>(Dataset & Partitioning) | Exact beat counts and percentages across Training, Validation, Held-Out Test, and Paced cohorts. | Discuss in Section 3.9 to prove zero-leakage accounting across all 48 database records. |
