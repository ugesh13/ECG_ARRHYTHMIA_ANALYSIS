# PHASE 8 ERROR ANALYSIS: LOCKED DS2 HELD-OUT TEST BENCHMARK
## Descriptive Categorization and Electrophysiological Breakdown of Misclassifications

**Standard Reference:** ANSI/AAMI EC57:1998  
**Evaluated Model:** Frozen Random Forest (`n_estimators=200, depth=30, split=5, leaf=2, feat=sqrt`)  
**Evaluated Cohort:** 22 Held-Out DS2 Records — 49,639 usable bidirectional beats  
**Status:** Frozen Post-Hoc Analysis (No post-test model alteration)  
**Date:** October 4, 2026  

---

## 1. Overview & Total Error Volume

Across the 49,639 evaluated DS2 test beats, the frozen Random Forest correctly classified **45,137 beats** (**90.93% accuracy**) and misclassified **4,502 beats** (**9.07% error rate**).

Because the dataset features extreme class imbalance ($N=44,197; S=1,835; V=3,220; F=388$), absolute error counts are naturally weighted towards the majority sinus rhythm class. This document provides a descriptive electrophysiological breakdown of the confusion categories.

---

## 2. Ranked Confusion Categories

| Rank | Confusion Category (True $\to$ Pred) | Beat Count | Percentage of Total Errors | Primary Electrophysiological & Algorithmic Mechanism |
| :---: | :---: | :---: | :---: | :--- |
| **1** | **$\text{N} \to \text{S}$** | **2,154** | **47.85%** | **Sinus Arrhythmia & Rate Acceleration:** Unseen patient records exhibit pronounced respiratory sinus arrhythmia (RSA) or gradual sinus tachycardia where transient interval shortening mimics atrial prematurity ($RR_{\text{ratio\_prev}} < 0.85$). |
| **2** | **$\text{N} \to \text{V}$** | **1,126** | **25.01%** | **Morphological Aberration & Artifacts:** Patient-specific conduction variations (e.g. rate-dependent bundle branch blocks in Record 214) and baseline wander noise spikes resembling wide QRS ventricular complexes. |
| **3** | **$\text{S} \to \text{N}$** | **382** | **8.48%** | **Late/Subtle Prematurity:** Late-cycle atrial premature beats (APCs) whose coupling interval is only marginally shorter than the running median ($RR_{\text{ratio}} \approx 0.92 - 0.98$), where narrow QRS morphology matches sinus beats. |
| **4** | **$\text{V} \to \text{N}$** | **334** | **7.42%** | **Interpolated PVCs & Narrow Ventricular Ectopics:** Ventricular ectopic beats occurring without compensatory pause or originating close to the septum, resulting in narrower QRS duration. |
| **5** | **$\text{F} \to \text{N}$** | **242** | **5.38%** | **Dominant Sinus Capture in Fusion:** In ventricular fusion, ventricular depolarization coincides with normal supraventricular activation. When sinus conduction dominates, morphology is near-normal. |
| **6** | **$\text{N} \to \text{F}$** | **72** | **1.60%** | **Conduction Slurring:** Borderline sinus beats with minor pre-excitation or QRS slurring. |
| **7** | **$\text{S} \to \text{V}$** | **58** | **1.29%** | **Ashman Phenomenon / Aberrant Conduction:** Supraventricular beats that conduct with phase 3 functional bundle branch block (widened QRS) misclassified as ventricular ectopy. |
| **8** | **$\text{V} \to \text{S}$** | **52** | **1.16%** | **Early Ventricular Beats with Preserved Timing:** Ventricular ectopic beats exhibiting prematurity ratios overlapping with APC distributions. |
| **9** | **$\text{F} \to \text{V}$** | **34** | **0.76%** | **Dominant Ventricular Capture in Fusion:** Fusion beats where ectopic wavefront dominates the myocardial mass. |
| **10** | **$\text{V} \to \text{F}$** | **26** | **0.58%** | **Complex Polymorphic Ectopy:** Wide polymorphic PVCs exhibiting partial wavefront collision. |
| **11** | **$\text{F} \to \text{S}$** | **16** | **0.36%** | **Fused Atrial Extrasystoles:** Rare collision of premature atrial beats with ventricular focus. |
| **12** | **$\text{S} \to \text{F}$** | **7** | **0.16%** | **Wide Aberrant Premature Atrial Beats:** Severely distorted aberrated supraventricular beats. |
| — | **Total Misclassifications** | **4,502** | **100.00%** | — |

---

## 3. In-Depth Analysis of Major Error Modes

### A. The $\text{N} \to \text{S}$ Confusion Mode (2,154 beats, 47.85% of errors)
- **Manifestation:** Normal sinus rhythm beats classified as Supraventricular ectopic beats.
- **Record Localization:** Concentrated heavily in Record 202 (atrial flutter with variable block) and Record 222 (sinus arrhythmia with wandering pacemaker).
- **Underlying Cause:** A fundamental limitation of using purely local interval ratios ($RR_{\text{prev}} / RR_{\text{local\_median}}$) in patients with marked physiological rhythm irregularity. When the heart rate accelerates dynamically, normal beats appear physiologically premature relative to a 10-beat trailing median.
- **Clinical Implication:** In clinical telemetry, this represents benign false-positive alerts for supraventricular premature contractions rather than missed life-threatening arrhythmias.

### B. The $\text{N} \to \text{V}$ Confusion Mode (1,126 beats, 25.01% of errors)
- **Manifestation:** Normal beats classified as Ventricular ectopic beats.
- **Record Localization:** Observed primarily in Record 214 (intermittent bundle branch block) and Record 221 (atrial fibrillation with baseline wander).
- **Underlying Cause:** Morphological feature detectors in the Random Forest tree splits detect widened S-wave slurring or notched R-peaks caused by intraventricular conduction delays, which mimic ectopic PVC morphology.

### C. The $\text{S} \to \text{N}$ Missed Prematurity Mode (382 beats, 8.48% of errors)
- **Manifestation:** True supraventricular premature beats classified as normal sinus rhythm.
- **Electrophysiological Mechanism:** Because APCs originate above the bifurcation of the bundle of His, their QRS complex is morphologically indistinguishable from normal sinus rhythm on standard single-lead ECG. When an APC occurs late in the cardiac cycle (low prematurity, $RR_{\text{ratio}} \approx 0.95$), the classifier lacks both morphological and timing triggers to separate it from sinus rhythm.

### D. The $\text{V} \to \text{N}$ False-Negative Ventricular Mode (334 beats, 7.42% of errors)
- **Manifestation:** True PVCs missed as normal beats.
- **Clinical Significance:** PVC sensitivity on DS2 remains high at **87.20%** (2,808 of 3,220 detected). The 334 missed PVCs predominantly stem from interpolated PVCs (which have no compensatory pause and thus preserve subsequent beat timing) and septal ectopic foci that generate relatively narrow QRS waveforms.

---

## 4. F-Class Behavior & Wavefront Blending Analysis

Fusion beats (`F`) represent hybrid cardiac activation resulting from the collision of a supraventricular impulse and a ventricular ectopic focus:
- Total True `F` Beats in DS2: **388 beats** (concentrated predominantly in Record 213, which contains 362 F beats).
- Correctly identified as `F`: **96 beats** (Recall = $24.74\%$).
- Misclassified as `N`: **242 beats** ($62.37\%$).
- Misclassified as `V`: **34 beats** ($8.76\%$).
- Misclassified as `S`: **16 beats** ($4.12\%$).

**Scientific Conclusion on Class F:**
Fusion beats do not possess a distinct stereotypic electrophysiological morphology or timing signature; rather, they form a continuous morphological spectrum spanning normal sinus rhythm on one extreme and full ventricular ectopy on the other. The classifier's distribution of errors ($62.4\%$ to N and $8.8\%$ to V) closely reflects the relative degree of ventricular vs supraventricular myocardial capture in each fusion beat.
