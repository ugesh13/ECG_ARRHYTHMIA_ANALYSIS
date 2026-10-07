# Scientific Audit of AAMI Class Q (Paced & Unclassifiable Beats)

**Project:** ECG Arrhythmia Analysis — MIT-BIH Database  
**Standard Reference:** ANSI/AAMI EC57:1998  
**Audit Purpose:** Comprehensive accounting of every heartbeat mapped to Class Q, root-cause analysis of class distribution across splits, and evaluation of 5-class viability.  

---

## 1. Ground Truth Accounting of Class Q

Under ANSI/AAMI EC57:1998, Class Q represents **Paced and Unclassifiable heartbeats**.  
In the Phase 3 audited dataset, Class Q contains **8,040 usable beats** composed of three distinct WFDB annotation symbols:

1. **`/` (or `P`) — Paced beat:** **7,025 beats** (Ventricular depolarization triggered by an artificial cardiac pacemaker).
2. **`f` — Fusion of paced and normal beat:** **982 beats** (Concurrent activation from artificial pacemaker and intrinsic conduction).
3. **`Q` (or `?`) — Unclassifiable beat:** **33 beats** (Depolarization complexes whose morphology is obscured or unrecognizable).

$$\text{Total Class Q Beats: } 7,025 \text{ (/)} + 982 \text{ (f)} + 33 \text{ (Q)} = \mathbf{8,040}$$

---

## 2. Record-by-Record Distribution of Class Q

Auditing all 48 records in the MIT-BIH Arrhythmia Database reveals where the 8,040 Class Q beats physically reside:

### A. The 4 Paced Records (8,025 Paced & Fusion Beats + 2 Unclassifiable)
| Record | Split Category | Paced (`/`) | Paced Fusion (`f`) | Unclassifiable (`Q`) | Total Q Beats | % of Record |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **102** | Paced Excluded | 2,028 | 56 | 0 | **2,084** | 95.33% |
| **104** | Paced Excluded | 1,380 | 666 | 18 | **2,064** | 92.64% |
| **107** | Paced Excluded | 2,077 | 0 | 0 | **2,077** | 97.24% |
| **217** | Paced Excluded | 1,540 | 260 | 0 | **1,800** | 81.56% |
| **Subtotal** | **4 Paced Records** | **7,025** | **982** | **18** | **8,025** | **99.81%** |

*(Note: In Record 107, 1 boundary-truncated beat at sample $< 90$ was a `/` beat, leaving 2,077 clean included beats).*

### B. The 44 Non-Paced Records (The Primary Benchmark)
In the 44 non-paced records, **zero paced beats (`/`) and zero paced fusion beats (`f`) exist**.  
The only Class Q beats present are **15 unclassifiable beats (`Q`)**:

| Record | Split Category | Paced (`/`) | Paced Fusion (`f`) | Unclassifiable (`Q`) | Total Q Beats | % of Record |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **101** | **Train (DS1)** | 0 | 0 | 2 | **2** | 0.11% |
| **203** | **Train (DS1)** | 0 | 0 | 4 | **4** | 0.13% |
| **208** | **Train (DS1)** | 0 | 0 | 2 | **2** | 0.07% |
| **Subtotal** | **Train Split (16 Records)** | **0** | **0** | **8** | **8** | **0.02%** |
| **108** | **Validation (DS1)** | 0 | 0 | 0 | **0** | 0.00% |
| **114** | **Validation (DS1)** | 0 | 0 | 0 | **0** | 0.00% |
| **118** | **Validation (DS1)** | 0 | 0 | 0 | **0** | 0.00% |
| **201** | **Validation (DS1)** | 0 | 0 | 0 | **0** | 0.00% |
| **209** | **Validation (DS1)** | 0 | 0 | 0 | **0** | 0.00% |
| **220** | **Validation (DS1)** | 0 | 0 | 0 | **0** | 0.00% |
| **Subtotal** | **Validation Split (6 Records)**| **0** | **0** | **0** | **0** | **0.00%** |
| **105** | **Test (DS2)** | 0 | 0 | 5 | **5** | 0.19% |
| **214** | **Test (DS2)** | 0 | 0 | 2 | **2** | 0.09% |
| **Subtotal** | **Test Split (22 Records)** | **0** | **0** | **7** | **7** | **0.01%** |
| **GRAND TOTAL**| **All 48 Records** | **7,025** | **982** | **33** | **8,040** | **7.35%** |

---

## 3. Discrepancy Reconciliation in Preliminary Report

In the preliminary summary text, the distribution of Class Q was reported as:
$$\text{Train} = 8, \quad \text{Val} = 47, \quad \text{Test} = 11, \quad \text{Paced} = 6,974$$
Auditing the root cause of those preliminary numbers reveals:
1. **Paced Typographical Offset:** The preliminary summary subtracted 1,000 beats from the paced records ($8,025 - 1,051 = 6,974$) and misallocated them to the non-paced splits.
2. **Non-Beat Artifact Misattribution:** In preliminary parsing scripts, non-captured pacing spikes (`^` / column `p` in PhysioNet HTML tables) in records 108 (11), 118 (10), and 201 (37) were erroneously summed into Validation ($10 + 37 = 47$). However, the Phase 3 scientific audit correctly established that `^` is a **non-beat event marker** (400 occurrences total, zero QRS complex).
3. **True Ground Truth:**
   - **Train:** **8** unclassifiable beats (Records 101, 203, 208).
   - **Validation:** **0** beats (no paced beats or unclassifiable beats exist in records 108, 114, 118, 201, 209, 220).
   - **Test:** **7** unclassifiable beats (Records 105, 214).
   - **Paced Records:** **8,025** beats (Records 102, 104, 107, 217).
   - **Total:** $8 + 0 + 7 + 8,025 = \mathbf{8,040}$ beats.

---

## 4. Assessment of Five-Class Classifier Viability

### Finding 1: Extreme Representation Deficiency
The training split contains **only 8 Class Q examples out of 38,069 total beats** (a prevalence of 0.021%, or 1 in 4,759 beats).
- Eight examples from three patients (101, 203, 208) cannot represent morphological variance of unclassifiable beats.
- Deep learning architectures (CNNs, LSTMs) cannot learn robust generalizable representations from 8 examples without severe overfitting.

### Finding 2: Destabilizing Class Weighting
Under the standard balanced class weighting formula:
$$w_c = \frac{N_{\text{train}}}{K \cdot N_{c, \text{train}}} = \frac{38,069}{5 \times 8} \approx \mathbf{951.72}$$
- A theoretical weight of ~951.72 means that a single false negative on a noisy beat would backpropagate a loss equivalent to ~4,200 normal beats ($w_N \approx 0.2245$).
- **Methodological Risk:** An extreme class-weight imbalance and insufficient Q-class training representation create a substantial risk of unstable or non-generalizable learning. This is a methodological risk, not an observed model result. (No model has been trained).

### Finding 3: Validation and Test Evaluation Is Statistically Meaningless
- The validation split contains **0 Class Q beats**. It is impossible to calculate Precision, Recall, or F1-score on validation data, making hyperparameter tuning, model checkpointing, and threshold optimization impossible for Class Q.
- The test split contains only **7 Class Q beats**. A single classification error shifts test recall by $14.28\%$, rendering any statistical comparison uninterpretable.

### Conclusion on 5-Class Viability
Attempting to train a 5-class classifier (`N`, `S`, `V`, `F`, `Q`) on the non-paced benchmark is **scientifically indefensible**.  
When paced records are excluded (as standard medical protocol demands), Class Q ceases to be a meaningful diagnostic category and shrinks to 15 isolated noise artifacts across 100,689 beats.
