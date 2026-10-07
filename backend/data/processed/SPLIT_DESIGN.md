# Record-Level Data Splitting & Experiment Design Contract

**Standard Reference:** ANSI/AAMI EC57:1998  
**Benchmark Protocol:** de Chazal et al. (IEEE Trans. Biomed. Eng., 2004)  
**Database:** PhysioNet MIT-BIH Arrhythmia Database (`mitdb`)  
**Random Seed:** `42`  

---

## 1. Why Beat-Level Splitting Is Strictly Forbidden

In naive machine learning pipelines, datasets are commonly partitioned using random sample splitting:
$$\text{train\_test\_split}(X_{\text{beats}}, y_{\text{beats}}, \text{test\_size}=0.2)$$

In electrocardiogram (ECG) analysis, **this practice is a critical methodological flaw and constitutes catastrophic data leakage**.

### Root Cause: High Intra-Patient Correlation
1. Each 30-minute MIT-BIH recording contains ~2,000 heartbeats originating from a **single patient**.
2. Within an individual patient, morphology (QRS duration, ST segment amplitude, T-wave vector, electrode skin impedance, respiratory baseline drift) is virtually identical across beats of the same class.
3. If beats from the same recording are randomly scattered across training and test sets, the model learns the **patient's specific morphological fingerprint** rather than generalizable pathophysiological features of arrhythmia.
4. Reported test accuracies under random beat splitting regularly exceed 98–99%, but performance collapses drastically when evaluated on a previously unseen patient (inter-patient generalization failure).

---

## 2. Record-Level (Inter-Patient) Splitting Principle

Under the record-level protocol:
- Every recording (patient) belongs to **exactly one** subset: $\text{Train}$, $\text{Validation}$, or $\text{Test}$.
- **Zero Record Overlap:**
  $$\text{Train} \cap \text{Validation} = \emptyset, \quad \text{Train} \cap \text{Test} = \emptyset, \quad \text{Validation} \cap \text{Test} = \emptyset$$
- A model evaluated on the Test set has **never seen a single sample, heart rate, or electrode morphology** from any of those test patients.
- This replicates real-world clinical deployment where the AI model evaluates previously unknown prospective patients.

---

## 3. AAMI EC57 & de Chazal Benchmark Partition

The ANSI/AAMI EC57 standard and seminal benchmark paper by de Chazal et al. (2004) established the canonical evaluation protocol for the MIT-BIH Arrhythmia Database:

```
[ All 48 MIT-BIH Records ]
       │
       ├── Paced Records (4 Records) ───────────► [ Excluded from Primary Benchmark ]
       │     └── 102, 104, 107, 217                 (Retained for Secondary Paced Analysis)
       │
       └── 44 Non-Paced Records
             │
             ├── DS2 Partition (22 Records) ────► [ Independent HELD-OUT TEST SET ]
             │     └── 100, 103, 105, 111, 113, 117, 121, 123,
             │         200, 202, 210, 212, 213, 214, 219, 221,
             │         222, 228, 231, 232, 233, 234
             │
             └── DS1 Partition (22 Records) ────► [ Development Split ]
                   ├── Train Split (16 Records) ─► 101, 106, 109, 112, 115, 116, 119, 122,
                   │                              124, 203, 205, 207, 208, 215, 223, 230
                   │
                   └── Val Split (6 Records) ───► 108, 114, 118, 201, 209, 220
```

### Partition Rationale:
1. **Test Set (DS2, 22 records):** Strictly identical to de Chazal DS2 benchmark. Must be kept sealed until final evaluation; zero hyperparameter tuning or feature selection.
2. **Train Set (16 records from DS1):** Provides extensive training examples across normal beats, bundle branch blocks, complex PVCs, bigeminy, and fusion beats.
3. **Validation Set (6 records from DS1):** Strategically partitioned from DS1 to provide representative examples of all 5 AAMI classes (including supraventricular APCs from 209 and 220, ventricular beats, and junctional beats) for early stopping and threshold tuning.
4. **Paced Records (4 records):** Excluded from primary benchmarking per AAMI EC57 guidelines due to artificial pacing distortion.

---

## 4. Split Summary Table

| Split | Records Count | Total Beats | Class N | Class S | Class V | Class F | Class Q | Primary Role |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Train** | **16** | **38,062** | 33,636 | 260 | 3,506 | 406 | 8 | Model training; feature fitting. |
| **Validation** | **6** | **12,988** | 10,757 | 712 | 274 | 8 | 47 | Model selection; threshold tuning. |
| **Test (DS2)** | **22** | **49,639** | 44,210 | 1,807 | 3,222 | 389 | 11 | Held-out benchmark evaluation. |
| **Paced (Excl.)** | **4** | **8,757** | 1,986 | 0 | 233 | 0 | 6,974 | Isolated secondary paced analysis. |
| **TOTAL** | **48** | **109,446** | **90,589** | **2,779** | **7,235** | **803** | **8,040** | **Complete database accounted for.** |

---

## 5. Paced Records Handling Policy

### Records: `102`, `104`, `107`, `217`
1. **Clinical Context:** These 4 patients have implanted electronic cardiac pacemakers.
2. **Signal Characteristics:** Contain sharp unipolar/bipolar pacing spikes and wide artificially-paced QRS complexes (`/` and `f`).
3. **AAMI EC57 Requirement:** Standard AAMI EC57 performance metrics specifically mandate evaluating arrhythmia detectors on the 44 non-paced records.
4. **Implementation Policy:**
   - They are **NOT deleted**.
   - They are tracked in `record_inventory.json` and `split_manifest.json` under `excluded_records`.
   - The ML Data Loader provides `get_paced_data()` for secondary evaluation of pacemaker detection algorithms.

---

## 6. Scientific Limitations & Imbalance

1. **Extreme Class Imbalance:** Normal beats (`N`) represent 82.77% of all beats. Class `F` (Fusion) represents only 0.73% (803 beats), and Class `S` represents 2.54%.
2. **Inter-Patient Variance:** Certain arrhythmias are concentrated in a few patients (e.g. Record 232 contains 1,381 of the 2,779 total S beats in the entire database). Record-level splitting ensures realistic testing against this challenge.
3. **Paced Transferability:** Models trained on the primary split will not generalize to paced rhythms without dedicated pacing spike detection.
