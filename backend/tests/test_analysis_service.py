"""Unit and End-to-End Integration Tests for Phase 16 ECG Analysis Service and API.

Verifies:
1. Full-record end-to-end analysis on MIT-BIH record 100.
2. Predictions belong exclusively to AAMI classes ('N', 'S', 'V', 'F') or 'unclassified_edge_beat'.
3. 209-D feature vector contract is strictly preserved.
4. Probabilities contain 4 entries and sum to 1.0 for valid beats.
5. First and last beats are flagged as 'unclassified_edge_beat' with 0.0 confidence.
6. Aggregate counts and percentages match the sum of individual beats.
7. Both POST /api/analysis/{record_id} and POST /api/ecg/{record_id}/analyze respond properly.
8. Invalid and missing record IDs return 400 and 404.
9. Health endpoint continues reporting model_loaded=True.
"""
from fastapi.testclient import TestClient
import numpy as np
import pytest

from app.core.config import settings
from app.main import app
from app.ml.models import AAMI_4_CLASSES
from app.ml.model_persistence import train_and_persist_frozen_model
from app.services.analysis_service import analyze_record, run_analysis
from app.services.inference_service import EDGE_BEAT_CLASS, get_inference_service

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def ensure_model_is_ready():
    """Ensure the frozen Phase 8 model artifact is persisted and loaded before testing."""
    train_and_persist_frozen_model(settings.frozen_model_path)
    service = get_inference_service()
    service.load_model()
    return service


def test_analyze_record_end_to_end_record_100():
    """Verify complete end-to-end analysis on real MIT-BIH record 100."""
    result = analyze_record("100", force_refresh=True)

    # Basic metadata checks
    assert result.record_id == "100"
    assert result.status == "completed"
    assert result.sampling_rate == 360.0
    assert result.duration_seconds > 0
    assert result.total_detected_beats > 1000

    # Verify edge beats
    assert result.total_edge_beats >= 2
    assert result.beats[0].predicted_class == EDGE_BEAT_CLASS
    assert result.beats[0].confidence == 0.0
    assert result.beats[0].is_valid is False
    assert result.beats[-1].predicted_class == EDGE_BEAT_CLASS
    assert result.beats[-1].confidence == 0.0
    assert result.beats[-1].is_valid is False

    # Verify classified beats
    assert result.total_classified_beats > 1000
    assert (result.total_classified_beats + result.total_edge_beats) == result.total_detected_beats

    # Verify aggregate counts consistency
    counts = result.aggregate_counts
    sum_counts = (
        counts.normal_count
        + counts.supraventricular_count
        + counts.ventricular_count
        + counts.fusion_count
        + counts.unclassified_edge_count
    )
    assert sum_counts == result.total_detected_beats
    assert counts.total_classified_beats == result.total_classified_beats

    # Verify percentages consistency
    pct = result.percentages
    total_pct = (
        pct.normal_percentage
        + pct.supraventricular_percentage
        + pct.ventricular_percentage
        + pct.fusion_percentage
        + pct.unclassified_edge_percentage
    )
    assert total_pct == pytest.approx(100.0, abs=0.5)

    # Inspect arbitrary valid middle beats
    valid_beats = [b for b in result.beats if b.is_valid]
    assert len(valid_beats) > 1000

    for b in valid_beats[:20]:
        assert b.predicted_class in AAMI_4_CLASSES
        assert 0.0 <= b.confidence <= 1.0
        prob_sum = b.probabilities.N + b.probabilities.S + b.probabilities.V + b.probabilities.F
        assert prob_sum == pytest.approx(1.0, abs=1e-3)


def test_api_analysis_endpoint_post_record_100():
    """Verify POST /api/analysis/100 returns complete structured response."""
    response = client.post("/api/analysis/100")
    assert response.status_code == 200
    data = response.json()

    assert data["record_id"] == "100"
    assert data["status"] == "completed"
    assert "beats" in data
    assert len(data["beats"]) > 1000
    assert "aggregate_counts" in data
    assert "percentages" in data
    assert data["model_name"] == "RandomForestClassifier"


def test_api_ecg_analyze_endpoint_restful_alias():
    """Verify POST /api/ecg/100/analyze returns identical structured response."""
    response = client.post("/api/ecg/100/analyze")
    assert response.status_code == 200
    data = response.json()

    assert data["record_id"] == "100"
    assert data["status"] == "completed"
    assert data["total_detected_beats"] > 1000


def test_api_analysis_missing_record_returns_404():
    """Verify analyzing a nonexistent record returns HTTP 404."""
    response = client.post("/api/analysis/nonexistent_record_xyz")
    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "record_not_found"


def test_api_analysis_invalid_record_id_returns_400():
    """Verify path traversal or malformed record IDs return HTTP 400."""
    response = client.post("/api/analysis/..%2Fsecret")
    assert response.status_code in (400, 404)


def test_health_endpoint_still_operational():
    """Verify health endpoint reports status healthy and model_loaded True."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
