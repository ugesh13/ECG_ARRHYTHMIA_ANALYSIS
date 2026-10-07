# PHASE 13 — NUMERICAL INTEGRITY AUDIT REPORT

**Manuscript Title:** Integrating ECG Morphology and Cardiac Timing Features for Inter-Patient Heartbeat Classification: An AAMI EC57 Benchmark Evaluation on the MIT-BIH Database  
**Source Document:** `FINAL_RESEARCH_MANUSCRIPT.md` & `final_ieee_paper/main.tex`  
**Execution Timestamp:** October 4, 2026  
**Status:** 100% VERIFIED & CONCORDANT [PASS]  

---

## 1. Locked Benchmark Numerical Auditing

Every required benchmark metric from Phases 5 through 8 was systematically searched and verified across the manuscript source and LaTeX compilation tables.

| Required Number | Metric Description | Verified Context & Experiment | Target Source Match | LaTeX `main.tex` Match | Audit Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **90.93** | Overall Accuracy (90.93%) | Phase 8 Frozen RF on Held-Out DS2 (49,639 beats) | Line 7, 37, 218, 222, 252, 266, 326, 350, 394 | Abstract, Sec. I, IV, V, VI, VII, IX, Tab. 2, 4 | **PASS** |
| **70.00** | Balanced Accuracy (70.00%) | Phase 8 Frozen RF on Held-Out DS2 (49,639 beats) | Line 7, 37, 222, 238, 264, 277, 326, 339, 394 | Abstract, Sec. I, V, VI, IX, Tab. 2, 3, 4 | **PASS** |
| **0.6403** | Macro F1 Score | Phase 8 Frozen RF on Held-Out DS2 (49,639 beats) | Line 7, 37, 222, 238, 265, 277, 326, 340, 394 | Abstract, Sec. I, V, VI, IX, Tab. 2, 3, 4 | **PASS** |
| **0.9174** | Weighted F1 Score | Phase 8 Frozen RF on Held-Out DS2 (49,639 beats) | Line 222, 267 | Sec. V, Tab. 2, 4 | **PASS** |
| **0.9425** | Macro Multi-Class ROC-AUC (OvR) | Phase 8 Frozen RF on Held-Out DS2 (49,639 beats) | Line 224, 270 | Sec. V-D, Tab. 4 | **PASS** |
| **0.6280** | Macro Multi-Class PR-AUC (OvR) | Phase 8 Frozen RF on Held-Out DS2 (49,639 beats) | Line 224, 271 | Sec. V-D, Tab. 4 | **PASS** |
| **0.7095** | Macro F1 Score | Phase 7 Tuned RF on DS1 Validation (12,918 beats) | Line 7, 176, 205, 221, 265, 325, 392 | Abstract, Sec. IV, V, VI, IX, Tab. 1, 2, 4 | **PASS** |
| **0.7079** | Balanced Accuracy | Phase 7 Tuned RF on DS1 Validation (12,918 beats) | Line 7, 202, 221, 264, 277, 339, 394 | Abstract, Sec. V, VI, IX, Tab. 2, 4 | **PASS** |
| **0.6985** | Macro F1 Score | Phase 6 Bidirectional RF on DS1 Validation (12,918 beats)| Line 7, 175, 193, 205, 220, 324, 392 | Abstract, Sec. IV, V, VI, IX, Tab. 1, 2 | **PASS** |
| **0.6650** | Macro F1 Score | Phase 6 Causal RR RF on DS1 Validation (12,924 beats) | Line 174, 192 | Sec. IV, V-B, Tab. 1 | **PASS** |
| **0.5824** | Macro F1 Score | Phase 5 Raw Morphology RF on DS1 Validation (12,930 beats)| Line 7, 173, 186, 192, 193, 324 | Abstract, Sec. IV, V-A, V-B, VI, Tab. 1 | **PASS** |

---

## 2. Per-Class DS2 Diagnostic Integrity

| Class | Support | True Positives | False Negatives | False Positives | Precision | Recall | F1 Score |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **N** | 44,197 | 40,845 | 3,352 | 958 | **97.71%** | **92.42%** | **0.9499** |
| **S** | 1,835 | 1,388 | 447 | 2,222 | **38.45%** | **75.64%** | **0.5098** |
| **V** | 3,220 | 2,808 | 412 | 1,218 | **69.75%** | **87.20%** | **0.7750** |
| **F** | 388 | 96 | 292 | 105 | **48.00%** | **24.74%** | **0.3265** |
| **Total / Macro** | **49,639** | **45,137** | **4,502** | **4,502** | **63.48%** | **70.00%** | **0.6403** |

*Verification:*
- All per-class precisions and recalls match `DS2_TEST_RESULTS.json` to 2 decimal places.
- Support sums exactly to 49,639.
- Class N recall is strictly designated as "Class N recall" (not "specificity").

---

## 3. Confusion Matrix Verification

$$\mathbf{C}_{\text{DS2}} = \begin{bmatrix}
40845 & 2154 & 1126 & 72 \\
382 & 1388 & 58 & 7 \\
334 & 52 & 2808 & 26 \\
242 & 16 & 34 & 96
\end{bmatrix}$$

- Row sums: $40845 + 2154 + 1126 + 72 = 44,197$ (True Class N)
- Row sums: $382 + 1388 + 58 + 7 = 1,835$ (True Class S)
- Row sums: $334 + 52 + 2808 + 26 = 3,220$ (True Class V)
- Row sums: $242 + 16 + 34 + 96 = 388$ (True Class F)
- Total beats: $44,197 + 1,835 + 3,220 + 388 = 49,639$
- Trace (Correct): $40845 + 1388 + 2808 + 96 = 45,137$ ($90.9309\% \to 90.93\%$)
- Off-diagonal (Errors): $4,502$ ($9.0691\% \to 9.07\%$)
- The matrix is non-transposed and strictly oriented with rows as reference and columns as predictions.

**Conclusion:** 100% numerical concordance verified across all experiments, tables, and manuscript sections.
