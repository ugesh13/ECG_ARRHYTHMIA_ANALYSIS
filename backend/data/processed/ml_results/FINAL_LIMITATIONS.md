# FORMAL METHODOLOGICAL & CLINICAL LIMITATIONS

**Standard Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Database:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`)  
**Scope:** Academic Research Benchmark Constraints  

---

To preserve scientific rigor and prevent clinical over-interpretation, the following formal limitations are documented:

1. **Benchmark Nature of the Dataset:**  
   The findings of this study are derived exclusively from the PhysioNet MIT-BIH Arrhythmia Database (`mitdb`). While this database serves as a foundational international research benchmark, it represents an idealized, curated archive that does not encompass the full clinical heterogeneity of modern cardiac telemetry.

2. **Historical Dataset Characteristics:**  
   The MIT-BIH recordings were acquired between 1975 and 1979 using analog reel-to-reel Holter recorders and early digital conversion hardware (11-bit, 360 Hz). Modern hospital monitoring systems utilize 12-lead to 24-lead digital acquisition at 500–1000 Hz with higher bit-depths and different analog front-end filtering.

3. **Absence of External Dataset Validation:**  
   The model has not been evaluated on external multi-center databases (e.g. the INCART 12-Lead Database, the European ST-T Database, or the PhysioNet/Computing in Cardiology Challenge datasets). Consequently, cross-dataset transportability remains unverified.

4. **Absence of Prospective Clinical Validation:**  
   No prospective clinical trial, bedside evaluation, or real-time clinical workflow testing was performed. Performance reported herein is purely retrospective.

5. **Extreme Class Imbalance & Metric Sensitivity:**  
   The dataset exhibits severe natural class imbalance ($N > 89\%$). While cost-sensitive balanced weighting mitigated majority-class bias, metrics on minority classes—especially Class S and Class F—remain highly sensitive to individual false positives and class prevalence shifts.

6. **Class F (Fusion) Sampling Concentration:**  
   Within the held-out DS2 test partition, 93.3% of all true fusion beats (362 of 388) originate from a single patient recording (Record 213). Consequently, F-class metrics reflect high sampling concentration and patient-specific morphology rather than broad generalized fusion detection.

7. **Offline Bidirectional Timing Formulation:**  
   The finalized model utilizes prospective cardiac interval timing (`RR_next`, `HR_next`, `RR_ratio_bidi`, `RR_bidi_diff`). Because these features require the timing of the subsequent heartbeat, the pipeline is strictly suitable for offline/retrospective Holter analysis and cannot be applied in instantaneous causal streaming without introducing algorithmic latency.

8. **Reliance on Expert Reference Annotations:**  
   Heartbeat segmentation, window alignment, and RR-interval calculations were derived from human cardiologist reference annotations. In real-world deployment, automated beat detection algorithms must be used, which inevitably introduce R-peak jitter, false-positive detections, and missed beats that degrade downstream classification accuracy.

9. **Absence of an Automated Real-Time QRS Detector:**  
   The current experimental pipeline does not incorporate an end-to-end automated QRS detector. The reported benchmark represents classifier performance given verified fiducial markers.

10. **Per-Beat Normalization Constraints:**  
    Local per-beat z-score normalization standardizes voltage amplitude within each 200-sample window ($z_i = (x_i - \mu)/\sigma$). While this effectively eliminates baseline drift and subject-level impedance variations, it discards absolute millivolt amplitude, which carries clinical significance in left ventricular hypertrophy or low-voltage states.

11. **Model Interpretability Boundaries:**  
    Feature importance metrics reported herein represent model-level Gini impurity reductions across Random Forest splits. Gini importances quantify predictive split frequency within the learned trees and must not be interpreted as independent causal biological drivers.

12. **Non-Clinical Research Disclaimer:**  
    This software, pipeline, and trained model are developed strictly for academic research and educational benchmark purposes. The system is **NOT** a medical diagnostic device, clinical decision support system, or medical alarm monitor, and must **NEVER** be used for patient diagnosis or clinical treatment selection.
