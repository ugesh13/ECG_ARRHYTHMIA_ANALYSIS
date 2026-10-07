# PHASE 12 REFERENCE VERIFICATION REPORT

**Protocol Reference:** ANSI/AAMI EC57:1998  
**Manuscript Target:** `backend/data/processed/ml_results/FINAL_RESEARCH_MANUSCRIPT.md`  
**Execution Timestamp:** October 4, 2026  
**Status:** ALL 14 CANDIDATE REFERENCES AUDITED AND INDEPENDENTLY VERIFIED [PASS]  

---

## 1. Executive Summary

This audit report documents the formal verification of all academic references integrated into the final research manuscript for the MIT-BIH Arrhythmia Classification Benchmark under ANSI/AAMI EC57. In accordance with Phase 12 guidelines:
1. Zero citations were fabricated.
2. Every author list, article title, journal/conference venue, publication year, volume/issue, page numbers, and DOI / ISBN were cross-verified against official publisher metadata (IEEE Xplore, Circulation / AHA, Elsevier, Springer, Wolters Kluwer, Cambridge University Press).
3. Critical metadata errors in prior working notes were caught and corrected (e.g., de Chazal et al. 2004 title correction; Mondéjar-Guerra et al. 2019 title/volume correction; Llamedo & Martínez 2011 exact title correction).
4. Every in-text citation placement was audited to guarantee that the cited work strictly and directly supports the immediate claim made in the manuscript.

---

## 2. Detailed Verification Records

### Reference [1]
- **Reference ID:** `sornmo2005`
- **Authors:** Leif Sörnmo and Pablo Laguna
- **Title:** *Bioelectrical Signal Processing in Cardiac and Neurological Applications*
- **Venue:** Elsevier Academic Press, Biomedical Engineering Series
- **Year:** 2005
- **Identifier:** ISBN: 978-0-12-437552-9 (Hardcover), 978-0-08-047604-9 (eBook)
- **What Claim It Supports:**
  1. The electrocardiogram as a fundamental non-invasive modality for monitoring cardiac electrical activity.
  2. Inter-subject electrophysiological variability caused by thoracic geometry, electrode placement, and autonomic tone.
  3. Preprocessing requirements including baseline wander removal via digital high-pass and moving-average subtraction, and signal amplitude normalization.
- **Exact Manuscript Sections:** Section 1 (Introduction, Paragraphs 1 & 2), Section 2.3 (Waveform Morphology Representation)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Definitive graduate-level textbook on cardiac bioelectrical signal processing. Chapter 7 covers ECG signal processing, baseline drift removal, and QRS feature extraction.

---

### Reference [2]
- **Reference ID:** `mark1982`
- **Authors:** Roger G. Mark, Paul S. Schluter, George B. Moody, Patrick H. Devlin, and David Chernoff
- **Title:** "An annotated ECG database for evaluating arrhythmia detectors"
- **Venue:** *IEEE Transactions on Biomedical Engineering*, vol. BME-29, no. 8, p. 600 (also published in *Proceedings of the 4th Annual Conference of the IEEE Engineering in Medicine and Biology Society: Frontiers of Engineering in Health Care*, pp. 205–210)
- **Year:** 1982
- **Identifier:** ISSN: 0018-9294
- **What Claim It Supports:**
  1. Ambulatory Holter monitoring recording volume and the substantial burden/fatigue of manual visual beat inspection, motivating automated detectors.
  2. Historical establishment, recording protocol, and expert cardiologist annotation of the MIT-BIH Arrhythmia Database.
- **Exact Manuscript Sections:** Section 1 (Introduction, Paragraph 1), Section 2.1 (Benchmark ECG Databases & Standards)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Canonical original publication describing the MIT-BIH Arrhythmia Database, created in collaboration between the Massachusetts Institute of Technology and Boston's Beth Israel Hospital.

---

### Reference [3]
- **Reference ID:** `luz2016`
- **Authors:** Eduardo José da S. Luz, William Robson Schwartz, Guillermo Cámara-Chávez, and David Menotti
- **Title:** "ECG-based heartbeat classification for arrhythmia detection: A survey"
- **Venue:** *Computer Methods and Programs in Biomedicine*, vol. 127, pp. 144–164
- **Year:** 2016
- **Identifier:** DOI: 10.1016/j.cmpb.2015.12.008
- **What Claim It Supports:**
  1. Extreme natural class imbalance in ambulatory ECG monitoring (>89% normal rhythm).
  2. Critical survey of intra-patient data leakage in early literature caused by beat-level random partitioning.
  3. Comprehensive survey of morphology feature representations (raw amplitudes, discrete wavelet transforms, Hermite polynomials, higher-order statistics).
  4. Class imbalance mitigation strategies in computational electrocardiography.
- **Exact Manuscript Sections:** Section 1 (Introduction, Paragraph 2), Section 2.2 (The Challenge of Data Leakage), Section 2.3 (Waveform Morphology Representation), Section 2.6 (Handling Extreme Class Imbalance)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Comprehensive survey reviewing over a decade of automated ECG classification methodologies, highlighting the division between class-oriented and patient-oriented splitting.

---

### Reference [4]
- **Reference ID:** `josephson2015`
- **Authors:** Mark E. Josephson
- **Title:** *Clinical Cardiac Electrophysiology: Techniques and Interpretations*
- **Venue:** Wolters Kluwer / Lippincott Williams & Wilkins (5th Edition)
- **Year:** 2015
- **Identifier:** ISBN: 978-1-4963-2661-4
- **What Claim It Supports:**
  1. Anatomical and electrophysiological origin of supraventricular ectopic beats above the His bundle bifurcation, conducting antegradely via normal Purkinje fibers and causing morphological mimicry of sinus beats.
  2. Origin of premature ventricular contractions within ventricular myocardium producing wide, aberrant complexes.
  3. Physiological timing mechanisms: premature timing of ectopics and compensatory pauses following ventricular extrasystoles.
- **Exact Manuscript Sections:** Section 1 (Introduction, Paragraphs 2 & 3), Section 2.4 (Cardiac Interval Timing & RR Dynamics)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Gold-standard cardiology reference text on clinical electrophysiology and arrhythmia mechanisms.

---

### Reference [5]
- **Reference ID:** `dechazal2004`
- **Authors:** Philip de Chazal, Maria O'Dwyer, and Richard B. Reilly
- **Title:** "Automatic classification of heartbeats using ECG morphology and heartbeat interval features"
- **Venue:** *IEEE Transactions on Biomedical Engineering*, vol. 51, no. 7, pp. 1196–1206
- **Year:** 2004
- **Identifier:** DOI: 10.1109/TBME.2004.827359
- **What Claim It Supports:**
  1. Introduction and establishment of the canonical 44-record inter-patient partitioning protocol dividing MIT-BIH non-paced recordings into DS1 (train/val) and DS2 (test).
  2. Critique of intra-patient data leakage resulting from random beat shuffling.
  3. Five-class AAMI EC57 benchmark formulation.
  4. Combining ECG morphology features with local pre- and post-RR interval ratios.
- **Exact Manuscript Sections:** Section 1 (Introduction, Paragraphs 2 & 4; Contributions), Section 2.2 (Data Leakage & Inter-Patient Splitting), Section 2.4 (RR Dynamics), Section 3.9 (Record-Level Partitioning)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Title was corrected from an erroneous working title ("A patient-adapting ECG beat classifier...", which was their 2006 paper). The 2004 paper established the DS1/DS2 inter-patient benchmark protocol.

---

### Reference [6]
- **Reference ID:** `aami1998`
- **Authors:** Association for the Advancement of Medical Instrumentation (AAMI)
- **Title:** *Testing and reporting performance results of cardiac rhythm and ST-segment measurement algorithms*
- **Venue:** ANSI/AAMI EC57:1998, Arlington, VA: AAMI
- **Year:** 1998
- **Identifier:** Standard ID: ANSI/AAMI EC57:1998 (Reaffirmed 2008)
- **What Claim It Supports:**
  1. Standardized five-class heartbeat taxonomy (`N`, `S`, `V`, `F`, `Q`) and reporting conventions.
  2. Protocol guidelines requiring the isolation and separate reporting of paced recordings and pacing artifacts.
  3. Class-specific sensitivity, positive predictivity, and false-positive reporting guidelines.
- **Exact Manuscript Sections:** Section 1 (Introduction, Paragraph 4), Section 2.1 (Benchmark Standards), Section 3.2 (Paced Record Isolation), Section 3.3 (AAMI Label Mapping)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Official ANSI-approved medical instrumentation standard. Reaffirmed in 2008 and updated in 2012 as ANSI/AAMI EC57:2012/(R)2020. The 1998 version is the exact version cited by de Chazal et al. (2004) and historical MIT-BIH benchmarks.

---

### Reference [7]
- **Reference ID:** `goldberger2000`
- **Authors:** Ary L. Goldberger, Luis A. N. Amaral, Leon Glass, Jeffrey M. Hausdorff, Plamen Ch. Ivanov, Roger G. Mark, Joseph E. Mietus, George B. Moody, Chung-Kang Peng, and H. Eugene Stanley
- **Title:** "PhysioBank, PhysioToolkit, and PhysioNet: Components of a new research resource for complex physiologic signals"
- **Venue:** *Circulation*, vol. 101, no. 23, pp. e215–e220
- **Year:** 2000
- **Identifier:** DOI: 10.1161/01.CIR.101.23.e215
- **What Claim It Supports:**
  1. PhysioNet public dissemination platform and computational resource hosting the digitized MIT-BIH Arrhythmia Database (`mitdb`).
  2. Open-source standardized software tools and annotations for physiological waveform research.
- **Exact Manuscript Sections:** Section 2.1 (Benchmark ECG Databases & Standards), Section 3.1 (Dataset Description)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Canonical mandate citation for any study utilizing databases hosted on PhysioNet / PhysioBank.

---

### Reference [8]
- **Reference ID:** `llamedo2011`
- **Authors:** Mariano Llamedo and Juan Pablo Martínez
- **Title:** "Heartbeat classification using feature selection driven by database generalization criteria"
- **Venue:** *IEEE Transactions on Biomedical Engineering*, vol. 58, no. 3, pp. 616–625
- **Year:** 2011
- **Identifier:** DOI: 10.1109/TBME.2010.2068048
- **What Claim It Supports:**
  1. Inter-patient and cross-database generalization evaluation for ECG heartbeat classification.
  2. Data leakage prevention and feature selection driven by inter-patient performance.
- **Exact Manuscript Sections:** Section 2.2 (The Challenge of Data Leakage & Inter-Patient Splitting)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Title was corrected from "driven by database generalizations" to exact title "driven by database generalization criteria".

---

### Reference [9]
- **Reference ID:** `kohler2002`
- **Authors:** Bert-Uwe Köhler, Carsten Hennig, and Reinhold Orglmeister
- **Title:** "The principles of software QRS detection"
- **Venue:** *IEEE Engineering in Medicine and Biology Magazine*, vol. 21, no. 1, pp. 42–57
- **Year:** 2002
- **Identifier:** DOI: 10.1109/51.993193
- **What Claim It Supports:**
  1. Principles of digital QRS detection, fiducial marker identification, and beat segmentation windowing.
- **Exact Manuscript Sections:** Section 2.3 (Waveform Morphology Representation)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Landmark review paper detailing algorithmic paradigms for QRS detection, filtering, differentiation, and thresholding.

---

### Reference [10]
- **Reference ID:** `hu1997`
- **Authors:** Yu Hen Hu, Surekha Palreddy, and Willis J. Tompkins
- **Title:** "A patient-adaptable ECG beat classifier using a mixture of experts approach"
- **Venue:** *IEEE Transactions on Biomedical Engineering*, vol. 44, no. 9, pp. 891–900
- **Year:** 1997
- **Identifier:** DOI: 10.1109/10.623058
- **What Claim It Supports:**
  1. Early development of localized pre-RR and post-RR interval ratios to capture ectopic prematurity and normalize inter-patient heart rate variability.
- **Exact Manuscript Sections:** Section 2.4 (Cardiac Interval Timing & RR Dynamics)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Pioneer study formulating relative RR interval features for automated ECG classification.

---

### Reference [11]
- **Reference ID:** `breiman2001`
- **Authors:** Leo Breiman
- **Title:** "Random forests"
- **Venue:** *Machine Learning*, vol. 45, no. 1, pp. 5–32
- **Year:** 2001
- **Identifier:** DOI: 10.1023/A:1010933404324
- **What Claim It Supports:**
  1. Theoretical and algorithmic foundation of Random Forest ensembles: bootstrap aggregation (bagging) and random feature subspace selection.
  2. Inherent robustness against overfitting in high-dimensional feature spaces.
- **Exact Manuscript Sections:** Section 2.5 (Classical Machine Learning & Tree Ensembles)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Canonical foundation paper for the Random Forest algorithm. Used strictly to support the general machine learning methodology without implying validation of this specific ECG pipeline.

---

### Reference [12]
- **Reference ID:** `mondejar2019`
- **Authors:** Víctor M. Mondéjar-Guerra, Jesús Novo, Jorge Rouco, Manuel G. Penedo, and Marcos Ortega
- **Title:** "Heartbeat classification fusing temporal and morphological information of ECGs via ensemble of classifiers"
- **Venue:** *Biomedical Signal Processing and Control*, vol. 47, pp. 41–48
- **Year:** 2019
- **Identifier:** DOI: 10.1016/j.bspc.2018.08.007
- **What Claim It Supports:**
  1. Effectiveness of decision tree ensembles (Random Forests) and SVMs fusing morphological and temporal RR information for ECG heartbeat classification under AAMI standards on MIT-BIH.
- **Exact Manuscript Sections:** Section 2.5 (Classical Machine Learning & Tree Ensembles)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Title, volume, and pagination corrected from earlier working draft ("Heartbeat classification using support vector machines, random forest and ensemble techniques", vol 52). Actual paper is vol 47, pp. 41–48 (2019).

---

### Reference [13]
- **Reference ID:** `king2001`
- **Authors:** Gary King and Langche Zeng
- **Title:** "Logistic regression in rare events data"
- **Venue:** *Political Analysis*, vol. 9, no. 2, pp. 137–163
- **Year:** 2001
- **Identifier:** DOI: 10.1093/oxfordjournals.pan.a004868
- **What Claim It Supports:**
  1. Statistical methodology for handling extreme class imbalance using inverse-frequency loss weighting / prior correction.
- **Exact Manuscript Sections:** Section 2.6 (Handling Extreme Class Imbalance)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Classic foundational work on prior correction and cost-sensitive weighting for severe class imbalance.

---

### Reference [14]
- **Reference ID:** `brodersen2010`
- **Authors:** Kay H. Brodersen, Cheng Soon Ong, Klaas E. Stephan, and Joachim M. Buhmann
- **Title:** "The balanced accuracy and its posterior distribution"
- **Venue:** *Proceedings of the 20th International Conference on Pattern Recognition* (ICPR), Istanbul, Turkey, pp. 3121–3124
- **Year:** 2010
- **Identifier:** DOI: 10.1109/ICPR.2010.764
- **What Claim It Supports:**
  1. Formal mathematical formulation and statistical justification of Balanced Accuracy as the unweighted mean of class-specific sensitivities under class imbalance.
- **Exact Manuscript Sections:** Section 3.12 (Evaluation Metrics)
- **Verification Status:** VERIFIED
- **Evidence / Notes:** Foundational machine learning paper introducing Balanced Accuracy and its posterior confidence intervals for imbalanced classification tasks.

---

## 3. Reference Verification Summary Table

| Citation No. | Reference ID | Authors | Title | Venue | Year | Identifier | Verification Status |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :---: |
| **[1]** | `sornmo2005` | Sörnmo & Laguna | *Bioelectrical Signal Processing in Cardiac and Neurological Applications* | Elsevier Academic Press | 2005 | ISBN: 978-0-12-437552-9 | **VERIFIED** |
| **[2]** | `mark1982` | Mark et al. | "An annotated ECG database for evaluating arrhythmia detectors" | *IEEE Trans. Biomed. Eng.* | 1982 | Vol. BME-29(8), p. 600 | **VERIFIED** |
| **[3]** | `luz2016` | Luz et al. | "ECG-based heartbeat classification for arrhythmia detection: A survey" | *Comput. Methods Programs Biomed.* | 2016 | DOI: 10.1016/j.cmpb.2015.12.008 | **VERIFIED** |
| **[4]** | `josephson2015` | Josephson | *Clinical Cardiac Electrophysiology: Techniques and Interpretations* | Wolters Kluwer / LWW | 2015 | ISBN: 978-1-4963-2661-4 | **VERIFIED** |
| **[5]** | `dechazal2004` | de Chazal et al. | "Automatic classification of heartbeats using ECG morphology and heartbeat interval features" | *IEEE Trans. Biomed. Eng.* | 2004 | DOI: 10.1109/TBME.2004.827359 | **VERIFIED** |
| **[6]** | `aami1998` | ANSI/AAMI EC57 | *Testing and reporting performance results of cardiac rhythm and ST-segment measurement algorithms* | AAMI Standard | 1998 | ANSI/AAMI EC57:1998 | **VERIFIED** |
| **[7]** | `goldberger2000` | Goldberger et al. | "PhysioBank, PhysioToolkit, and PhysioNet: Components of a new research resource for complex physiologic signals" | *Circulation* | 2000 | DOI: 10.1161/01.CIR.101.23.e215 | **VERIFIED** |
| **[8]** | `llamedo2011` | Llamedo & Martínez | "Heartbeat classification using feature selection driven by database generalization criteria" | *IEEE Trans. Biomed. Eng.* | 2011 | DOI: 10.1109/TBME.2010.2068048 | **VERIFIED** |
| **[9]** | `kohler2002` | Köhler et al. | "The principles of software QRS detection" | *IEEE Eng. Med. Biol. Mag.* | 2002 | DOI: 10.1109/51.993193 | **VERIFIED** |
| **[10]** | `hu1997` | Hu et al. | "A patient-adaptable ECG beat classifier using a mixture of experts approach" | *IEEE Trans. Biomed. Eng.* | 1997 | DOI: 10.1109/10.623058 | **VERIFIED** |
| **[11]** | `breiman2001` | Breiman | "Random forests" | *Machine Learning* | 2001 | DOI: 10.1023/A:1010933404324 | **VERIFIED** |
| **[12]** | `mondejar2019` | Mondéjar-Guerra et al. | "Heartbeat classification fusing temporal and morphological information of ECGs via ensemble of classifiers" | *Biomed. Signal Process. Control* | 2019 | DOI: 10.1016/j.bspc.2018.08.007 | **VERIFIED** |
| **[13]** | `king2001` | King & Zeng | "Logistic regression in rare events data" | *Political Analysis* | 2001 | DOI: 10.1093/oxfordjournals.pan.a004868 | **VERIFIED** |
| **[14]** | `brodersen2010` | Brodersen et al. | "The balanced accuracy and its posterior distribution" | *Proc. 20th ICPR* | 2010 | DOI: 10.1109/ICPR.2010.764 | **VERIFIED** |

---

## 4. Certification

All 14 academic citations have been authenticated against primary journal databases. No citations are fabricated, speculative, or unverified.
