# PHASE 13 — METADATA REQUIREMENTS FOR SUBMISSION

**Manuscript Title:** Integrating ECG Morphology and Cardiac Timing Features for Inter-Patient Heartbeat Classification: An AAMI EC57 Benchmark Evaluation on the MIT-BIH Database  
**Document Class:** `\documentclass[conference]{IEEEtran}` (Generic IEEE Two-Column Format)  
**Status:** ALL AUTHOR, INSTITUTIONAL, AND SUBMISSION METADATA UNMODIFIED / PLACEHOLDERS PRESERVED  

---

## 1. Zero-Fabrication Integrity Statement
In compliance with academic research standards and Phase 13 instructions, **NO author names, academic affiliations, institutional email addresses, funding bodies, grant numbers, conference/journal names, manuscript tracking numbers, or digital object identifiers (DOIs) were invented or fabricated**.

The LaTeX manuscript `backend/data/processed/ml_results/final_ieee_paper/main.tex` contains clearly marked placeholders with `% TODO: Replace author placeholders with verified author information.`

---

## 2. Required Metadata Checklist for Manual Replacement

Before final submission to an IEEE conference, symposium, or journal, the following verified metadata must be manually supplied in `main.tex`:

### A. Author Identification Block
- [ ] **Author 1 Full Name:** (e.g., First M. Last)
- [ ] **Author 1 Affiliation / Department:** (e.g., Department of Biomedical Engineering / Computer Science)
- [ ] **Author 1 Institution / University:** (e.g., University Name)
- [ ] **Author 1 Location:** (City, State/Province, Country)
- [ ] **Author 1 Email Address:** (Official institutional email)
- [ ] **Author 1 ORCID iD:** (Optional / Recommended by IEEE)
- [ ] **Author 2 Full Name:** (If applicable)
- [ ] **Author 2 Affiliation / Department / Institution / Email:**
- [ ] **Corresponding Author Designation:** Clearly mark corresponding author and provide postal address if required by the target venue.

### B. Target Venue Information
- [ ] **Target Conference or Journal Name:** (e.g., IEEE EMBC, IEEE BHI, IEEE TBME, IEEE JBHI)
- [ ] **Track / Category:** (e.g., Biomedical Signal Processing, Cardiovascular Health, Machine Learning in Healthcare)
- [ ] **Submission ID / Tracking Number:** (Assigned by EasyChair, EDAS, Manuscript Central, or IEEE Author Portal upon initial upload)
- [ ] **Copyright Notice:** (Required by IEEE conference proceedings upon acceptance, e.g., `\IEEEpubid{...}`)

### C. Funding and Acknowledgments
- [ ] **Funding Agency / Grant Information:** (Insert in `\thanks{...}` footnote if funded by NSF, NIH, institutional seed grant, etc.)
- [ ] **Institutional Review Board (IRB) / Ethics Statement:** Note that the MIT-BIH Arrhythmia Database is a de-identified, publicly available open-access resource hosted by PhysioNet under the ODC-BY license, exempt from institutional human subjects review.
- [ ] **Supervisory / Lab Acknowledgments:** (If thesis or laboratory work requires specific acknowledgments).

---

## 3. Placement in Source File (`final_ieee_paper/main.tex`)

Lines 24–33 in `main.tex`:
```latex
% Note: Generic IEEE conference-style format used as no approved venue-specific template exists in workspace.
% TODO: Replace author placeholders with verified author information.
\author{
\IEEEauthorblockN{Author Name 1, Author Name 2}
\IEEEauthorblockA{\textit{Department / School} \\
\textit{University Name}\\
City, Country \\
email@example.com}
}
```
Replace the block above with the final verified author list matching target IEEE formatting guidelines.
