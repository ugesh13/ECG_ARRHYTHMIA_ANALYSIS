# Phase 9 Publication Figures

This directory contains the publication-ready figures for the ANSI/AAMI EC57 ECG beat classification benchmark.

Generated via `backend/generate_phase9_artifacts.py`:
1. `DS2_confusion_matrix.png` — Absolute counts confusion matrix for DS2 (N=49,639).
2. `DS2_confusion_matrix_normalized.png` — Row-normalized (recall) confusion matrix for DS2.
3. `DS2_class_performance.png` — Grouped bar chart of precision, recall, and F1 across AAMI classes.
4. `DS1_vs_DS2_generalization.png` — Comparison of validation vs held-out test metrics and generalization gap.
5. `macro_f1_progression.png` — Macro F1 progression across Phases 5 through 8.
6. `top15_feature_importance.png` — Top 15 features in the frozen Random Forest (temporal vs morphology).
7. `temporal_feature_importance.png` — Breakdown of all 9 canonical temporal features.
8. `DS2_record_performance.png` — Performance variation across the 22 held-out DS2 patient recordings.
9. `dataset_class_distribution.png` — Log-scale distribution showing extreme class imbalance across partitions.
