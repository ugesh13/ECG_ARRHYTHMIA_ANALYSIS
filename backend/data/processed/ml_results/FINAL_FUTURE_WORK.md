# FUTURE RESEARCH DIRECTIONS

**Standard Reference:** ANSI/AAMI EC57:1998  
**Scope:** Proposed Extensions Beyond the Phase 10 Academic Benchmark  
**Status:** FUTURE WORK ONLY (NOT IMPLEMENTED IN CURRENT REPOSITORY)  

---

The findings and limitations established in this study highlight several promising avenues for future computational cardiology research:

1. **Causal Real-Time RR Interval Adaptation:**  
   Future research should extend the causal feature set (Variant A, $D=205$) by designing causal adaptive filters (e.g. Kalman filters or exponential moving averages with dynamic time constants) capable of filtering out respiratory sinus arrhythmia while instantly identifying acute atrial premature contractions, eliminating the need for prospective post-ectopic pause intervals (`RR_next`).

2. **Automated End-to-End QRS Detection Integration:**  
   Investigating the cascading degradation introduced when human reference annotations are replaced with automated QRS detection algorithms (such as the Pan-Tompkins algorithm, Hamilton-Tompkins filter banks, or deep learning R-peak segmenters). Quantifying how fiducial alignment jitter impacts the 200-sample morphology window and interval ratio calculations will bridge the gap toward practical Holter software.

3. **Multi-Database Cross-Cohort Generalization:**  
   Validating the frozen feature extraction pipeline across diverse external multi-lead datasets, including:
   - St. Petersburg Institute of Cardiological Technics 12-lead Arrhythmia Database (INCART)
   - European ST-T Database
   - PhysioNet/Computing in Cardiology Challenge archives (2017, 2020, 2021)  
   Evaluating cross-dataset generalization will determine whether the learned decision boundaries remain robust across different analog acquisition hardware and sampling rates.

4. **Advanced Minority-Class Learning Strategies:**  
   Investigating adaptive cost-sensitive loss formulations, focal loss mechanisms, or class-specific ensemble thresholds to address the severe sampling deficit in Class F (Fusion beats) and enhance the positive predictive value of Class S (Supraventricular ectopics) without inducing false-positive alarms on normal sinus rhythms.

5. **Prospective Clinical Validation:**  
   Designing prospective clinical observational studies in ambulatory telemetry units to evaluate algorithmic utility, alarm burden reduction, and concordance with expert electrophysiologist reviews in live hospital environments.

6. **Probabilistic Calibration & Uncertainty Estimation:**  
   Implementing conformal prediction frameworks, temperature scaling, or isotonic regression to produce well-calibrated posterior probabilities. Providing reliable confidence bounds for predicted heartbeat classes will enable automated referral of ambiguous cardiac complexes to human cardiologists.

7. **Clinically Interpretable Explanations:**  
   Integrating post-hoc interpretability frameworks (such as TreeSHAP or localized surrogate models) to map specific tree split decisions back to standardized clinical ECG intervals (e.g., QRS duration, PR interval prolongation, ST-segment elevation/depression), providing clinicians with physiologically grounded diagnostic justifications.
