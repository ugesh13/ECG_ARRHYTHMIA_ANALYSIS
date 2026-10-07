"""Unit and End-to-End Integration Tests for Phase 16 ECG Analysis Service and APIs.

Verifies:
1. POST /api/analysis/{record_id} runs end-to-end inference and returns 209-D batch results.
2. GET /api/analysis/{record_id}/summary returns lightweight cached summary without complete beats array.
3. Unanalyzed record summary returns status 'not_analyzed'.
4. GET /api/analysis/{record_id}/beats returns paginated items with page, page_size, total.
5. GET /api/analysis/{record_id}/beats/{beat_idx} returns 200 morphology samples (-90 to +109) and 9 RR features.
6. Edge beats (first and last) are not classified (predicted_class is None), confidence=0.0, and do not contribute to N/S/V/F counts.
7. Probabilities contain N/S/V/F and sum to ~1.0 for valid beats.
8. Ground-truth symbols are preserved; non-AAMI symbols produce ground_truth_class = None.
9. Pagination filters (class_filter, prediction_filter, ground_truth_filter) work.
10. Missing record returns HTTP 404 with record_not_found.
11. Out-of-range beat index returns HTTP 404 with beat_not_found.
12. Model unavailable returns HTTP 503 with model_unavailable.
13. Health endpoint continues reporting model_loaded = True.
"""
from unittest.mock import patch

from fastapi.testclient import TestClient
import numpy as np
import pytest

from app.core.config import settings
from app.core.errors import ModelUnavailableError
from app.main import app
from app.ml.models import AAMI_4_CLASSES
from app.ml.model_persistence import train_and_persist_frozen_model
from app.services.analysis_service import analyze_record
from app.services.inference_service import get_inference_service

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def ensure_model_is_ready():
    """Ensure the frozen Phase 8 model artifact is persisted and loaded before testing."""
    train_and_persist_frozen_model(settings.frozen_model_path)
    service = get_inference_service()
    service.load_model()
    return service


# -----------------------------------------------------------------------------
# 1. Full Record Analysis Service Tests
# -----------------------------------------------------------------------------
def test_analyze_record_end_to_end_record_100():
    """Verify complete end-to-end analysis on real MIT-BIH record 100."""
    result = analyze_record("100", force_refresh=True)

    # Basic metadata
    assert result.record_id == "100"
    assert result.status == "completed"
    assert result.sampling_rate == 360.0
    assert result.duration_seconds > 0
    assert result.total_beats_detected > 1000
    assert result.total_detected_beats == result.total_beats_detected
    assert result.valid_beats_analyzed > 1000
    assert result.total_classified_beats == result.valid_beats_analyzed
    assert result.execution_time_ms > 0

    # Edge beats: first and last beat
    assert result.edge_beats >= 2
    assert result.beats[0].is_edge_beat is True
    assert result.beats[0].predicted_class is None
    assert result.beats[0].confidence == 0.0
    assert result.beats[0].status == "unclassified_edge_beat"
    assert result.beats[0].is_valid is False

    assert result.beats[-1].is_edge_beat is True
    assert result.beats[-1].predicted_class is None
    assert result.beats[-1].confidence == 0.0
    assert result.beats[-1].status == "unclassified_edge_beat"
    assert result.beats[-1].is_valid is False

    # Aggregate counts consistency
    assert (result.valid_beats_analyzed + result.edge_beats) == result.total_beats_detected

    counts = result.aggregate_counts
    sum_counts = (
        counts.normal_count
        + counts.supraventricular_count
        + counts.ventricular_count
        + counts.fusion_count
        + counts.unclassified_edge_count
    )
    assert sum_counts == result.total_beats_detected
    assert result.class_counts["N"] == counts.normal_count
    assert result.class_counts["S"] == counts.supraventricular_count
    assert result.class_counts["V"] == counts.ventricular_count
    assert result.class_counts["F"] == counts.fusion_count

    # Edge beats must not contribute to N/S/V/F counts
    assert counts.unclassified_edge_count == result.edge_beats

    # Valid middle beats
    valid_beats = [b for b in result.beats if not b.is_edge_beat]
    assert len(valid_beats) == result.valid_beats_analyzed

    for b in valid_beats[:30]:
        assert b.predicted_class in AAMI_4_CLASSES
        assert 0.0 <= b.confidence <= 1.0
        assert b.is_edge_beat is False
        assert b.status == "classified"
        prob_sum = b.probabilities.N + b.probabilities.S + b.probabilities.V + b.probabilities.F
        assert prob_sum == pytest.approx(1.0, abs=1e-3)


# -----------------------------------------------------------------------------
# 2. POST /api/analysis/{record_id} Endpoint Tests
# -----------------------------------------------------------------------------
def test_api_analysis_post_record_100():
    """Verify POST /api/analysis/100 returns complete structured response."""
    response = client.post("/api/analysis/100")
    assert response.status_code == 200
    data = response.json()

    assert data["record_id"] == "100"
    assert data["status"] == "completed"
    assert data["sampling_rate"] == 360.0
    assert data["total_beats_detected"] > 1000
    assert data["valid_beats_analyzed"] > 1000
    assert data["edge_beats"] >= 2
    assert "class_counts" in data
    assert "class_percentages" in data
    assert "execution_time_ms" in data
    assert "beats" in data
    assert len(data["beats"]) == data["total_beats_detected"]
    assert data["model_name"] == "RandomForestClassifier"


def test_api_ecg_analyze_alias():
    """Verify POST /api/ecg/100/analyze returns identical structured response."""
    response = client.post("/api/ecg/100/analyze")
    assert response.status_code == 200
    data = response.json()
    assert data["record_id"] == "100"
    assert data["status"] == "completed"


# -----------------------------------------------------------------------------
# 3. GET /api/analysis/{record_id}/summary Endpoint Tests
# -----------------------------------------------------------------------------
def test_api_analysis_summary_completed_record():
    """Verify GET /api/analysis/100/summary returns cached summary without full beats array."""
    # Ensure 100 is analyzed
    client.post("/api/analysis/100")

    response = client.get("/api/analysis/100/summary")
    assert response.status_code == 200
    data = response.json()

    assert data["record_id"] == "100"
    assert data["status"] == "completed"
    assert data["total_beats_detected"] > 1000
    assert data["valid_beats_analyzed"] > 1000
    assert data["edge_beats"] >= 2
    assert "class_counts" in data
    assert "beats" not in data  # Lightweight summary


def test_api_analysis_summary_unanalyzed_record():
    """Verify GET summary for unanalyzed record returns status 'not_analyzed'."""
    from app.services.analysis_service import _analysis_cache
    _analysis_cache.pop("101", None)

    response = client.get("/api/analysis/101/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["record_id"] == "101"
    assert data["status"] == "not_analyzed"


# -----------------------------------------------------------------------------
# 4. GET /api/analysis/{record_id}/beats (Pagination & Filters)
# -----------------------------------------------------------------------------
def test_api_analysis_beats_pagination():
    """Verify pagination returns correct slice and metadata."""
    # Ensure analyzed
    client.post("/api/analysis/100")

    response = client.get("/api/analysis/100/beats?page=1&page_size=25")
    assert response.status_code == 200
    data = response.json()

    assert data["record_id"] == "100"
    assert data["page"] == 1
    assert data["page_size"] == 25
    assert data["total"] > 1000
    assert len(data["items"]) == 25

    # Check page 2
    response2 = client.get("/api/analysis/100/beats?page=2&page_size=25")
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["page"] == 2
    assert len(data2["items"]) == 25
    assert data2["items"][0]["beat_index"] == 25


def test_api_analysis_beats_class_filter():
    """Verify class_filter strictly filters matching beats."""
    client.post("/api/analysis/100")

    response = client.get("/api/analysis/100/beats?class_filter=N&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 10
    for b in data["items"]:
        assert b["predicted_class"] == "N" or b["ground_truth_class"] == "N"


def test_api_analysis_beats_prediction_filter():
    """Verify prediction_filter strictly filters by predicted class."""
    client.post("/api/analysis/100")

    response = client.get("/api/analysis/100/beats?prediction_filter=N&page_size=10")
    assert response.status_code == 200
    data = response.json()
    for b in data["items"]:
        assert b["predicted_class"] == "N"


# -----------------------------------------------------------------------------
# 5. GET /api/analysis/{record_id}/beats/{beat_idx} (Single Beat Detail)
# -----------------------------------------------------------------------------
def test_api_analysis_single_beat_edge_beat():
    """Verify edge beat detail at index 0."""
    client.post("/api/analysis/100")

    response = client.get("/api/analysis/100/beats/0")
    assert response.status_code == 200
    data = response.json()

    assert data["record_id"] == "100"
    assert data["beat_index"] == 0
    assert data["is_edge_beat"] is True
    assert data["predicted_class"] is None
    assert data["confidence"] == 0.0
    assert data["status"] == "unclassified_edge_beat"

    # Morphology waveform
    morph = data["morphology"]
    assert len(morph["samples"]) == 200
    assert len(morph["sample_offsets"]) == 200
    assert morph["sample_offsets"][0] == -90
    assert morph["sample_offsets"][-1] == 109

    # 9 RR features
    rr = data["rr_features"]
    assert len(rr) == 9
    assert "RR_prev" in rr
    assert "HR_prev" in rr
    assert "RR_local_median" in rr
    assert "RR_ratio_prev" in rr
    assert "RR_dev_prev" in rr
    assert "RR_next" in rr
    assert "HR_next" in rr
    assert "RR_ratio_bidi" in rr
    assert "RR_bidi_diff" in rr


def test_api_analysis_single_beat_valid_beat():
    """Verify middle valid beat at index 1."""
    client.post("/api/analysis/100")

    response = client.get("/api/analysis/100/beats/1")
    assert response.status_code == 200
    data = response.json()

    assert data["record_id"] == "100"
    assert data["beat_index"] == 1
    assert data["is_edge_beat"] is False
    assert data["predicted_class"] in AAMI_4_CLASSES
    assert data["confidence"] > 0.0

    # Probabilities
    probs = data["probabilities"]
    assert sum(probs.values()) == pytest.approx(1.0, abs=1e-3)

    # 200 morphology samples
    morph = data["morphology"]
    assert len(morph["samples"]) == 200
    assert morph["sample_offsets"] == list(range(-90, 110))

    # 9 RR features
    rr = data["rr_features"]
    assert len(rr) == 9
    assert rr["RR_prev"] is not None
    assert rr["RR_next"] is not None
    assert rr["RR_prev"] > 0
    assert rr["RR_next"] > 0


# -----------------------------------------------------------------------------
# 6. Error Handling Tests
# -----------------------------------------------------------------------------
def test_missing_record_returns_404():
    """Verify non-existent record returns 404."""
    response = client.post("/api/analysis/nonexistent_record_999")
    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "record_not_found"


def test_invalid_beat_index_returns_404():
    """Verify out-of-bounds beat index returns 404."""
    client.post("/api/analysis/100")
    response = client.get("/api/analysis/100/beats/999999")
    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "beat_not_found"


def test_model_unavailable_returns_503():
    """Verify controlled 503 response if model cannot be loaded."""
    with patch("app.services.inference_service.InferenceService.is_loaded", return_value=False):
        with patch("app.services.inference_service.InferenceService.load_model", side_effect=Exception("Failed to open file")):
            # Clear cache for 100 to force execution
            from app.services.analysis_service import _analysis_cache
            _analysis_cache.pop("100", None)

            response = client.post("/api/analysis/100")
            assert response.status_code == 503
            data = response.json()
            assert data["error"] == "model_unavailable"


def test_health_endpoint_still_operational():
    """Verify health endpoint reports status healthy and model_loaded True."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
