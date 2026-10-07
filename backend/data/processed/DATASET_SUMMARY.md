# MIT-BIH Beat-Level Preprocessed Dataset Summary

**Generated Archive:** `mitbih_processed_beats.npz`  
**Archive SHA-256:** `104c126fc2b0084aa15a3d54f5717892a38d896ff9fc8ca79e08a922dbb9310d`  
**Sampling Frequency ($f_s$):** 360.0 Hz  
**Window Configuration:** 200 samples (0.556 s) — 90 pre-R / 110 post-R  
**Baseline Wander Filter:** Active (moving average subtraction)  
**Amplitude Normalization:** ZSCORE (strictly per-beat local, zero leakage)  

---

## 1. Dataset Accounting & Two-Stage Mathematical Reconciliation

Every examined annotation is accounted for across two explicit stages with zero double-counting:

### Stage 1: Annotation Type Categorization
| Annotation Category | Count | Percentage | Description |
| :--- | :---: | :---: | :--- |
| **True Heartbeat Annotations** | **109,494** | **97.20%** | Annotations designating a discrete cardiac depolarization (QRS). |
| **Non-Beat Event Markers** | **3,153** | **2.80%** | Rhythm changes, flutter markers, quality changes, noise, artifacts. |
| **Total Annotations Examined** | **112,647** | **100.00%** | **Stage 1 Identity:** Beat Annotations (109,494) + Non-Beat Annotations (3,153) = 112,647. |

### Stage 2: Heartbeat Window Extraction & Validation
| Heartbeat Status | Count | Percentage of Beats | Description |
| :--- | :---: | :---: | :--- |
| **Clean Beats Included in Dataset** | **109,465** | **99.97%** | Complete, valid, normalized 200-sample beat windows. |
| **Boundary Incomplete Heartbeats** | **29** | **0.03%** | Beats within 90 samples of recording start or 110 samples of end. |
| **Total True Heartbeat Annotations** | **109,494** | **100.00%** | **Stage 2 Identity:** Included Beats (109,465) + Boundary Exclusions (29) = 109,494. |

### Overall Reconciliation Identity:
$$\text{Total Annotations Examined} (112,647) = \text{Total Included Beats} (109,465) + \text{Total Excluded Annotations} (3,182)$$
where:
$$\text{Total Excluded Annotations} (3,182) = \text{Non-Beat Markers} (3,153) + \text{Boundary Exclusions} (29)$$

---

## 2. AAMI EC57 Class Distribution

The dataset maps ground-truth annotations to the standard ANSI/AAMI EC57 heartbeat categories:

| AAMI Class | Diagnostic Category | Beats Extracted | Percentage |
| :---: | :--- | :---: | :---: |
| **N** | Non-ectopic / Normal (N, L, R, e, j) | **90,605** | **82.77%** |
| **S** | Supraventricular Ectopic (A, a, J, S) | **2,781** | **2.54%** |
| **V** | Ventricular Ectopic (V, E, r) | **7,235** | **6.61%** |
| **F** | Fusion Beats (F) | **802** | **0.73%** |
| **Q** | Paced / Unknown / Unclassifiable (/, f, Q) | **8,042** | **7.35%** |
| **TOTAL** | All Classes Combined | **109,465** | **100.00%** |

---

## 3. Lead Selection & Channel Distribution

Channels were chosen per-record following the priority order (`MLII` > `V5` > `V1` > `V2` > `V4`):

| Lead Name | Beats Extracted | Percentage | Records Utilizing Lead |
| :---: | :---: | :---: | :--- |
| **MLII** | **105,050** | **95.97%** | Primary or fallback lead according to availability. |
| **V5** | **4,415** | **4.03%** | Primary or fallback lead according to availability. |

---

## 4. Record-Level Contribution (Zero-Leakage Grouping)

Every sample retains its `record_id` and original sample location. The table below lists the beats extracted per record:

| Record ID | Beats Contributed | Primary Lead Used |
| :---: | :---: | :---: |
| `100` | 2,271 | Dynamic selection |
| `101` | 1,864 | Dynamic selection |
| `102` | 2,187 | Dynamic selection |
| `103` | 2,084 | Dynamic selection |
| `104` | 2,228 | Dynamic selection |
| `105` | 2,572 | Dynamic selection |
| `106` | 2,027 | Dynamic selection |
| `107` | 2,137 | Dynamic selection |
| `108` | 1,762 | Dynamic selection |
| `109` | 2,531 | Dynamic selection |
| `111` | 2,124 | Dynamic selection |
| `112` | 2,539 | Dynamic selection |
| `113` | 1,794 | Dynamic selection |
| `114` | 1,879 | Dynamic selection |
| `115` | 1,952 | Dynamic selection |
| `116` | 2,411 | Dynamic selection |
| `117` | 1,534 | Dynamic selection |
| `118` | 2,277 | Dynamic selection |
| `119` | 1,987 | Dynamic selection |
| `121` | 1,863 | Dynamic selection |
| `122` | 2,475 | Dynamic selection |
| `123` | 1,517 | Dynamic selection |
| `124` | 1,619 | Dynamic selection |
| `200` | 2,600 | Dynamic selection |
| `201` | 1,963 | Dynamic selection |
| `202` | 2,136 | Dynamic selection |
| `203` | 2,980 | Dynamic selection |
| `205` | 2,656 | Dynamic selection |
| `207` | 1,859 | Dynamic selection |
| `208` | 2,953 | Dynamic selection |
| `209` | 3,005 | Dynamic selection |
| `210` | 2,648 | Dynamic selection |
| `212` | 2,747 | Dynamic selection |
| `213` | 3,250 | Dynamic selection |
| `214` | 2,260 | Dynamic selection |
| `215` | 3,363 | Dynamic selection |
| `217` | 2,208 | Dynamic selection |
| `219` | 2,154 | Dynamic selection |
| `220` | 2,046 | Dynamic selection |
| `221` | 2,427 | Dynamic selection |
| `222` | 2,482 | Dynamic selection |
| `223` | 2,605 | Dynamic selection |
| `228` | 2,053 | Dynamic selection |
| `230` | 2,255 | Dynamic selection |
| `231` | 1,571 | Dynamic selection |
| `232` | 1,780 | Dynamic selection |
| `233` | 3,077 | Dynamic selection |
| `234` | 2,753 | Dynamic selection |

---

## 5. Visual Validation Artifacts

Representative beat windows for every AAMI class were plotted to standalone vector SVGs in `validation_examples/`:
- `validation_examples/class_N_beat.svg` (Class N — Non-ectopic beat)
- `validation_examples/class_S_beat.svg` (Class S — Supraventricular premature beat)
- `validation_examples/class_V_beat.svg` (Class V — Ventricular premature beat)
- `validation_examples/class_F_beat.svg` (Class F — Fusion beat)
- `validation_examples/class_Q_beat.svg` (Class Q — Paced beat)

All examples confirm exact window centering (200 samples, alignment index 90) and uncorrupted normalized amplitudes.
