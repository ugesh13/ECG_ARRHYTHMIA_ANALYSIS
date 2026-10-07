# PHASE 12 REFERENCE & CITATION AUDIT REPORT

**Protocol Reference:** ANSI/AAMI EC57:1998  
**Manuscript Target:** `backend/data/processed/ml_results/FINAL_RESEARCH_MANUSCRIPT.md`  
**Execution Timestamp:** October 4, 2026  
**Status:** COMPLETE & INDEPENDENTLY AUDITED [PASS]  

---

## 1. Audit Overview Metrics

| Audit Metric | Value | Audit Notes |
| :--- | :---: | :--- |
| **Initial Citation Placeholders** | **46** | 32 in-text `[CITATION REQUIRED]` markers + 14 bibliography markers |
| **Total Verified References** | **14** | All 14 candidate references verified against primary publisher records |
| **Total Unresolved Placeholders** | **0** | All placeholders resolved with verified academic sources |
| **Total Removed References** | **0** | No reference was unverified or removed |
| **Total Modified / Clarified Claims** | **5** | Conservative claim wording adjustments and citation consolidation |
| **Final In-Text Citation Calls** | **30** | Mapped sequentially from `[1]` through `[14]` |
| **Final Bibliography Entries** | **14** | Fully formatted in standard IEEE style with verified DOIs/ISBNs |
| **Fabricated References Detected** | **0** | Strict zero-fabrication protocol enforced |
| **ML Pipeline Modifications** | **0** | All ML code, weights, features, and test splits remain 100% frozen |
| **DS2 Benchmark Result Modifications** | **0** | All test metrics, confusion matrix, and tables remain 100% invariant |

---

## 2. In-Text Citation Placement and Rationales

Each of the 30 in-text citation instances was audited against the immediate prior statement:

1. **Section 1 (Line 19) — `[1]` Sörnmo & Laguna (2005):**  
   *Claim:* ECG is the primary non-invasive clinical diagnostic modality for monitoring the cardiac electrical conduction system.  
   *Verdict:* KEEP. Chapter 1 & 7 of Sörnmo & Laguna comprehensively establish this foundation.

2. **Section 1 (Line 19) — `[2]` Mark et al. (1982):**  
   *Claim:* Continuous ambulatory Holter monitoring records hundreds of thousands of cardiac cycles, making manual beat-by-beat inspection labor-intensive and fatigue-prone.  
   *Verdict:* KEEP. Mark et al. directly motivate the MIT-BIH database by citing this exact human interpretation bottleneck.

3. **Section 1 (Line 23) — `[3]` Luz et al. (2016):**  
   *Claim:* Normal sinus rhythm beats overwhelmingly dominate ambulatory recordings (>89%), while ectopics form minority fractions.  
   *Verdict:* KEEP. Luz et al. document class distributions across benchmark Holter databases.

4. **Section 1 (Line 24) — `[4]` Josephson (2015):**  
   *Claim:* Ventricular ectopic beats originate in the myocardium with wide QRS complexes, whereas supraventricular ectopic beats originate above the His bundle bifurcation and conduct via the intrinsic His-Purkinje network, preserving normal QRS morphology.  
   *Verdict:* KEEP. Foundational electrophysiological distinction directly established in Josephson.

5. **Section 1 (Line 25) — `[1]` Sörnmo & Laguna (2005):**  
   *Claim:* Cardiac electrophysiology varies between individuals due to thoracic anatomy, electrode placement, and autonomic tone.  
   *Verdict:* KEEP. Directly covered in Sörnmo & Laguna.

6. **Section 1 (Line 25) — `[5]` de Chazal et al. (2004):**  
   *Claim:* Intra-patient data leakage from randomly shuffling heartbeats into train and test sets produces fraudulently optimistic test accuracies (>98%) that fail on unseen patients.  
   *Verdict:* KEEP. Central premise and experimental demonstration of de Chazal et al. (2004).

7. **Section 1 (Line 27) — `[4]` Josephson (2015):**  
   *Claim:* Pathological ectopics occur prematurely; ventricular ectopics are typically followed by a fully compensatory pause.  
   *Verdict:* KEEP. Josephson establishes cardiac refractoriness, retrograde conduction block, and compensatory pauses.

8. **Section 1 (Line 29) — `[6]` ANSI/AAMI EC57 (1998):**  
   *Claim:* Evaluating machine-learning heartbeat classification under the ANSI/AAMI EC57 standard.  
   *Verdict:* KEEP. Official reporting standard.

9. **Section 1 (Line 32) — `[5]` de Chazal et al. (2004):**  
   *Claim:* Record-level partitioning strategy across 44 non-paced MIT-BIH recordings following the canonical de Chazal et al. division.  
   *Verdict:* KEEP. Exact origin of the 44-record DS1/DS2 partition.

10. **Section 2.1 (Line 47) — `[2]` Mark et al. (1982):**  
    *Claim:* MIT-BIH Arrhythmia Database established by Mark et al.  
    *Verdict:* KEEP. Original database description.

11. **Section 2.1 (Line 47) — `[7]` Goldberger et al. (2000):**  
    *Claim:* MIT-BIH made accessible via PhysioNet.  
    *Verdict:* KEEP. Canonical PhysioNet platform reference.

12. **Section 2.1 (Line 47) — `[6]` ANSI/AAMI EC57 (1998):**  
    *Claim:* AAMI introduced the ANSI/AAMI EC57 standard defining heartbeat grouping categories and standardized metrics.  
    *Verdict:* KEEP. Direct standard reference.

13. **Section 2.2 (Line 50) — `[5]` de Chazal et al. (2004):**  
    *Claim:* Early literature evaluated algorithms with random beat partitioning causing intra-patient leakage.  
    *Verdict:* KEEP.

14. **Section 2.2 (Line 50) — `[8]` Llamedo & Martínez (2011):**  
    *Claim:* Database generalization and feature selection driven by patient-independent criteria.  
    *Verdict:* KEEP. Title verified as "driven by database generalization criteria".

15. **Section 2.2 (Line 50) — `[3]` Luz et al. (2016):**  
    *Claim:* Comprehensive survey demonstrating leakage effects and patient-oriented splitting.  
    *Verdict:* KEEP.

16. **Section 2.2 (Line 50) — `[5]` de Chazal et al. (2004):**  
    *Claim:* Canonical 44-record inter-patient split dividing non-paced records into DS1 and DS2.  
    *Verdict:* KEEP.

17. **Section 2.3 (Line 53) — `[9]` Köhler et al. (2002):**  
    *Claim:* Segmenting localized voltage waveforms around QRS fiducial markers.  
    *Verdict:* KEEP. Landmark review of QRS fiducial marker identification.

18. **Section 2.3 (Line 53) — `[3]` Luz et al. (2016):**  
    *Claim:* Prior studies exploring raw amplitude sampling, discrete wavelet transform coefficients, Hermite polynomials, and higher-order statistics.  
    *Verdict:* CONSOLIDATED & KEPT. In accordance with Section 15 (avoiding citation dumping), the 4 individual sub-phrase placeholders were consolidated into a single survey citation `[3]` at the sentence termination, as Luz et al. explicitly review all four representations.

19. **Section 2.3 (Line 53) — `[1]` Sörnmo & Laguna (2005):**  
    *Claim:* Preprocessing steps requiring baseline wander elimination via digital filtering or moving-average subtraction, and local amplitude normalization.  
    *Verdict:* KEEP. Sörnmo & Laguna detail moving-average subtraction and normalizations.

20. **Section 2.4 (Line 56) — `[4]` Josephson (2015):**  
    *Claim:* Ectopic prematurity and prolonged compensatory pause electrophysiology.  
    *Verdict:* KEEP.

21. **Section 2.4 (Line 56) — `[10]` Hu et al. (1997):**  
    *Claim:* Early implementation of local pre- and post-RR interval ratios.  
    *Verdict:* KEEP. Landmark mixture-of-experts paper using local interval features.

22. **Section 2.4 (Line 56) — `[5]` de Chazal et al. (2004):**  
    *Claim:* Pre- and post-RR interval ratios normalizing heart rate variations.  
    *Verdict:* KEEP.

23. **Section 2.5 (Line 59) — `[11]` Breiman (2001):**  
    *Claim:* Random Forests ensemble algorithm.  
    *Verdict:* KEEP. Canonical algorithmic reference.

24. **Section 2.5 (Line 59) — `[12]` Mondéjar-Guerra et al. (2019):**  
    *Claim:* Random Forests and classifier ensembles proven effective for ECG classification under AAMI standards.  
    *Verdict:* KEEP. Title and venue verified.

25. **Section 2.6 (Line 62) — `[3]` Luz et al. (2016):**  
    *Claim:* Ambulatory ECG data exhibit severe natural class imbalance.  
    *Verdict:* KEEP.

26. **Section 2.6 (Line 62) — `[13]` King & Zeng (2001):**  
    *Claim:* Cost-sensitive loss weighting for rare events data.  
    *Verdict:* KEEP. Classic statistical reference for inverse-weighting and prior correction.

27. **Section 3.1 (Line 69) — `[7]` Goldberger et al. (2000):**  
    *Claim:* PhysioNet MIT-BIH Arrhythmia Database repository description.  
    *Verdict:* KEEP. Standard PhysioNet citation.

28. **Section 3.2 (Line 72) — `[6]` ANSI/AAMI EC57 (1998):**  
    *Claim:* ANSI/AAMI EC57 guidelines mandating paced record isolation.  
    *Verdict:* KEEP.

29. **Section 3.9 (Line 122) — `[5]` de Chazal et al. (2004):**  
    *Claim:* Canonical de Chazal et al. record partitioning.  
    *Verdict:* KEEP.

30. **Section 3.12 (Line 155) — `[14]` Brodersen et al. (2010):**  
    *Claim:* Mathematical formulation of Balanced Accuracy as unweighted mean class recall.  
    *Verdict:* ADDED & VERIFIED. Explicitly links Balanced Accuracy metric to its seminal ICPR formulation.

---

## 3. Metadata Corrections Made During Audit

During independent verification, three critical discrepancies in prior notes were resolved:

1. **de Chazal et al. (2004):**
   - *Previous Working Note Title:* "A patient-adapting ECG beat classifier using ECG morphology and heartbeat intervals" (Confused with their 2006 paper in Vol. 53, No. 12).
   - *Verified Authentic Title:* "Automatic classification of heartbeats using ECG morphology and heartbeat interval features", *IEEE Transactions on Biomedical Engineering*, vol. 51, no. 7, pp. 1196–1206, 2004. DOI: 10.1109/TBME.2004.827359.

2. **Mondéjar-Guerra et al. (2019):**
   - *Previous Working Note Title:* "Heartbeat classification using support vector machines, random forest and ensemble techniques", Vol. 52, pp. 289–299.
   - *Verified Authentic Title:* "Heartbeat classification fusing temporal and morphological information of ECGs via ensemble of classifiers", *Biomedical Signal Processing and Control*, vol. 47, pp. 41–48, 2019. DOI: 10.1016/j.bspc.2018.08.007.

3. **Llamedo & Martínez (2011):**
   - *Previous Working Note Title:* "...driven by database generalizations"
   - *Verified Authentic Title:* "Heartbeat classification using feature selection driven by database generalization criteria", *IEEE Transactions on Biomedical Engineering*, vol. 58, no. 3, pp. 616–625, 2011. DOI: 10.1109/TBME.2010.2068048.

---

## 4. Claim Strength & Novelty Audit

A full lexical scan was conducted across the manuscript for overclaiming language:

- **"proves":** 0 occurrences found.
- **"state-of-the-art":** 0 occurrences found.
- **"first":** 0 occurrences found.
- **"novel":** 0 occurrences found.
- **"superior":** 1 occurrence in conclusion ("superior transparency") replaced with conservative phrasing ("high transparency").
- **"establishes":** 1 occurrence in Section 1 ("The study establishes an exact accounting framework...") adjusted to conservative phrasing ("The study implements an exact accounting framework...").
- **"diagnostic":** Occurrences in Section 5.5 and Section 4 ("diagnostic gain/performance") refined to "classification gain/performance" to prevent clinical conflation.
- **"clinical":** Every clinical mention is strictly accompanied by the required disclaimers ("This should not be interpreted as evidence of clinical generalization"; "The study is an academic benchmark evaluation and does not establish prospective clinical efficacy").
- **"causal":** Used strictly to denote signal processing temporal causality (past samples only) with explicit reminders that tree Gini importances do not denote biological causality.

---

## 5. Bibliography Consistency Verification

- Every in-text citation marker (`[1]` through `[14]`) corresponds to an existing, verified entry in the References section.
- Every References entry is cited at least once in the main body text.
- Citation numbering follows strictly ascending order of first appearance (`[1]` to `[14]`).
- Zero duplicate entries exist.
- Zero fabricated bibliographic entries exist.
- Zero unresolved `[CITATION REQUIRED]` markers remain.

**AUDIT CONCLUSION: PASS — ALL CITATIONS FULLY VERIFIED AND INTEGRATED.**
