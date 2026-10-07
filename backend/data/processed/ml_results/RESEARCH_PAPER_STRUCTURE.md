# RESEARCH PAPER STRUCTURE & BLUEPRINT

**Target Submission Venue:** Biomedical Signal Processing and Control / IEEE Journal of Biomedical and Health Informatics  
**Benchmark Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (2004)  
**Evaluated Architecture:** Frozen Random Forest ($D = 209$)  

---

### Front Matter
- **Title:** Candidate selection from `TITLE_OPTIONS.md`
- **Abstract:** Content from `FINAL_ABSTRACT.md`
- **Keywords:** 8 terms from `FINAL_KEYWORDS.md`

---

### Section 1: Introduction
- Motivation for automated ECG beat classification in ambulatory monitoring.
- Challenges: Severe class imbalance, His-Purkinje morphological mimicry between normal sinus beats and supraventricular ectopics, and intra-patient leakage.
- Motivation for integrating domain-grounded RR interval timing features.
- Primary objectives and summary of verified contributions (`FINAL_CONTRIBUTIONS.md`).

---

### Section 2: Related Work
- Review of ECG databases, with emphasis on the PhysioNet MIT-BIH benchmark (`mitdb`).
- Standard ANSI/AAMI EC57 diagnostic categorization recommendations.
- Methodological critique of intra-patient beat-shuffled splitting vs inter-patient record-level partitioning (de Chazal et al.).
- Morphology-based classification models and their physiological limitations on Class S.
- Cardiac cycle interval feature engineering and compensatory pause dynamics.
- Classical ensemble methods (Random Forest) vs modern architectures under class imbalance.
- Authentic citation insertion guided by `RELATED_WORK_REQUIREMENTS.md`.

---

### Section 3: Dataset and Methodology
- **3.1 Dataset:** PhysioNet MIT-BIH Arrhythmia Database description (48 recordings, 360 Hz, 2 channels).
- **3.2 Record Selection & Paced Isolation:** Isolation of 4 paced recordings (`102, 104, 107, 217`) and selection of primary lead (MLII priority).
- **3.3 AAMI Mapping:** Mapping MIT-BIH symbols to standard 4 classes (`N`, `S`, `V`, `F`) and isolating unclassifiable beats (`Q`).
- **3.4 Beat Extraction:** 200-sample asymmetric windowing around reference R-peaks (90 samples pre-R, 110 samples post-R).
- **3.5 Preprocessing:** Moving-average baseline wander filtering ($W=217$ samples, reflection padding) and local per-beat z-score normalization ($D=200$).
- **3.6 RR Timing Features:** 9 canonical bidirectional timing features (`RR_prev`, `HR_prev`, `RR_local_median`, `RR_ratio_prev`, `RR_dev_prev`, `RR_next`, `HR_next`, `RR_ratio_bidi`, `RR_bidi_diff`). Explicit designation as offline/retrospective.
- **3.7 Boundary Beat Exclusion:** Systematic exclusion of Beat 0 and Beat $N-1$ in each recording (88 total beats across 44 records).
- **3.8 Record-Level Splitting:** Strict inter-patient partitioning into 16 training, 6 validation, and 22 held-out test recordings.
- **3.9 Baseline Models & Cost-Sensitive Learning:** Inverse-frequency class weighting applied to Logistic Regression, Random Forest, and HistGradientBoosting.
- **3.10 Hyperparameter Optimization:** 4-fold `GroupKFold` cross-validation on the 16 training records.
- **3.11 Evaluation Metrics:** Balanced Accuracy, Macro Precision, Macro Recall, Macro F1, Weighted F1, Multi-Class ROC-AUC, and PR-AUC.

---

### Section 4: Experimental Design
- Complete tabular summary of all 5 experimental stages (Table 1: `FINAL_EXPERIMENTAL_DESIGN.csv`).
- Clear separation between model development (Phase 5–7), validation benchmarking (DS1), and single independent test evaluation (DS2, Phase 8).

---

### Section 5: Results
- **5.1 Baseline Morphology Performance:** Phase 5 results ($D=200$, Macro F1 = 0.5824, Class S recall = 38.40%).
- **5.2 Effect of RR Timing Features:** Phase 6 causal timing ($D=205$, Macro F1 = 0.6650) vs bidirectional timing ($D=209$, Macro F1 = 0.6985).
- **5.3 Hyperparameter Optimization:** Phase 7 tuned Random Forest on DS1 validation ($D=209$, Macro F1 = 0.7095, Balanced Accuracy = 70.79%).
- **5.4 Final Held-Out Test Evaluation (DS2):** Phase 8 single evaluation on 22 unseen recordings (49,639 beats: Accuracy = 90.93%, Balanced Accuracy = 70.00%, Macro F1 = 0.6403). Headline results table (Table 2: `FINAL_PERFORMANCE_TABLE.csv`).
- **5.5 Class-Wise Results:** Diagnostic breakdown across `N`, `S`, `V`, `F` (Table 3: `CLASSWISE_DS2_RESULTS.csv` and Figure 6).
- **5.6 Confusion Matrix Analysis:** Absolute counts (Figure 4) and row-normalized percentages (Figure 5).
- **5.7 Generalization from DS1 to DS2:** Analysis of Balanced Accuracy stability (-0.0079) and Macro F1 gap (-0.0692) (Table 4 and Figure 3).
- **5.8 Feature Importance:** Top 15 predictors (Figure 7) and breakdown of the 9 temporal features contributing 26.38% Gini importance (Figure 8 and Table 5).
- **5.9 Record-Level Performance Variation:** Inter-patient accuracy distribution across the 22 test recordings (Figure 9).

---

### Section 6: Discussion
- Synthesis of findings (`FINAL_DISCUSSION.md`).
- Morphological baseline ceilings and the physiological role of prematurity and compensatory pause features.
- Analysis of dominant error modes (sinus rate fluctuations and conduction aberrancy).
- Practical research scope: Retrospective Holter review applicability vs prospective streaming requirements.

---

### Section 7: Limitations
- Comprehensive documentation of all 12 formal limitations (`FINAL_LIMITATIONS.md`).

---

### Section 8: Future Work
- Proposed research directions (`FINAL_FUTURE_WORK.md`).

---

### Section 9: Conclusion
- Final conclusions synthesizing the study (`FINAL_CONCLUSION.md`).

---

### References
- Authentic citations formatted according to target journal guidelines (no fabricated citations; guided by `RELATED_WORK_REQUIREMENTS.md`).
