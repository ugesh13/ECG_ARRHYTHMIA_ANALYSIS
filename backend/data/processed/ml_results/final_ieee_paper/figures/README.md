# Publication Figures for IEEE Manuscript

This directory contains the figure references for the IEEE manuscript:
"Integrating ECG Morphology and Cardiac Timing Features for Inter-Patient Heartbeat Classification: An AAMI EC57 Benchmark Evaluation on the MIT-BIH Database"

Figures referenced in `main.tex`:
1. `dataset_class_distribution.png` — ANSI/AAMI EC57 class distribution across experimental partitions (log scale, Fig. 1).
2. `macro_f1_progression.png` — Macro F1 progression across Phases 5 through 8 (Fig. 2).
3. `DS1_vs_DS2_generalization.png` — Comparison of DS1 validation vs held-out DS2 test metrics (Fig. 3).
4. `DS2_confusion_matrix.png` — Absolute count confusion matrix for DS2 (N=49,639 beats, Fig. 4).
5. `DS2_confusion_matrix_normalized.png` — Row-normalized recall confusion matrix for DS2 (Fig. 5).
6. `DS2_class_performance.png` — Grouped bar chart of per-class precision, recall, and F1 on DS2 (Fig. 6).
7. `top15_feature_importance.png` — Top 15 features ranked by model-level Gini importance (Fig. 7).
8. `temporal_feature_importance.png` — Gini importance breakdown of all 9 canonical temporal features (Fig. 8).
9. `DS2_record_performance.png` — Record-by-record accuracy variation across all 22 DS2 patients (Fig. 9).

Source generation script: `backend/generate_phase9_artifacts.py`
All captions are verified from `FINAL_FIGURE_CAPTIONS.md`.
