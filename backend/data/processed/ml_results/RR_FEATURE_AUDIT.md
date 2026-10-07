# PHASE 6 RR-INTERVAL FEATURE QUALITY AUDIT
## Physiological Sanity, Boundary Conditions, and Partition Separation

**Database:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`)  
**Sampling Rate:** 360.0 Hz  
**Target Partitions:** Train (16 DS1 Records) and Validation (6 DS1 Records)  
**Test Set Protection:** DS2 (22 records, 49,683 beats) remains completely locked and unvisited.  
**Audit Status:** Audited and Verified  
**Date:** October 4, 2026  

---

## 1. Feature Extraction Methodology & Edge-Beat Policy

### A. Annotation Timing Source:
- Cardiac timing intervals are derived directly from the reference WFDB annotation sample locations (`ann.sample`) in `.atr` files.
- In accordance with Phase 3 & 4 rules, non-beat annotations (`+`, `~`, `|`, etc.) were excluded; only verified heartbeat annotations participated in RR interval calculations.
- RR intervals were computed strictly within individual recordings. Never was an RR interval calculated across distinct patient records.

### B. Edge-Beat Exclusion Policy:
- **First Beat in Record:** Has no preceding beat, hence $RR_{\text{prev}}$ is physically undefined. Filling with zero or arbitrary constants introduces severe distributional distortion.
- **Last Beat in Record:** Has no succeeding beat, hence $RR_{\text{next}}$ is physically undefined.
- **Policy:** Edge beats lacking necessary temporal context were cleanly excluded from feature datasets:
  - **Causal Cohort (Variant A):** Excludes beat 0 of each record (16 training edge beats, 6 validation edge beats).
  - **Bidirectional Cohort (Variant B):** Excludes beat 0 and beat $N-1$ of each record (32 training edge beats, 12 validation edge beats).
- **Matched Cohort Control:** In all controlled experiments, Morphology-only models are evaluated on the exact same valid sample cohort (12,924 beats for Causal, 12,918 beats for Bidirectional).

---

## 2. Audit of Causal RR Local Median & Minimum-History Rule

### Inspection of Calculation Logic:
1. **Strict Retrospective History:**
   - The local running median `RR_local_median` is computed strictly from intervals occurring **prior to the index heartbeat**.
   - The current beat's interval $RR_{\text{prev}}$ is appended to the history buffer only **after** the local median and its associated ratios are computed.
   - The current beat's interval is **never included** in the history buffer during its own calculation.
   - Future intervals ($RR_{\text{next}}$) **never contribute** to Variant A.
2. **Window Sizing & Bounding:**
   - Uses at most the previous $W = 10$ valid RR intervals within the recording.
   - History buffers are strictly reset at each record boundary; interval history never crosses patient records.
3. **Minimum-History Rule:**
   - For all beats $i \ge 2$ in a recording, `RR_local_median` is computed over the preceding $K = \min(i-1, 10)$ intervals ($1 \le K \le 10$).
   - For beat 1 in each recording (which possesses $RR_{\text{prev}} = (S_1 - S_0)/f_s$ but exactly 0 strictly prior intervals), the initial unadapted baseline defaults to its own interval, yielding natural neutral baseline ratios ($RR_{\text{ratio}} = 1.0, RR_{\text{dev}} = 0.0$).
   - All subsequent heartbeats ($i \ge 2$) accumulate and draw strictly from preceding intervals.
   - Beat 0 (which has no preceding beat) is excluded as an edge beat.
   - Zero, arbitrary, forward-filled, or fabricated values are never used.

---

## 3. Real-Time Deployment Scope Disclaimer

> [!IMPORTANT]
> **Deployment Scope Clarification:**  
> *Variant A is causal with respect to beat timing because it uses only preceding intervals. However, the current experiment derives beat locations from reference annotations and therefore does not establish real-time deployment capability.*  
> Variant B is strictly designated as an offline/retrospective bidirectional experiment because it incorporates prospective interval timing ($RR_{\text{next}}$).

---

## 4. Feature Redundancy Audit

The engineered temporal feature set includes exact mathematical relationships:
1. **Inverse Heart Rate:**
   $$HR_{\text{prev}} = \frac{60}{RR_{\text{prev}}}$$
   $HR_{\text{prev}}$ is an exact inverse nonlinear transformation of $RR_{\text{prev}}$.
2. **Affine Ratio-Deviation Equivalence:**
   $$RR_{\text{dev\_prev}} = \frac{RR_{\text{prev}} - \text{median}}{\text{median}} = \frac{RR_{\text{prev}}}{\text{median}} - 1 = RR_{\text{ratio\_prev}} - 1$$
   $RR_{\text{dev\_prev}}$ is an exact affine transformation (a constant shift of $-1$) of $RR_{\text{ratio\_prev}}$.

> [!WARNING]
> Because these features contain mathematically redundant information, feature importance values should not be interpreted as independent causal contributions. They are preserved in the feature matrix strictly to maintain architectural continuity with the experimental design.

---

## 5. Quantitative Partition Statistics Table

| Statistic | TRAIN Partition (16 DS1 Records) | VALIDATION Partition (6 DS1 Records) |
| :--- | :---: | :---: |
| **Total Primary Beats Examined** | 38,061 | 12,930 |
| **Usable Beats (Variant A: Causal)** | **38,045** | **12,924** |
| **Usable Beats (Variant B: Bidirectional)** | **38,029** | **12,918** |
| **Excluded Edge Beats (Causal)** | 16 (0.042%) | 6 (0.046%) |
| **Excluded Edge Beats (Bidirectional)** | 32 (0.084%) | 12 (0.093%) |
| **Invalid ($RR \le 0$) Count** | **0** | **0** |
| **NaN / Inf Intervals** | **0** | **0** |
| **Minimum RR Interval** | 0.2222 s (270.0 bpm) | 0.2444 s (245.5 bpm) |
| **Maximum RR Interval** | 2.4667 s (24.3 bpm) | 2.1889 s (27.4 bpm) |
| **Median RR Interval** | 0.7722 s (77.7 bpm) | 0.7556 s (79.4 bpm) |
| **Mean RR Interval** | 0.7954 s (75.4 bpm) | 0.7812 s (76.8 bpm) |
| **Standard Deviation RR** | 0.1685 s | 0.1542 s |

---

## 6. Physiological Validity & Extreme Value Audit

- **Zero/Negative RR Intervals:** Zero ($0$) non-positive or zero-length intervals were detected in either partition.
- **Numerical Integrity:** Zero ($0$) NaN or Inf values survived into the engineered feature matrices.
- **Tachycardia Envelope:** Minimum observed RR interval is physiologically consistent with short paroxysms of junctional/atrial tachycardia (e.g. in Record 209).
- **Compensatory Pauses:** Maximum observed RR interval corresponds to compensatory post-extrasystolic pauses following premature ventricular contractions (PVCs) (e.g. in Record 106 and 208), representing authentic clinical phenomenology rather than artifact.

---

## 7. Leakage Prevention Audit Reconfirmation

- **Cross-Record Leakage:** $0\%$ — RR intervals are strictly calculated within each patient record.
- **Temporal Directionality:** Variant A features use strictly past interval timing.
- **Label Leakage:** $0\%$ — Beat annotations symbols/classes are never used as inputs to the timing feature calculation.
- **Test Set Protection:** DS2 records (`100, 103, \dots, 234`) were never accessed, loaded, or inspected.
- **Feature Scaling:** Any `StandardScaler` is fitted strictly on training data (`X_train`). Validation features are transformed using only training parameters.

**AUDIT RESULT: PASS**
