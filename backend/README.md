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

## Experimental Results & Model Provenance APIs (Phase 17)

Phase 17 exposes the locked experimental benchmark results and model provenance generated during prior evaluation phases. These endpoints serve the frontend Experimental Benchmark Dashboard, Model Information view, Confusion Matrix inspector, and Record Breakdown explorer.

> **Important Distinction**:
> - **Live Inference** (`/api/analysis/{record_id}`): Dynamically segments and classifies beats for any record on demand using the loaded model.
> - **Benchmark Evaluation** (`/api/experiments/*`): Statically exposes the frozen, locked Phase 8 benchmark metrics evaluated across all 49,639 usable beats of the 22 held-out DS2 test records. No training or evaluation is recalculated.

### Endpoint Summary

| Method | Endpoint | Description | Authoritative Source Artifact |
|---|---|---|---|
| `GET` | `/api/model/info` | Frozen model hyperparameters, 209-D pipeline, and partition specs | `FINAL_MODEL_CONFIG.json` |
| `GET` | `/api/experiments/benchmark` | Phase 8 DS2 held-out test metrics & 4x4 multi-view confusion matrix | `DS2_TEST_RESULTS.json` |
| `GET` | `/api/experiments/generalization` | DS1 validation vs DS2 held-out test comparison and delta | `tables/DS1_DS2_COMPARISON.csv` |
| `GET` | `/api/experiments/feature-importance` | Model-level Top 15 Gini importances and 9 temporal features total | `tables/FEATURE_IMPORTANCE_TABLE.csv` |
| `GET` | `/api/experiments/record-breakdown` | DS2 per-record performance metrics (with optional sorting/limit) | `DS2_RECORD_RESULTS.csv` |
| `GET` | `/api/experiments/dataset-distribution` | ANSI/AAMI cohort beat counts across DS1, DS2, and paced groups | `tables/DATASET_CLASS_DISTRIBUTION.csv` |
| `GET` | `/api/experiments/artifacts` | Safe logical metadata on available experiment artifact files | `ml_results/` manifest check |

### Endpoint Details & Examples

#### 1. Model Provenance: `GET /api/model/info`
Returns complete architectural parameters, feature representation settings, and partition details.
```http
GET /api/model/info HTTP/1.1
Host: localhost:8000
```
Response:
```json
{
  "model_type": "RandomForestClassifier",
  "n_estimators": 200,
  "max_depth": 30,
  "min_samples_split": 5,
  "min_samples_leaf": 2,
  "max_features": "sqrt",
  "class_weight": "balanced",
  "random_state": 42,
  "feature_dimension": 209,
  "morphology_dimension": 200,
  "rr_dimension": 9,
  "class_labels": ["N", "S", "V", "F"],
  "model_loaded": true,
  "model_artifact_available": true
}
```

#### 2. Experimental Benchmark: `GET /api/experiments/benchmark`
Returns locked DS2 test metrics (`Accuracy=0.9093`, `Balanced Accuracy=0.7000`, `Macro F1=0.6403`, `Weighted F1=0.9174`, `ROC-AUC=0.9425`, `PR-AUC=0.6280`, 49,639 beats) and the 4×4 confusion matrix in explicit `[N, S, V, F]` order (providing raw counts, row-normalized, and column-normalized percentages).
```http
GET /api/experiments/benchmark HTTP/1.1
Host: localhost:8000
```

#### 3. Generalization Comparison: `GET /api/experiments/generalization`
Exposes held-out inter-record generalization across MIT-BIH partitions (DS1 validation vs. DS2 held-out test).
```http
GET /api/experiments/generalization HTTP/1.1
Host: localhost:8000
```

#### 4. Feature Importance: `GET /api/experiments/feature-importance`
Returns model-level Random Forest Gini impurity importance for top 15 features (e.g. `RR_ratio_prev`: 0.0582, `RR_ratio_bidi`: 0.0491) and the aggregate temporal contribution (26.38%).
```http
GET /api/experiments/feature-importance HTTP/1.1
Host: localhost:8000
```

#### 5. Record Breakdown: `GET /api/experiments/record-breakdown`
Returns DS2 record-level metrics with query parameters for sorting and pagination:
- `sort_by`: `accuracy`, `evaluated_beats`, `record_id`, `n_recall`, `s_recall`, `v_recall`, `f_recall`
- `sort_order`: `asc` or `desc`
- `limit`: integer (e.g. `50`)
```http
GET /api/experiments/record-breakdown?sort_by=accuracy&sort_order=desc&limit=10 HTTP/1.1
Host: localhost:8000
```

#### 6. Dataset Distribution: `GET /api/experiments/dataset-distribution`
Exposes beat counts and percentages for Training (DS1: 38,029 beats), Validation (DS1: 12,918 beats), Held-Out Test (DS2: 49,639 beats), Total Benchmark Cohort (100,586 beats), and Paced Cohort (8,757 beats).
```http
GET /api/experiments/dataset-distribution HTTP/1.1
Host: localhost:8000
```

#### 7. Artifact Metadata: `GET /api/experiments/artifacts`
Safe boolean flags indicating the availability of locked experimental artifacts without disclosing absolute filesystem paths.
```http
GET /api/experiments/artifacts HTTP/1.1
Host: localhost:8000
```

## Running Tests

Execute automated backend test suite using pytest:
```bash
pytest
```
Test modules in `tests/`:
- `test_smoke.py`: API route health and metadata probes
- `test_inference_service.py`: 209-D validation, proba alignment, and edge-beat exclusion
- `test_analysis_service.py`: Full record analysis and beat pagination
- `test_experiments.py`: Frozen benchmark and provenance response schemas
- `test_rr_features.py`: 9-dimensional canonical timing calculations
- `test_ml_preprocessing.py`: Moving-average baseline removal and per-beat z-score normalization

## Scientific Architecture Notes

- **Baseline Removal**: Moving-average filter ($W=217$ samples, reflection padding) followed by local per-beat z-score normalization.
- **Feature Vector (209-D)**: 200 morphology samples (offsets -90 to +109, R-peak index 90) + 9 canonical bidirectional RR timing features.
- **Model**: Scikit-Learn `RandomForestClassifier` ($T=200, d_{\max}=30$) locked from Phase 8.
- **Immutability**: No models are retrained and no benchmark numbers are recomputed dynamically.



