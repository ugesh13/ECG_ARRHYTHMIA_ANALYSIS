# IEEE Manuscript Package: ANSI/AAMI EC57 Arrhythmia Classification

This directory contains the complete, publication-grade IEEE LaTeX submission package for the research paper:

> **"Integrating ECG Morphology and Cardiac Timing Features for Inter-Patient Heartbeat Classification: An AAMI EC57 Benchmark Evaluation on the MIT-BIH Database"**

---

## 1. Package Contents Overview

```
final_ieee_paper/
├── main.tex                    # Primary IEEE LaTeX manuscript source file (self-contained)
├── main.bbl                    # Precompiled IEEEtran bibliography (resolves citations instantly)
├── references.bib              # Verified 14-entry BibTeX bibliography file
├── README.md                   # This compilation and submission guide
├── figures/                    # Publication figures directory (9 figures)
│   └── README.md               # Figure mapping, DPI, and script references
├── tables/                     # Publication tables in LaTeX and CSV format
│   ├── table1_experimental_design.tex
│   ├── table2_final_performance.tex
│   ├── table3_classwise_ds2.tex
│   ├── table4_ds1_ds2_comparison.tex
│   ├── table5_feature_importance.tex
│   ├── table6_dataset_distribution.tex
│   └── *.csv                   # Raw underlying verified CSV data tables
├── *.tex                       # Root copies of tables for flat upload environments
└── audit/                      # Phase 13 submission quality audit reports
    ├── PHASE13_METADATA_REQUIREMENTS.md
    ├── PHASE13_NUMERICAL_AUDIT.md
    ├── PHASE13_REFERENCE_AUDIT.md
    ├── PHASE13_FREEZE_AUDIT.md
    ├── PHASE13_PDF_TEXT_AUDIT.md
    └── PHASE13_FINAL_SUBMISSION_CHECKLIST.md
```

---

## 2. Paper Specifications
- **Paper Type:** Original Research Paper (Academic Benchmark)
- **Document Class:** Standard `\documentclass[conference]{IEEEtran}` (Generic IEEE Two-Column Format)
- **Authors:** Ugesh Kumar, Riya Sharma (Department of Computer Science, Jain University, Bangalore, India)
- **Source of Truth Manuscript:** `backend/data/processed/ml_results/FINAL_RESEARCH_MANUSCRIPT.md`
- **Total Input Features:** 209 ($D = 200$ ECG morphology samples + 9 canonical bidirectional RR interval timing features)
- **Primary Test Set:** 22 held-out non-paced recordings from the MIT-BIH Arrhythmia Database (DS2, 49,639 usable beats)
- **Headline Test Performance:** 90.93% Accuracy, 70.00% Balanced Accuracy, 0.6403 Macro F1

---

## 3. Overleaf & Local Compilation Instructions

The LaTeX manuscript has been hardened for seamless compilation on Overleaf and local TeX distributions:
- **All 6 tables are inlined directly into `main.tex`:** No missing table file errors (`table6_dataset_distribution.tex not found` is permanently resolved).
- **Precompiled `main.bbl` included:** All 14 citations (`[1]` through `[14]`) resolve immediately on the first pass without requiring an external BibTeX run.
- **Fail-safe image inclusion (`\safeincludegraphics`):** Figures render automatically when uploaded to `figures/`. If not yet uploaded, a clean bounding box is displayed without crashing the compiler.

### Generating the Figures Locally
To generate the 9 high-resolution (300 DPI) publication figures into `final_ieee_paper/figures/`, run:
```bash
python backend/generate_phase9_artifacts.py
```

### Compiling on Overleaf
1. Download or zip the `final_ieee_paper/` folder.
2. On [Overleaf](https://www.overleaf.com), select **New Project** $\to$ **Upload Project**.
3. Ensure the compiler is set to **pdfLaTeX** and compile.

### Compiling Locally via Terminal
```bash
cd backend/data/processed/ml_results/final_ieee_paper
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

---

## 4. Author Identification
```latex
\author{
\IEEEauthorblockN{Ugesh Kumar, Riya Sharma}
\IEEEauthorblockA{
\textit{Department of Computer Science}\\
\textit{Jain University, Kanakapura Campus}\\
Bangalore, India\\
ugesh25btech27281@jainuniversity.ac.in
}
}
```

---

## 5. Non-Clinical Academic Benchmark Disclaimer
This manuscript and the underlying models are strictly for academic research and educational evaluation. The software is not approved as a medical device or diagnostic clinical aid.
