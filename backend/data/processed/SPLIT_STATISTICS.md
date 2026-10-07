# Comprehensive Dataset Split Statistics & Imbalance Analysis

**Protocol:** ANSI/AAMI EC57:1998 / de Chazal et al. (2004) Benchmark  
**Total Records:** 48  
**Total Usable Beats:** 109,446  
**Primary Benchmark Records:** 44 (100,689 beats total; 100,674 four-class beats)  
**Excluded Paced Records:** 4 (8,757 beats)  

---

## 1. Complete Five-Class Dataset Accounting Table

| Split | Records | Total Beats | Class N | Class S | Class V | Class F | Class Q |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Train** | **16** | **38,069** | 33,914 (89.09%) | 227 (0.60%) | 3,513 (9.23%) | 407 (1.07%) | 8 (0.02%) |
| **Validation** | **6** | **12,930** | 11,931 (92.27%) | 716 (5.54%) | 275 (2.13%) | 8 (0.06%) | 0 (0.00%) |
| **Test (DS2)** | **22** | **49,690** | 44,241 (89.03%) | 1,835 (3.69%) | 3,220 (6.48%) | 388 (0.78%) | 7 (0.01%) |
| **Primary 44-Record Total** | **44** | **100,689** | **90,086 (89.47%)** | **2,779 (2.76%)** | **7,008 (6.96%)** | **803 (0.80%)** | **15 (0.01%)** |
| **Paced Records (Excl.)** | **4** | **8,757** | 505 (5.77%) | 0 (0.00%) | 227 (2.59%) | 0 (0.00%) | 8,025 (91.64%) |
| **GRAND TOTAL** | **48** | **109,446** | **90,589 (82.77%)** | **2,779 (2.54%)** | **7,235 (6.61%)** | **803 (0.73%)** | **8,040 (7.35%)** |

---

## 2. Primary Four-Class Benchmark Dataset (`N`, `S`, `V`, `F`)

When formulated as the standard ANSI/AAMI EC57 four-class benchmark on the 44 non-paced records (with the 15 unclassifiable `Q` beats isolated), the primary dataset comprises exactly **100,674 beats**:

| Split | Records | 4-Class Beats | Class N | Class S | Class V | Class F | % of 4-Class Data |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Train** | **16** | **38,061** | 33,914 (89.10%) | 227 (0.60%) | 3,513 (9.23%) | 407 (1.07%) | 37.81% |
| **Validation** | **6** | **12,930** | 11,931 (92.27%) | 716 (5.54%) | 275 (2.13%) | 8 (0.06%) | 12.84% |
| **Test (DS2)** | **22** | **49,683** | 44,241 (89.05%) | 1,835 (3.69%) | 3,220 (6.48%) | 388 (0.78%) | 49.35% |
| **TOTAL 4-CLASS** | **44** | **100,674** | **90,086 (89.48%)** | **2,779 (2.76%)** | **7,008 (6.96%)** | **803 (0.80%)** | **100.00%** |

$$\text{Four-Class Reconciliation: } 90,086 \text{ (N)} + 2,779 \text{ (S)} + 7,008 \text{ (V)} + 803 \text{ (F)} = \mathbf{100,674} \text{ beats}$$
$$\text{Primary Total: } 100,674 \text{ (4-class)} + 15 \text{ (Q)} = \mathbf{100,689} \text{ beats}$$
$$\text{Full Database: } 100,689 \text{ (Primary)} + 8,757 \text{ (Paced)} = \mathbf{109,446} \text{ beats}$$

---

## 3. Class Imbalance & Training Weights (4-Class Formulation)

### Imbalance Ratios in Training Split (38,061 beats):
- **Class N (Majority):** 33,914 samples ($1.00\times$)
- **Class V : N Ratio:** $1 : 9.65$ (Ventricular ectopy is well-sampled)
- **Class F : N Ratio:** $1 : 83.33$ (Fusion beats are moderately rare)
- **Class S : N Ratio:** $1 : 149.40$ (Supraventricular ectopy is rare)

### Balanced Training Class Weights (Computed Strictly from Train Split):
Formula: $w_c = \frac{N_{\text{train}}}{K \cdot N_{c, \text{train}}}$ with $K=4, N_{\text{train}}=38,061$:
- $w_{\text{N}} = \frac{38,061}{4 \times 33,914} = \mathbf{0.2806}$
- $w_{\text{V}} = \frac{38,061}{4 \times 3,513} = \mathbf{2.7083}$
- $w_{\text{F}} = \frac{38,061}{4 \times 407} = \mathbf{23.3790}$
- $w_{\text{S}} = \frac{38,061}{4 \times 227} = \mathbf{41.9174}$

> [!NOTE]
> In contrast to the 5-class formulation where $w_Q \approx 951.55$ posed a severe risk of training instability, the 4-class formulation produces stable, well-conditioned weights spanning a manageable dynamic range ($0.28$ to $41.9$).

---

## 4. Record-Level Split Membership

### Train Split (16 Records from DS1)
`101`, `106`, `109`, `112`, `115`, `116`, `119`, `122`, `124`, `203`, `205`, `207`, `208`, `215`, `223`, `230`

### Validation Split (6 Records from DS1)
`108`, `114`, `118`, `201`, `209`, `220`

### Held-Out Test Split (DS2, 22 Records)
`100`, `103`, `105`, `111`, `113`, `117`, `121`, `123`, `200`, `202`, `210`, `212`, `213`, `214`, `219`, `221`, `222`, `228`, `231`, `232`, `233`, `234`

### Excluded Paced Records (4 Records)
`102`, `104`, `107`, `217`
