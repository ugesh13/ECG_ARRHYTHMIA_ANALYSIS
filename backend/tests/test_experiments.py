"""Tests for Phase 17 Experimental Results & Model Provenance APIs.

Verifies:
1. GET /api/model/info (frozen hyperparameters, 209-dim representation, partition info)
2. GET /api/experiments/benchmark (Phase 8 DS2 benchmark, exact numerical metrics)
3. GET /api/experiments/generalization (DS1 val vs DS2 held-out test comparison & deltas)
4. GET /api/experiments/feature-importance (Top-15 Gini importances, 26.38% temporal total)
5. GET /api/experiments/record-breakdown (22 patient records, sorting, limits)
6. GET /api/experiments/dataset-distribution (5 cohort partitions)
7. GET /api/experiments/artifacts (safe logical metadata)
8. Exact numerical integrity & confusion matrix checks
9. Missing artifact handling & error resilience
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.experiment_service import ExperimentService, get_experiment_service

client = TestClient(app)


# -----------------------------------------------------------------------------
# TASK 2: Model Information Endpoint
# -----------------------------------------------------------------------------
def test_model_info_endpoint():
    """Verify GET /api/model/info returns exact frozen provenance."""
    response = client.get("/api/model/info")
    assert response.status_code == 200
    data = response.json()

    assert data["model_type"] == "RandomForestClassifier"
    assert data["n_estimators"] == 200
    assert data["max_depth"] == 30
    assert data["min_samples_split"] == 5
    assert data["min_samples_leaf"] == 2
    assert data["max_features"] == "sqrt"
    assert data["class_weight"] == "balanced"
    assert data["random_state"] == 42
    assert data["feature_dimension"] == 209
    assert data["morphology_dimension"] == 200
    assert data["rr_dimension"] == 9
    assert data["class_labels"] == ["N", "S", "V", "F"]
    assert data["standard_reference"] == "ANSI/AAMI EC57:1998"
    assert data["status"] == "LOCKED_FOR_EVALUATION"
    assert isinstance(data["model_loaded"], bool)
    assert data["model_artifact_available"] is True

    # Check partition info
    partitions = data["training_partitions"]
    assert partitions["training_record_count"] == 16
    assert partitions["validation_record_count"] == 6
    assert partitions["test_record_count"] == 22
    assert len(partitions["test_records_ds2"]) == 22

    # Check feature representation info
    feat_desc = data["feature_description"]
    assert feat_desc["total_dimension"] == 209
    assert len(feat_desc["rr_feature_names"]) == 9
    assert "RR_ratio_prev" in feat_desc["rr_feature_names"]


# -----------------------------------------------------------------------------
# TASK 3, 4, 13: Experimental Benchmark & Exact Numerical Verification
# -----------------------------------------------------------------------------
def test_benchmark_endpoint_metrics():
    """Verify GET /api/experiments/benchmark matches Phase 8 locked metrics."""
    response = client.get("/api/experiments/benchmark")
    assert response.status_code == 200
    data = response.json()

    assert data["model_name"] == "RandomForestClassifier"
    assert data["phase"] == 8
    assert data["evaluated_beats_count"] == 49639

    metrics = data["metrics"]
    # Exact Task 13 requirements:
    assert metrics["accuracy"] == 0.9093
    assert metrics["balanced_accuracy"] == 0.7000
    assert metrics["macro_precision"] == 0.6348
    assert metrics["macro_recall"] == 0.7000
    assert metrics["macro_f1"] == 0.6403
    assert metrics["weighted_f1"] == 0.9174
    assert metrics["roc_auc"] == 0.9425
    assert metrics["pr_auc"] == 0.6280
    assert metrics["evaluated_beats"] == 49639

    # Per-class metrics
    per_class = data["per_class"]
    assert set(per_class.keys()) == {"N", "S", "V", "F"}

    assert per_class["N"]["precision"] == 0.9771
    assert per_class["N"]["recall"] == 0.9242
    assert per_class["N"]["f1_score"] == 0.9499
    assert per_class["N"]["support"] == 44197

    assert per_class["S"]["precision"] == 0.3845
    assert per_class["S"]["recall"] == 0.7564
    assert per_class["S"]["f1_score"] == 0.5098
    assert per_class["S"]["support"] == 1835

    assert per_class["V"]["precision"] == 0.6975
    assert per_class["V"]["recall"] == 0.8720
    assert per_class["V"]["f1_score"] == 0.7750
    assert per_class["V"]["support"] == 3220

    assert per_class["F"]["precision"] == 0.4800
    assert per_class["F"]["recall"] == 0.2474
    assert per_class["F"]["f1_score"] == 0.3265
    assert per_class["F"]["support"] == 388

    # Support sum
    total_support = sum(pc["support"] for pc in per_class.values())
    assert total_support == 49639


def test_confusion_matrix_structure_and_order():
    """Verify 4x4 confusion matrix, [N, S, V, F] order, and normalized variants."""
    response = client.get("/api/experiments/benchmark")
    assert response.status_code == 200
    cm_data = response.json()["confusion_matrix"]

    assert cm_data["class_order"] == ["N", "S", "V", "F"]
    raw = cm_data["raw"]
    assert len(raw) == 4
    for row in raw:
        assert len(row) == 4

    expected_raw = [
        [40845, 2154, 1126, 72],
        [382, 1388, 58, 7],
        [334, 52, 2808, 26],
        [242, 16, 34, 96],
    ]
    assert raw == expected_raw

    # Sum of counts
    total_beats = sum(sum(r) for r in raw)
    assert total_beats == 49639
    assert cm_data["total_beats"] == 49639

    # Row normalized matches recall
    row_norm = cm_data["row_normalized"]
    assert row_norm[0][0] == 0.9242  # N recall
    assert row_norm[1][1] == 0.7564  # S recall
    assert row_norm[2][2] == 0.8720  # V recall
    assert row_norm[3][3] == 0.2474  # F recall

    # Column normalized matches precision
    col_norm = cm_data["column_normalized"]
    assert col_norm[0][0] == 0.9771  # N precision (40845 / (40845+382+334+242) = 40845 / 41803)
    assert col_norm[1][1] == 0.3845  # S precision
    assert col_norm[2][2] == 0.6975  # V precision
    assert col_norm[3][3] == 0.4800  # F precision


# -----------------------------------------------------------------------------
# TASK 5: Generalization Endpoint
# -----------------------------------------------------------------------------
def test_generalization_endpoint():
    """Verify GET /api/experiments/generalization exposes DS1 vs DS2 held-out deltas."""
    response = client.get("/api/experiments/generalization")
    assert response.status_code == 200
    data = response.json()

    assert "held-out inter-record generalization within the MIT-BIH dataset" in data["evaluation_type"]
    assert "not statistically tested" in data["notes"]

    ds1 = data["ds1_validation"]
    ds2 = data["ds2_test"]
    diffs = data["differences"]

    assert ds1["accuracy"] == 0.9668
    assert ds2["accuracy"] == 0.9093
    assert diffs["accuracy"] == -0.0575

    assert ds1["macro_f1"] == 0.7095
    assert ds2["macro_f1"] == 0.6403
    assert diffs["macro_f1"] == -0.0692

    assert ds1["balanced_accuracy"] == 0.7079
    assert ds2["balanced_accuracy"] == 0.7000
    assert diffs["balanced_accuracy"] == -0.0079

    assert ds1["weighted_f1"] == 0.9664
    assert ds2["weighted_f1"] == 0.9174
    assert diffs["weighted_f1"] == -0.0490

    assert len(data["comparison_table"]) >= 8


# -----------------------------------------------------------------------------
# TASK 6: Feature Importance Endpoint
# -----------------------------------------------------------------------------
def test_feature_importance_endpoint():
    """Verify GET /api/experiments/feature-importance returns Top 15 and 26.38% temporal sum."""
    response = client.get("/api/experiments/feature-importance")
    assert response.status_code == 200
    data = response.json()

    assert data["model_family"] == "RandomForestClassifier"
    assert "Random Forest feature importance" in data["notes"]
    assert "not physiological proof" in data["notes"]

    top = data["top_features"]
    assert len(top) == 15

    # Top feature is RR_ratio_prev with 0.0582 Gini importance
    assert top[0]["rank"] == 1
    assert top[0]["feature_name"] == "RR_ratio_prev"
    assert top[0]["feature_type"] == "Temporal"
    assert top[0]["gini_importance"] == 0.0582

    # Feature 2 is RR_ratio_bidi
    assert top[1]["rank"] == 2
    assert top[1]["feature_name"] == "RR_ratio_bidi"
    assert top[1]["gini_importance"] == 0.0491

    # Feature 3 is ECG_092
    assert top[2]["rank"] == 3
    assert top[2]["feature_name"] == "ECG_092"
    assert top[2]["gini_importance"] == 0.0324

    # Temporal feature aggregate
    assert data["temporal_features_total_importance"] == 0.2638
    assert len(data["temporal_feature_names"]) == 9
    assert "RR_bidi_diff" in data["temporal_feature_names"]


# -----------------------------------------------------------------------------
# TASK 7: Record Breakdown Endpoint
# -----------------------------------------------------------------------------
def test_record_breakdown_endpoint():
    """Verify GET /api/experiments/record-breakdown returns 22 DS2 records and handles sorting."""
    response = client.get("/api/experiments/record-breakdown")
    assert response.status_code == 200
    data = response.json()

    assert data["total_records"] == 22
    records = data["records"]
    assert len(records) == 22

    # Check first record in default order (record 100)
    rec100 = next(r for r in records if r["record_id"] == "100")
    assert rec100["evaluated_beats"] == 2270
    assert rec100["accuracy"] == 0.9714
    assert rec100["n_support"] == 2236
    assert rec100["s_support"] == 33
    assert rec100["v_support"] == 1

    # Test sorting by accuracy asc
    res_asc = client.get("/api/experiments/record-breakdown?sort_by=accuracy&sort_order=asc")
    assert res_asc.status_code == 200
    asc_records = res_asc.json()["records"]
    # Lowest accuracy is record 232 (0.7687)
    assert asc_records[0]["record_id"] == "232"
    assert asc_records[0]["accuracy"] == 0.7687

    # Test sorting by accuracy desc
    res_desc = client.get("/api/experiments/record-breakdown?sort_by=accuracy&sort_order=desc")
    assert res_desc.status_code == 200
    desc_records = res_desc.json()["records"]
    # Highest accuracy is record 212 (0.9993)
    assert desc_records[0]["record_id"] == "212"
    assert desc_records[0]["accuracy"] == 0.9993

    # Test limit query param
    res_lim = client.get("/api/experiments/record-breakdown?limit=5")
    assert res_lim.status_code == 200
    assert len(res_lim.json()["records"]) == 5

    # Test invalid sort field
    res_bad = client.get("/api/experiments/record-breakdown?sort_by=nonexistent")
    assert res_bad.status_code == 400


# -----------------------------------------------------------------------------
# TASK 8: Dataset Class Distribution Endpoint
# -----------------------------------------------------------------------------
def test_dataset_distribution_endpoint():
    """Verify GET /api/experiments/dataset-distribution returns 5 cohort rows."""
    response = client.get("/api/experiments/dataset-distribution")
    assert response.status_code == 200
    data = response.json()

    cohorts = data["cohorts"]
    assert len(cohorts) == 5

    partitions = [c["partition"] for c in cohorts]
    assert "Training (DS1)" in partitions
    assert "Validation (DS1)" in partitions
    assert "Held-Out Test (DS2)" in partitions
    assert "Total Benchmark Cohort" in partitions
    assert "Paced Cohort (Isolated)" in partitions

    # Check DS2 test cohort specifics
    ds2 = next(c for c in cohorts if "Held-Out Test" in c["partition"])
    assert ds2["record_count"] == 22
    assert ds2["usable_beats"] == 49639
    assert ds2["n_count"] == 44197
    assert ds2["s_count"] == 1835
    assert ds2["v_count"] == 3220
    assert ds2["f_count"] == 388
    assert ds2["isolated_q"] == 7


# -----------------------------------------------------------------------------
# TASK 9: Experiment Artifacts Metadata Endpoint
# -----------------------------------------------------------------------------
def test_experiment_artifacts_endpoint():
    """Verify GET /api/experiments/artifacts exposes safe logical availability metadata."""
    response = client.get("/api/experiments/artifacts")
    assert response.status_code == 200
    data = response.json()

    assert data["benchmark"] is True
    assert data["model_config"] is True
    assert data["confusion_matrix"] is True
    assert data["generalization"] is True
    assert data["feature_importance"] is True
    assert data["record_breakdown"] is True
    assert data["dataset_distribution"] is True

    # Ensure no absolute paths are leaked
    for art in data["artifacts"]:
        assert art["available"] is True
        assert not art["logical_path"].startswith("/")
        assert not art["logical_path"].startswith("C:\\")
        assert not art["logical_path"].startswith("c:")


# -----------------------------------------------------------------------------
# TASK 11: Error Handling for Missing Artifacts
# -----------------------------------------------------------------------------
def test_missing_artifact_graceful_handling(tmp_path):
    """Verify service gracefully returns 503 instead of crashing when artifacts are missing."""
    empty_service = ExperimentService(ml_results_dir=tmp_path)

    # Calling benchmark on missing dir should raise HTTPException 503
    with pytest.raises(Exception) as excinfo:
        empty_service.get_benchmark()
    assert "503" in str(excinfo.value)

    # Artifact metadata on empty dir should report available=False safely
    meta = empty_service.get_artifacts_metadata()
    assert meta.benchmark is False
    assert meta.model_config is False
    assert all(a.available is False for a in meta.artifacts)
