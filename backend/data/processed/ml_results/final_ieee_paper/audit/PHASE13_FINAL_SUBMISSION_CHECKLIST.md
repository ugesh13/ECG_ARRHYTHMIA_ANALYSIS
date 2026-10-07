# PHASE 13 — FINAL SUBMISSION CHECKLIST

**Manuscript Title:** Integrating ECG Morphology and Cardiac Timing Features for Inter-Patient Heartbeat Classification: An AAMI EC57 Benchmark Evaluation on the MIT-BIH Database  
**Format:** IEEE Conference / Two-Column Standard (`\documentclass[conference]{IEEEtran}`)  
**Target Path:** `backend/data/processed/ml_results/final_ieee_paper/`  
**Execution Timestamp:** October 4, 2026  

---

## 1. Scientific Content Verification
- [x] **Title:** Matches approved title exactly without alterations.
- [x] **Abstract:** Preserved verbatim from `FINAL_RESEARCH_MANUSCRIPT.md` with exact unrounded metrics (90.93% Acc, 70.00% Bal Acc, 0.6403 Macro F1).
- [x] **Keywords:** IEEE-formatted keywords matching Phase 11/12 verified set.
- [x] **Introduction:** Retains three core challenges, electrophysiological rationale, and exact contributions.
- [x] **Related Work:** Encompasses all six literature themes with exact citation hooks.
- [x] **Methodology:** Sampling (360 Hz), window (90 pre / 110 post), moving-average baseline ($W=217$), local z-score normalization, 9 bidirectional RR features ($D=209$).
- [x] **Experimental Design:** All 5 progression milestones clearly delineated.
- [x] **Results:** Complete numerical results for Phases 5, 6, 7, and 8 without modification.
- [x] **Discussion:** Deep electrophysiological analysis of morphology vs. timing, error categorization, and record-level variability.
- [x] **Limitations:** Complete enumeration of all 12 methodological and non-clinical limitations.
- [x] **Future Work:** Concrete 7-point roadmap for causal streaming and automated QRS detection.
- [x] **Conclusion:** Balanced summary with explicit non-clinical academic benchmark disclaimers.
- [x] **References:** Exactly 14 verified entries in sequential first-appearance order.

---

## 2. Formatting & Document Architecture
- [x] **IEEE Structure:** Formatted with `\documentclass[conference]{IEEEtran}`.
- [x] **Two-Column Layout:** Implemented with proper `\begin{table*}` and `\begin{figure}` sizing.
- [x] **Figures:** 9 figure references mapped with complete captions from `FINAL_FIGURE_CAPTIONS.md`.
- [x] **Tables:** 6 comprehensive tables created with verified unrounded data and captions from `FINAL_TABLE_CAPTIONS.md`.
- [x] **Equations:** Formatted using standard LaTeX `amsmath` environments (z-score, moving average, RR intervals, class weights).
- [x] **Bibliography Engine:** Formatted for standard IEEEtran BibTeX (`\bibliographystyle{IEEEtran}`, `\bibliography{references}`).
- [x] **Conservative Language:** Strictly vetted against exaggerated clinical claims or hype.

---

## 3. Scientific Integrity & Freeze Compliance
- [x] **Zero Model Retraining:** Model weights and architecture frozen.
- [x] **Zero Feature Alterations:** 209-feature definition permanently frozen.
- [x] **Zero Data Leakage:** Inter-patient record-level split strictly preserved.
- [x] **Zero Post-Test Model Selection:** Test set DS2 evaluated exactly once.
- [x] **Zero Metric Alterations:** Accuracy (90.93%), Balanced Accuracy (70.00%), Macro F1 (0.6403) verified across all files.
- [x] **Zero Fabricated Citations:** All 14 references cross-verified against primary publisher databases.
- [x] **Standard Categorization:** ANSI/AAMI EC57:1998 categorized as a standard, not a journal paper.

---

## 4. Metadata & User Replacement Requirements
- [ ] **Author Names:** Clearly marked placeholders preserved in `main.tex` (Line 26).
- [ ] **Institutional Affiliations:** Placeholders preserved in `main.tex` (Line 27).
- [ ] **Author Emails:** Placeholders preserved in `main.tex` (Line 30).
- [ ] **Corresponding Author Designation:** To be designated manually prior to submission.
- [ ] **Target Venue Selection:** Generic IEEE format used; venue-specific copyright / header to be added upon acceptance.
