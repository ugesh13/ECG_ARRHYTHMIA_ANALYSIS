# RESEARCH CONCLUSION

**Standard Reference:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Database:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`)  
**Evaluated Architecture:** Frozen Random Forest Classifier ($D = 209$)  

---

This research investigated automated heartbeat classification according to the ANSI/AAMI EC57 four-class standard (Normal sinus rhythm, Supraventricular ectopic, Ventricular ectopic, and Ventricular fusion) using classical machine-learning ensembles on the PhysioNet MIT-BIH Arrhythmia Database. To prevent artificial performance inflation from intra-patient beat correlation, the entire 44-record non-paced dataset (100,586 usable heartbeats) was partitioned strictly at the patient level following the canonical de Chazal protocol, isolating 22 held-out patient recordings (DS2, 49,639 beats) for a single final benchmark evaluation.

### Synthesis of Core Questions:

1. **What was developed?**  
   A deterministic, reproducible 209-dimensional feature engineering and classical machine-learning pipeline combining 200 preprocessed raw ECG voltage samples (555 ms window around reference R-peaks, moving-average baseline wander removal with $W=217$ samples, and per-beat z-score normalization) with 9 canonical bidirectional RR-interval timing features, classified using a balanced Random Forest ensemble.

2. **What was evaluated?**  
   The isolated and synergistic contributions of waveform morphology and cardiac cycle timing features were systematically evaluated across baseline models, matched-cohort controls, 4-fold record-grouped cross-validation, and an independent held-out test cohort.

3. **What did morphology contribute?**  
   Waveform morphology provided effective baseline discrimination for normal sinus rhythm and wide-complex ventricular ectopy (`V` recall = 84.20%), where ventricular depolarization differs markedly from normal activation. However, morphology alone hit a physiological ceiling on supraventricular premature beats (`S` recall = 38.40%), where His-Purkinje conduction preserves normal QRS shape.

4. **What did RR timing contribute?**  
   Incorporating cardiac cycle timing broke this morphological deadlock. Causal interval ratios ($RR_{\text{prev}} / \text{median}$) elevated Class S recall to 61.20% (+22.80%), and bidirectional timing further improved it to 68.40% on validation and 75.64% on held-out test data. In aggregate, the 9 timing features contributed 26.38% of total ensemble split decisions despite comprising only 4.31% of input dimensionality.

5. **What did tuning contribute?**  
   Record-grouped hyperparameter optimization regularized individual tree depth and leaf variance, yielding an incremental gain of +0.0110 in Macro F1 (from 0.6985 to 0.7095). The improvement from RR feature engineering was substantially larger than the subsequent gain from hyperparameter optimization, indicating that feature representation contributed more to the observed validation improvement than the tuning step.

6. **How did the model perform on DS2?**  
   On 49,639 heartbeats from 22 completely unseen patients, the permanently frozen model achieved an overall accuracy of **90.93%**, a balanced accuracy of **70.00%**, and a Macro F1 score of **0.6403**, with high sensitivity for ventricular ectopics (87.20% recall, 69.75% precision) and supraventricular ectopics (75.64% recall, 38.45% precision).

7. **What are the remaining limitations?**  
   The primary residual weaknesses include false-positive supraventricular alarms caused by physiological sinus rate acceleration ($\text{N} \to \text{S}$, 47.85% of all errors), low sensitivity for ventricular fusion beats ($\text{F} \to \text{N}$, 24.74% recall due to dominant supraventricular capture), reliance on retrospective subsequent interval timing ($RR_{\text{next}}$), and dependence on expert human reference annotations.

8. **What is the appropriate interpretation of the findings?**  
   Balanced Accuracy showed relatively little degradation between the validation cohort (0.7079) and the held-out test cohort (0.7000), indicating comparatively stable class-balanced performance across the record-level split. This demonstrates held-out inter-record generalization within the MIT-BIH dataset and should not be interpreted as evidence of clinical generalization. The results establish an offline, interpretable machine-learning reference benchmark for retrospective Holter analysis, demonstrating that classical tree ensembles with domain-engineered features remain highly competitive with complex deep architectures while offering superior transparency and computational efficiency. The system is strictly an academic benchmark and is not approved as a medical diagnostic device.
