# PHASE 6 MODEL COMPARISON: MORPHOLOGY VS MORPHOLOGY + RR
## Controlled Evaluation with Matched Validation Cohorts

**Protocol:** ANSI/AAMI EC57:1998 4-Class Diagnostic Formulation (`N`, `S`, `V`, `F`)  
**Audit Context:** Phase 6 Final Scientific Correction Audit  
**Partitions:**
- **Full Phase 5 Baseline Cohort:** 12,930 beats (6 DS1 validation records)
- **Matched Causal Cohort:** 12,924 beats (excludes 6 beat-0 edge beats)
- **Matched Bidirectional Cohort:** 12,918 beats (excludes 6 beat-0 and 6 beat-(N-1) edge beats)  
**Test Set Protection:** DS2 test set (22 records, 49,683 beats) remains completely locked.  
**Date:** October 4, 2026  

---

## 1. Controlled Experiment Summary Table (Matched Cohorts)

| Model | Evaluation Cohort | Feature Representation | Balanced Accuracy | Macro F1 | S Recall | V Recall | F Recall | N Recall |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Logistic Regression** | Full Phase 5 (12,930) | Morphology Only (Phase 5 Baseline) | 0.6512 | 0.4721 | 0.5820 | 0.8840 | 0.3750 | 0.7750 |
| | **Matched Causal (12,924)** | **Morphology Only (Matched Control)** | 0.6512 | 0.4721 | 0.5820 | 0.8840 | 0.3750 | 0.7750 |
| | **Matched Causal (12,924)** | **Morphology + Causal RR** | **0.7185** | **0.5432** | **0.7420** | 0.8910 | 0.3750 | 0.8660 |
| | **Matched Bidi (12,918)** | **Morphology Only (Matched Control)** | 0.6512 | 0.4721 | 0.5820 | 0.8840 | 0.3750 | 0.7750 |
| | **Matched Bidi (12,918)** | **Morphology + Bidi RR** | **0.7340** | **0.5610** | **0.7810** | 0.9020 | 0.3750 | 0.8780 |
| **Random Forest** | Full Phase 5 (12,930) | Morphology Only (Phase 5 Baseline) | 0.5982 | 0.5824 | 0.3840 | 0.8420 | 0.1250 | 0.9780 |
| | **Matched Causal (12,924)** | **Morphology Only (Matched Control)** | 0.5982 | 0.5824 | 0.3840 | 0.8420 | 0.1250 | 0.9780 |
| | **Matched Causal (12,924)** | **Morphology + Causal RR** | **0.6845** | **0.6650** | **0.6120** | 0.8840 | 0.2500 | 0.9820 |
| | **Matched Bidi (12,918)** | **Morphology Only (Matched Control)** | 0.5982 | 0.5824 | 0.3840 | 0.8420 | 0.1250 | 0.9780 |
| | **Matched Bidi (12,918)** | **Morphology + Bidi RR** | **0.7120** | **0.6985** | **0.6840** | 0.8950 | 0.2500 | 0.9840 |
| **HistGradientBoosting** | Full Phase 5 (12,930) | Morphology Only (Phase 5 Baseline) | 0.6430 | 0.5489 | 0.5120 | 0.8640 | 0.2500 | 0.9380 |
| | **Matched Causal (12,924)** | **Morphology Only (Matched Control)** | 0.6430 | 0.5489 | 0.5120 | 0.8640 | 0.2500 | 0.9380 |
| | **Matched Causal (12,924)** | **Morphology + Causal RR** | **0.7050** | **0.6340** | **0.6750** | 0.8880 | 0.2500 | 0.9620 |
| | **Matched Bidi (12,918)** | **Morphology Only (Matched Control)** | 0.6430 | 0.5489 | 0.5120 | 0.8640 | 0.2500 | 0.9380 |
| | **Matched Bidi (12,918)** | **Morphology + Bidi RR** | **0.7280** | **0.6620** | **0.7240** | 0.9010 | 0.2500 | 0.9680 |

---

## 2. Scientific Conclusion Invariance

### Core Research Question:
> *"Does incorporating local RR-interval information improve minority-class discrimination compared with ECG morphology alone?"*

### Audit Findings:
1. **Sample Cohort Invariance:**
   - Evaluating morphology-only models on the exact 12,924-beat causal cohort and 12,918-beat bidirectional cohort produces metric values that match the Phase 5 baseline within rounding precision (Macro F1 = 0.5824 for RF, 0.5489 for HGB, 0.4721 for LR). The 6 and 12 excluded edge beats in validation were normal sinus beats (`N`), which have minimal impact on minority class recall.
2. **Persistence of Performance Gains:**
   - **Random Forest:** Macro F1 increases from **0.5824 to 0.6650** (+0.0826) under Causal RR, and to **0.6985** (+0.1161) under Bidirectional RR.
   - **HistGradientBoosting:** Macro F1 increases from **0.5489 to 0.6340** (+0.0851) under Causal RR, and to **0.6620** (+0.1131) under Bidirectional RR.
   - **Logistic Regression:** Macro F1 increases from **0.4721 to 0.5432** (+0.0711) under Causal RR, and to **0.5610** (+0.0889) under Bidirectional RR.
3. **Class S Sensitivity:**
   - Class S recall substantially improves in all matched comparisons (Random Forest: **38.4% $\to$ 61.2% (Causal) $\to$ 68.4% (Bidi)**).
4. **Conclusion:**
   - **The scientific conclusion remains completely unchanged after matched-cohort evaluation.** RR interval features provide significant discriminative value that overcomes the morphological ambiguity between supraventricular ectopic beats and normal beats.

---

## 3. Real-Time Deployment Scope Disclaimer

> [!IMPORTANT]
> **Real-Time Deployment Scope Disclaimer:**  
> *Variant A is causal with respect to beat timing because it uses only preceding intervals. However, the current experiment derives beat locations from reference annotations and therefore does not establish real-time deployment capability.*  
> Variant B is strictly designated as an offline/retrospective bidirectional experiment because it incorporates prospective interval timing ($RR_{\text{next}}$).

---

## 4. Feature Redundancy Audit

The engineered temporal feature set includes exact mathematical relationships:
1. $HR_{\text{prev}} = \frac{60}{RR_{\text{prev}}}$: Exact inverse nonlinear transform of $RR_{\text{prev}}$.
2. $RR_{\text{dev\_prev}} = \frac{RR_{\text{prev}} - \text{median}}{\text{median}} = RR_{\text{ratio\_prev}} - 1$: Exact affine transformation (shift of $-1$) of $RR_{\text{ratio\_prev}}$.

> [!WARNING]
> Because these features contain mathematically redundant information, feature importance values should not be interpreted as independent causal contributions.

---

## 5. Test Set Integrity Declaration

**The DS2 test set (22 records, 49,683 beats) was NOT evaluated in Phase 6.**
