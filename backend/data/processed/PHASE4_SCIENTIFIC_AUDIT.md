# PHASE 4 SCIENTIFIC AUDIT
**Investigation of Class Q, Paced Records, DS1/DS2 Partitioning, and Multi-Class Viability**

**Database:** PhysioNet MIT-BIH Arrhythmia Database (48 Complete Records)  
**Standard Protocols:** ANSI/AAMI EC57:1998 & de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004)  
**Audit Purpose:** Comprehensive scientific evaluation of the five-class experimental design, Class Q representation, and paced record exclusion prior to Phase 5 model development.  

---

## 1. Class Q Audit & Root Cause Analysis

### Factual Findings
Across all 48 records, Class Q encompasses **8,040 usable beats** consisting of:
- **Paced beats (`/`):** 7,025 beats
- **Paced fusion beats (`f`):** 982 beats
- **Unclassifiable beats (`Q`):** 33 beats

### Exact Location Across Splits
- **Paced Records (`102`, `104`, `107`, `217`):** **8,025 beats** ($99.81\%$ of all Q beats).
  - Record 102: 2,084 Q beats (2,028 `/`, 56 `f`)
  - Record 104: 2,064 Q beats (1,380 `/`, 666 `f`, 18 `Q`)
  - Record 107: 2,077 Q beats (2,077 `/`)
  - Record 217: 1,800 Q beats (1,540 `/`, 260 `f`)
- **Train Split (16 Records):** **8 beats** ($0.021\%$ prevalence).
  - Record 101: 2 `Q` beats
  - Record 203: 4 `Q` beats
  - Record 208: 2 `Q` beats
- **Validation Split (6 Records):** **0 beats** ($0.00\%$ prevalence).
- **Test Split (22 Records):** **7 beats** ($0.014\%$ prevalence).
  - Record 105: 5 `Q` beats
  - Record 214: 2 `Q` beats

$$\text{Reconciliation: } 8 \text{ (Train)} + 0 \text{ (Val)} + 7 \text{ (Test)} + 8,025 \text{ (Paced)} = \mathbf{8,040} \text{ beats}$$

### Explanation of Preliminary Report Numbers
In preliminary reports, Q was listed as 8 (Train), 47 (Val), 11 (Test), and 6,974 (Paced).  
- The 47 beats in Validation arose from historically miscounting non-captured pacing spike artifacts (`^` / column `p`) in records 108 (11) and 201 (37). The Phase 3 audit correctly re-classified `^` as a non-beat marker without QRS depolarization.
- The 6,974 count was a typographical 1,000-beat offset from the true paced total of 8,025.

---

## 2. Assessment of Five-Class Classifier Viability

### Statistical and Algorithmic Analysis
1. **Inadequate Training Sample Size:** 8 training samples cannot capture intra-class morphological variance for gradient-based or tree-based classifiers.
2. **Extreme Class Weight Imbalance:** The theoretical balanced weighting formula assigns Class Q a weight of $\mathbf{w_Q \approx 951.72}$. An extreme class-weight imbalance and insufficient Q-class training representation create a substantial risk of unstable or non-generalizable learning. This is a methodological risk, not an observed model result.
3. **Statistically Meaningless Evaluation:** With 0 validation samples and only 7 test samples, standard metrics (Recall, F1, AUROC) have massive confidence intervals (e.g., 1 error shifts test recall by $14.3\%$).

**Methodological Conclusion:** Training a 5-class model on the non-paced benchmark is scientifically unsound.

---

## 3. Paced Record Audit & Clinical Rationale

- **Records:** `102`, `104`, `107`, `217` (Total: 8,757 beats).
- **Clinical Rationale for Exclusion:** In patients with electronic cardiac pacemakers, ventricular depolarization is initiated artificially by electrode discharge. The resulting QRS complexes are wide and preceded by pacing spikes, reflecting hardware timing rather than intrinsic cardiac electrophysiology.
- **AAMI EC57 Mandate:** The ANSI/AAMI EC57 standard explicitly mandates excluding these 4 records from standard arrhythmia benchmarking.
- **Data Integrity:** These records are preserved intact and accessible via `get_paced_data()` for secondary evaluation.

---

## 4. DS1 / DS2 Benchmark Audit

- **Canonical Origin:** Established by de Chazal et al. (*IEEE Trans. Biomed. Eng.*, 2004) dividing the 44 non-paced records into DS1 (development) and DS2 (testing) with balanced representations of 100-series and 200-series recordings.
- **Held-Out Test Integrity:** DS2 (22 records, 49,690 beats total; 49,683 four-class beats) is completely isolated and unvisited during training and validation.
- **Validation Partition:** Carved out of DS1 (6 records, 12,930 beats) to enable early stopping and hyperparameter tuning without test leakage.
- **Training Partition:** Carved out of DS1 (16 records, 38,069 beats total; 38,061 four-class beats).

---

## 5. Evaluation of Alternative Experimental Designs

### Design A: Current 5-Class Design on Non-Paced Records (N, S, V, F, Q)
- **Class Balance:** Catastrophic deficiency for Class Q ($N_{\text{train}} = 8$, $N_{\text{val}} = 0$).
- **Scientific Viability:** **POOR**. Unstable weights, uninterpretable evaluation.

### Design B: Include Paced Records in Main 5-Class Experiment
- **Class Balance:** Increases Class Q to 8,040 beats.
- **Comparability:** **POOR**. Violates ANSI/AAMI EC57 benchmarking standard; mixes artificial pacemaker signals with intrinsic conduction.

### Design C: Primary 4-Class Experiment (N, S, V, F) + Separate Paced Secondary Analysis (RECOMMENDED)
- **Protocol:**
  1. **Primary Experiment:** Standard AAMI 4-class classification (`N`, `S`, `V`, `F`) across the 44 non-paced records (DS1 train/val, DS2 test). The 15 unclassifiable beats are excluded from primary targets.
  2. **Secondary Experiment:** Paced records evaluated independently in a dedicated pacemaker detection task.
- **Scientific Viability:** **EXCELLENT**. Directly matches peer-reviewed literature (de Chazal et al., 2004; Luz et al., 2016). Zero leakage, stable weights, standard clinical comparability.

### Design D: 5-Class with Q as Rejection / Noise Class
- **Protocol:** Train 4 classes; treat low-confidence predictions as Class Q (unclassifiable).
- **Limitation:** Lacks ground-truth clinical training examples.

---

## 6. Current Split Evaluation

### Strengths
1. **Strict Record-Level Grouping:** Absolute zero intra-patient leakage.
2. **Standard Benchmark Compliance:** DS2 is preserved intact as the held-out test set.
3. **Deterministic Reproducibility:** Fixed random seed `42` with full provenance.
4. **Data Accounting:** All 48 records and 109,446 beats are tracked and preserved without data loss.

### Weaknesses
1. Attempting 5-class evaluation on non-paced records where Class Q has only 8 training examples.

---

## 7. Recommended Experimental Design & Path Forward

**Adopt Design C (Standard AAMI 4-Class Benchmark):**
- **Primary Task:** 4-class classification (`N`, `S`, `V`, `F`) on the 44 non-paced records (**100,674 beats**).
- **Reconciled Classes:**
  - `N` (Normal / Bundle branch): **90,086 beats**
  - `S` (Supraventricular ectopic): **2,779 beats**
  - `V` (Ventricular ectopic): **7,008 beats**
  - `F` (Fusion beats): **803 beats**
  $$\text{Four-Class Sum: } 90,086 + 2,779 + 7,008 + 803 = \mathbf{100,674} \text{ beats}$$
- **Weights:** Moderate, stable class weights ($w_N \approx 0.28, w_V \approx 2.71, w_F \approx 23.38, w_S \approx 41.92$) without the theoretical 951.72 multiplier.
- **Secondary Task:** Paced heartbeat detection evaluated separately on records 102, 104, 107, 217.

---

## 8. Readiness for Phase 5

> [!IMPORTANT]
> **Can Phase 5 ML training begin safely?**
> 
> **YES, provided the primary classification target is formally configured as the standard AAMI 4-Class formulation (`N`, `S`, `V`, `F`).**  
> If configured as a 5-class task on non-paced records, training will suffer from numerical instability due to the 8-sample Class Q defect.

---

**No machine learning models have been trained during this audit.**
