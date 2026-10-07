# PHASE 6 FEATURE IMPORTANCE AUDIT
## Random Forest Gini Impurity Analysis: Morphology vs Temporal Descriptors

**Target Model:** Random Forest Classifier (100 trees, balanced weights, seed=42)  
**Feature Space:** 200 Raw Voltage Amplitudes (`ECG_000`–`ECG_199`) + 9 Bidirectional RR Descriptors (Total D=209)  
**Date:** October 4, 2026  

---

## 1. Feature Category Allocation & Dimensionality Proportion

| Feature Category | Feature Count | Proportion of Feature Space | Total Gini Importance | Relative Weight |
| :--- | :---: | :---: | :---: | :---: |
| **ECG Morphology Samples (`ECG_000`–`ECG_199`)** | 200 | 95.69% (200/209) | ~0.7845 | 78.45% |
| **Temporal / RR Intervals & Heart Rates** | 9 | 4.31% (9/209) | ~0.2155 | **21.55%** |
| **Total** | **209** | **100.00%** | **1.0000** | **100.00%** |

> [!NOTE]
> Temporal features constitute only **4.31% of the feature vector dimensionality** (9 out of 209), yet they capture **21.55% of the total Gini splitting importance** in the trained Random Forest model.

---

## 2. Temporal Features Individual Importance Breakdown

All 9 temporal features ranked by individual Gini importance in the 209-feature Random Forest model:

| Rank (in Temporal) | Overall Rank (out of 209) | Feature Identifier | Feature Type | Gini Importance | Description / Diagnostic Role |
| :---: | :---: | :--- | :---: | :---: | :--- |
| **1** | **1** | `RR_ratio_prev` | Prematurity Ratio | **5.82%** | $RR_{\text{prev}} / RR_{\text{local\_median}}$ — primary detector of premature beats (APCs & PVCs) |
| **2** | **2** | `RR_ratio_bidi` | Coupling Ratio | **4.91%** | $RR_{\text{prev}} / RR_{\text{next}}$ — distinguishes compensatory pauses from non-compensatory pauses |
| **3** | **4** | `RR_prev` | Interval Duration | **3.24%** | Preceding cycle length in seconds |
| **4** | **7** | `RR_dev_prev` | Fractional Deviation | **2.41%** | $(RR_{\text{prev}} - \text{median}) / \text{median}$ — mathematically affine to $RR_{\text{ratio\_prev}}$ |
| **5** | **8** | `RR_next` | Post-Extrasystolic Pause | **2.18%** | Subsequent cycle length in seconds |
| **6** | **10** | `HR_prev` | Instantaneous Heart Rate | **1.85%** | $60 / RR_{\text{prev}}$ in bpm — inverse nonlinear transform of $RR_{\text{prev}}$ |
| **7** | **15** | `RR_bidi_diff` | Interval Asymmetry | **1.12%** | $RR_{\text{next}} - RR_{\text{prev}}$ — interval step difference |
| **8** | **42** | `RR_local_median` | Running Local Baseline | **0.02%** | Running median of previous 10 intervals |
| **9** | **89** | `HR_next` | Subsequent Heart Rate | **<0.01%** | $60 / RR_{\text{next}}$ in bpm |
| **—** | **—** | **Sum of Temporal Features** | — | **21.55%** | — |

---

## 3. Feature Redundancy & Mathematical Coupling

The feature set contains exact mathematical relationships:
1. **$HR_{\text{prev}} = \frac{60}{RR_{\text{prev}}}$:** Exact inverse nonlinear transform of $RR_{\text{prev}}$.
2. **$RR_{\text{dev\_prev}} = RR_{\text{ratio\_prev}} - 1$:** Exact affine transformation (shift of $-1$) of $RR_{\text{ratio\_prev}}$.

Because these features contain mathematically redundant information:
- Their individual Gini importances reflect tree split competition rather than separate orthogonal physiological phenomena.
- `RR_ratio_prev` (5.82%) and `RR_dev_prev` (2.41%) split their shared information across different trees.
- `RR_prev` (3.24%) and `HR_prev` (1.85%) likewise share monotonic ranking information.

---

## 4. Scientific Note on Model Importance vs. Clinical Causality

> [!WARNING]
> *Model-level Gini feature importance reflects internal split frequencies in the trained ensemble and must NOT be interpreted as independent causal contributions or clinical diagnostic proof.*
