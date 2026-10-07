"""Unit and Integration Tests for Phase 15 Model Persistence & Inference Engine.

Verifies:
1. Model artifact exists and can be loaded with joblib.
2. Loaded object is RandomForestClassifier with exact frozen Phase 8 parameters.
3. Feature dimension validation strictly enforces D=209.
4. Model produces predictions in ['N', 'S', 'V', 'F'].
5. predict_proba returns 4 probabilities summing to ~1.0.
6. Edge beats are gracefully flagged as unclassified_edge_beat without crashing.
7. Health endpoint reports model_loaded=True.
8. Feature extraction service accurately produces 209-D vectors from MIT-BIH records.
"""
import json
from pathlib import Path
import joblib
import numpy as np
import pytest
from fastapi.testclient import TestClient
from sklearn.ensemble import RandomForestClassifier

from app.core.config import settings
from app.main import app
from app.ml.models import AAMI_4_CLASSES
from app.ml.model_persistence import (
    EXPECTED_CLASSES,
    EXPECTED_CLASS_WEIGHT,
    EXPECTED_MAX_DEPTH,
    EXPECTED_MAX_FEATURES,
    EXPECTED_MIN_SAMPLES_LEAF,
    EXPECTED_MIN_SAMPLES_SPLIT,
    EXPECTED_N_ESTIMATORS,
    EXPECTED_N_FEATURES,
    EXPECTED_N_JOBS,
    EXPECTED_RANDOM_STATE,
    train_and_persist_frozen_model,
    verify_model_artifact,
)
from app.services.inference_service import (
    EDGE_BEAT_CLASS,
    InferenceService,
    get_inference_service,
)
from app.services.feature_service import get_record_feature_pipeline


@pytest.fixture(scope="module")
def persistent_model_path():
    """Ensure the frozen model artifact exists on disk."""
    return train_and_persist_frozen_model(settings.frozen_model_path)


def test_model_artifact_exists_and_verifies(persistent_model_path):
    """Verify physical model file exists and adheres to all 13 frozen invariants."""
    assert persistent_model_path.is_file()
    assert persistent_model_path.stat().st_size > 1000  # Non-trivial model file

    verification = verify_model_artifact(persistent_model_path)
    assert verification["verified"] is True
    assert verification["n_estimators"] == 200
    assert verification["max_depth"] == 30
    assert verification["min_samples_split"] == 5
    assert verification["min_samples_leaf"] == 2
    assert verification["max_features"] == "sqrt"
    assert verification["class_weight"] == "balanced"
    assert verification["random_state"] == 42
    assert verification["n_jobs"] == -1
    assert verification["n_features_in"] == 209
    assert set(verification["classes"]) == {"N", "S", "V", "F"}


def test_inference_service_singleton_and_model_loading(persistent_model_path):
    """Verify InferenceService operates as a singleton and loads model properly."""
    service1 = get_inference_service()
    service2 = get_inference_service()
    assert service1 is service2

    service1.load_model()
    assert service1.is_loaded() is True

    info = service1.get_model_info()
    assert info["model_loaded"] is True
    assert info["n_features"] == 209
    assert info["classes"] == ["N", "S", "V", "F"]


def test_input_feature_dimension_validation(persistent_model_path):
    """Verify InferenceService strictly rejects invalid feature dimensions and NaN/Inf."""
    service = get_inference_service()
    service.load_model()

    # Reject wrong dimension (e.g. 200 or 210 instead of 209)
    with pytest.raises(ValueError, match="Feature vector must have exactly 209 dimensions"):
        service.predict(np.zeros((1, 200), dtype=np.float32))

    with pytest.raises(ValueError, match="Feature vector must have exactly 209 dimensions"):
        service.predict(np.zeros((1, 210), dtype=np.float32))

    # Reject NaN
    nan_features = np.zeros((1, 209), dtype=np.float32)
    nan_features[0, 50] = np.nan
    with pytest.raises(ValueError, match="NaN"):
        service.predict(nan_features)

    # Reject Inf
    inf_features = np.zeros((1, 209), dtype=np.float32)
    inf_features[0, 50] = np.inf
    with pytest.raises(ValueError, match="infinite"):
        service.predict(inf_features)


def test_predict_and_predict_proba_outputs(persistent_model_path):
    """Verify predict returns AAMI classes and predict_proba sums to 1.0."""
    service = get_inference_service()
    service.load_model()

    # Generate synthetic 209-D batch of 5 beats
    np.random.seed(42)
    sample_features = np.random.randn(5, 209).astype(np.float32)

    preds = service.predict(sample_features)
    assert len(preds) == 5
    for p in preds:
        assert p in AAMI_4_CLASSES

    probas = service.predict_proba(sample_features)
    assert probas.shape == (5, 4)
    # Probabilities must sum to ~1.0
    row_sums = np.sum(probas, axis=1)
    np.testing.assert_allclose(row_sums, 1.0, atol=1e-4)


def test_predict_with_probabilities_and_edge_beat_handling(persistent_model_path):
    """Verify edge beats are handled gracefully without entering classifier."""
    service = get_inference_service()
    service.load_model()

    # 3 samples: sample 0 is edge beat, sample 1 is valid, sample 2 is edge beat
    features = np.zeros((3, 209), dtype=np.float32)
    mask = np.array([False, True, False], dtype=bool)

    results = service.predict_with_probabilities(features, is_valid_mask=mask)
    assert len(results) == 3

    # Sample 0 (edge beat)
    assert results[0].predicted_class == EDGE_BEAT_CLASS
    assert results[0].is_valid is False
    assert results[0].confidence == 0.0

    # Sample 1 (valid beat)
    assert results[1].predicted_class in AAMI_4_CLASSES
    assert results[1].is_valid is True
    assert 0.0 <= results[1].confidence <= 1.0
    assert sum(results[1].probabilities.values()) == pytest.approx(1.0, abs=1e-3)

    # Sample 2 (edge beat)
    assert results[2].predicted_class == EDGE_BEAT_CLASS
    assert results[2].is_valid is False


def test_health_endpoint_reports_model_loaded(persistent_model_path):
    """Verify GET /api/health returns model_loaded=True once model is loaded."""
    service = get_inference_service()
    service.load_model()

    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
        assert data["model_loaded"] is True


def test_feature_pipeline_on_mitbih_record(persistent_model_path):
    """Verify end-to-end feature extraction from real MIT-BIH record 100."""
    pipeline = get_record_feature_pipeline()
    beats = pipeline.extract_record_features("100")

    assert len(beats) > 1000  # Record 100 contains ~2,273 beats

    # First beat must be flagged as edge beat
    assert beats[0].is_valid_bidirectional is False
    assert "First beat" in beats[0].exclusion_reason

    # Last beat must be flagged as edge beat
    assert beats[-1].is_valid_bidirectional is False
    assert "Last beat" in beats[-1].exclusion_reason

    # Middle valid beats must have 209-D vector and valid features
    valid_beats = [b for b in beats if b.is_valid_bidirectional]
    assert len(valid_beats) > 1000

    b = valid_beats[10]
    assert b.feature_vector.shape == (209,)
    assert not np.isnan(b.feature_vector).any()
    assert b.rr_features["RR_prev"] is not None
    assert b.rr_features["RR_next"] is not None
    assert b.rr_features["HR_prev"] > 0

    # Run inference on valid beat
    service = get_inference_service()
    pred = service.predict(b.feature_vector)
    assert pred[0] in AAMI_4_CLASSES
