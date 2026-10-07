# ECG Arrhythmia Analysis (Phase 1 foundation)

Academic/research prototype for ECG signal analysis on the **MIT-BIH Arrhythmia Database**.
It is **not** a diagnostic tool. No ML model is included and no predictions are produced yet.

## Status
Implemented: record discovery (`.hea`+`.dat`), metadata, signal windows, annotations, upload, simple JSON history, React dashboard.
Placeholder: ML analysis (`POST /api/analysis/{id}` returns `model_not_loaded`), prediction UI.

## Structure
```
backend/   FastAPI app (api/routes -> services -> WFDB / files)
frontend/  React + Vite (pages -> components -> hooks -> services/api.js)
```
Backend layers: `app/api/routes` (HTTP) · `app/services` (ECG/WFDB, files+history, analysis stub) · `app/core` (config, logging, errors) · `app/models/schemas.py` · `app/utils/validators.py`.

## Tech stack
Backend: Python, FastAPI, Pydantic, Uvicorn, NumPy, Pandas, WFDB. Frontend: React, Vite, JavaScript, Axios, React Router, Recharts.
JavaScript was chosen over TypeScript to keep the starting point lightweight; migrating later is straightforward.

## Dataset
Put the complete MIT-BIH database, **flat**, in `backend/data/mitbih/` (see the README there).
`.hea` + `.dat` = required (record is discovered when both exist) · `.atr` = optional annotations · `.xws` = ignored.
Lead names, channel count, sampling rate and annotation symbols are read from each record, never assumed.

## Setup and run
Backend (Python 3.10+):
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # Windows: copy .env.example .env
uvicorn app.main:app --reload --port 8000
```
Frontend (Node 18+), in a second terminal:
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173 (proxies /api -> :8000)
```
API docs: http://127.0.0.1:8000/docs

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/upload` | Upload a record: multipart `files` = `.hea` + `.dat` (+ `.atr`) |
| GET | `/api/ecg/records` | List discovered records |
| GET | `/api/ecg/{id}/metadata` | Record metadata from `.hea` |
| GET | `/api/ecg/{id}/signal` | Signal; query: `start_s`, `end_s`, `max_points`, `channels` |
| GET | `/api/ecg/{id}/annotations` | Annotations; query: `start_s`, `end_s`, `limit`, `offset` |
| POST | `/api/analysis/{id}` | Placeholder (`model_not_loaded`) |
| GET | `/api/history` | Uploaded/analysed records (JSON file) |

## Tests
```bash
cd backend && pytest
```
Smoke tests only; dataset-dependent tests are skipped when `backend/data/mitbih/` is empty.

## Current limitations / TODO
- Stride decimation of the signal (use min/max decimation); no chart zoom/brush or annotation markers yet.
- Upload checks extension, size, filename and header readability; no deeper content sniffing; no authentication.
- History is a local JSON file, not a database. Only the `atr` annotator is supported.
- Not yet tested against the complete dataset (only a few sample records were used during development).

## Future ML pipeline (later phases)
Preprocessing, beat segmentation, features, training/evaluation, explainability, and wiring the model into `services/analysis_service.py` and `PredictionCard`.
