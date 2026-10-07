# COMPUTATIONAL ENVIRONMENT & REPRODUCIBILITY SPECIFICATION

**Protocol Reference:** ANSI/AAMI EC57:1998  
**Project:** ECG Arrhythmia Analysis Benchmark  
**Date:** October 4, 2026  

---

## 1. System & Runtime Environment

- **Operating System:** Microsoft Windows 10/11 (Architecture: x86_64)
- **Primary Shell:** PowerShell / Command Prompt
- **Python Runtime:** Python 3.10+ (standard CPython distribution)
- **Primary Random Seed:** `42` (applied uniformly across data partitioning, model initialization, and cross-validation)

---

## 2. Core Python Dependencies & Version Constraints

Extracted directly from project environment configuration (`backend/requirements.txt`):

| Package Name | Minimum Version | Functional Role within Project Pipeline |
| :--- | :---: | :--- |
| **`python`** | `>= 3.10` | Base execution runtime |
| **`numpy`** | `>= 1.26` | High-performance array operations and moving-average filter convolution |
| **`pandas`** | `>= 2.1` | Dataframe handling, record inventories, and CSV results compilation |
| **`wfdb`** | `>= 4.1` | Native PhysioNet WaveForm DataBase reading and annotation parsing |
| **`scikit-learn`**| `>= 1.4` | Classifiers (`RandomForestClassifier`), pipelines, and metric evaluation |
| **`joblib`** | `>= 1.3` | Parallel execution and frozen model serialization (`.joblib`) |
| **`scipy`** | `>= 1.11` | Signal processing utilities and scientific calculations |
| **`matplotlib`** | `>= 3.7` | High-resolution (300 DPI) publication-grade figure generation |
| **`pytest`** | `>= 8.0` | Automated test suite execution across evaluation pipelines |
| **`fastapi`** | `>= 0.110` | Backend API service framework |
| **`uvicorn`** | `>= 0.27` | ASGI server implementation |
| **`pydantic`** | `>= 2.5` | Data validation and configuration schemas |
| **`httpx`** | `>= 0.27` | Asynchronous HTTP client for API verification |

---

## 3. Deterministic Pipeline Execution

All machine learning operations are executed with deterministic parameters:
- `RandomForestClassifier(random_state=42)`
- `GroupKFold(n_splits=4)`
- Deterministic signal processing: Moving-average filter ($W=217$) and reflection padding operate deterministically without stochastic elements.
- Feature extraction order is strictly locked: Indices 0–199 (morphology), Indices 200–208 (temporal features).
