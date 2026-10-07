# Backend

FastAPI service. See the root README for setup. Entry point: `app/main.py`.

- `app/services/ecg_service.py` — WFDB: `discover_records`, `load_record`, `get_record_metadata`, `get_signal`, `get_annotations`, `prepare_signal_for_visualization`.
- `app/services/inference_service.py` — Singleton ML inference engine: loads the frozen Random Forest (`models/phase8/random_forest_final_phase8.joblib`), validates 209-D inputs, outputs class probabilities `[P(N), P(S), P(V), P(F)]`, and handles edge beats.
- `app/services/feature_service.py` — Connects WFDB signals to 200 morphology + 9 bidirectional RR feature pipeline.
- `app/services/file_service.py` — upload validation/storage and JSON history.
- `app/services/analysis_service.py` — Orchestrates full-record arrhythmia analysis, beat classification, and aggregate statistics.
- `app/ml/model_persistence.py` — Materialization and 13-point verification of the frozen Random Forest model.
- Errors: raise `AppError` subclasses (`app/core/errors.py`); they become safe JSON responses. Stack traces are only logged.
- Config via environment variables: see `.env.example`.

## How to Start the Backend

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Interactive OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

## Health Check & Model Verification

- **Endpoint**: `GET /api/health`
- **Example Response**:
  ```json
  {
    "status": "healthy",
    "service": "ECG Arrhythmia Analysis API",
    "model_loaded": true
  }
  ```

## ECG Arrhythmia Analysis APIs (Phase 16)

- **Endpoints**:
  - `POST /api/analysis/{record_id}` — Execute end-to-end beat segmentation, 209-D extraction, and batch inference.
  - `POST /api/ecg/{record_id}/analyze` — RESTful alias for analysis execution.
  - `GET /api/analysis/{record_id}/summary` — Lightweight cached summary (counts, percentages, execution time) without full beats array.
  - `GET /api/analysis/{record_id}/beats` — Paginated beats list (`page`, `page_size`, `class_filter`, `prediction_filter`, `ground_truth_filter`).
  - `GET /api/analysis/{record_id}/beats/{beat_idx}` — Single beat detail with 200 morphology samples (-90 to +109 offsets) and 9 RR features.
- **Parameters**:
  - `record_id` (path): Identifier of the record (e.g., `100`, `208`, or upload ID).
  - `force_refresh` (query, optional, default `false`): Bypass session cache.
- **Example Request**:
  ```http
  POST /api/analysis/100 HTTP/1.1
  Host: localhost:8000
  ```
- **Example Response Structure**:
  ```json
  {
    "record_id": "100",
    "status": "completed",
    "message": "Arrhythmia analysis completed successfully.",
    "lead_name": "MLII",
    "sampling_rate": 360.0,
    "duration_seconds": 1805.556,
    "total_detected_beats": 2273,
    "total_classified_beats": 2271,
    "total_edge_beats": 2,
    "aggregate_counts": {
      "normal_count": 2238,
      "supraventricular_count": 33,
      "ventricular_count": 0,
      "fusion_count": 0,
      "unclassified_edge_count": 2,
      "total_detected_beats": 2273,
      "total_classified_beats": 2271
    },
    "percentages": {
      "normal_percentage": 98.46,
      "supraventricular_percentage": 1.45,
      "ventricular_percentage": 0.0,
      "fusion_percentage": 0.0,
      "unclassified_edge_percentage": 0.09
    },
    "beats": [
      {
        "beat_index": 0,
        "sample_index": 18,
        "time_seconds": 0.05,
        "symbol": "N",
        "ground_truth_class": "N",
        "predicted_class": "unclassified_edge_beat",
        "confidence": 0.0,
        "probabilities": { "N": 0.0, "S": 0.0, "V": 0.0, "F": 0.0 },
        "is_valid": false,
        "exclusion_reason": "First beat in record (lacks RR_prev)"
      },
      {
        "beat_index": 1,
        "sample_index": 395,
        "time_seconds": 1.0972,
        "symbol": "N",
        "ground_truth_class": "N",
        "predicted_class": "N",
        "confidence": 0.965,
        "probabilities": { "N": 0.965, "S": 0.035, "V": 0.0, "F": 0.0 },
        "is_valid": true,
        "exclusion_reason": null
      }
    ],
    "model_name": "RandomForestClassifier",
    "model_version": "1.0 (Frozen Phase 8)",
    "disclaimer": "Research prototype for educational/academic evaluation only. Not a clinical diagnostic device."
  }
  ```

## ML Model Artifact & Inference (Phase 15/16)

- **Model Location**: `backend/models/phase8/random_forest_final_phase8.joblib`
- **Architecture**: `RandomForestClassifier(n_estimators=200, max_depth=30, min_samples_split=5, min_samples_leaf=2, max_features='sqrt', class_weight='balanced', random_state=42)`
- **Input Dimension**: Exactly 209 features (200 z-score normalized morphology samples + 9 bidirectional RR timing features).
- **Target Classes**: ANSI/AAMI EC57 4-class taxonomy: `N`, `S`, `V`, `F`.
- **Materialization / Verification**: Run `python run_phase16.py` to test end-to-end analysis on record 100.


