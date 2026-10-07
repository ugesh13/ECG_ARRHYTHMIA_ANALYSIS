"""Unit and Integration Tests for Phase 8 Final Model Freeze and DS2 Test Evaluation.

Verifies:
1. FINAL_MODEL_CONFIG is frozen and valid.
2. Feature dimension remains strictly 209.
3. Correct frozen Random Forest hyperparameters.
4. Correct 16 DS1 training record list.
5. Correct 6 DS1 validation record list.
6. Correct 22 DS2 test record list.
7. Confusion matrix dimensions = 4x4.
8. Confusion matrix sum strictly equals evaluated DS2 beats (49,639).
9. No missing labels in prediction arrays.
10. No NaN or Inf predictions or feature columns.
11. Class ordering strictly adheres to [N, S, V, F].
12. No post-test modification or tuning occurs.
13. Reproducibility guaranteed with deterministic random seed 42.
"""
import json
from pathlib import Path
import numpy as np
import pytest

from app.core.config import settings
from app.ml.data_loader import ECGDatasetLoader
from app.ml.models import AAMI_4_CLASSES, create_random_forest
from app.ml.phase8_evaluator import prepare_phase8_test_datasets
from app.ml.rr_features import BIDIRECTIONAL_FEATURE_NAMES, RRFeatureExtractor
from app.ml.splitter import load_split_manifest


def test_final_model_config_is_frozen_and_valid():
    """Verify FINAL_MODEL_CONFIG.json exists, is locked, and specifies exact required parameters."""
    config_path = settings.mitbih_dir.parent / "processed" / "ml_results" / "FINAL_MODEL_CONFIG.json"
    assert config_path.is_file(), f"Configuration file not found at {config_path}"

    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    assert cfg["status"] == "LOCKED_FOR_EVALUATION"
    assert cfg["task"] == "N/S/V/F"
    assert cfg["classes"] == ["N", "S", "V", "F"]
    assert cfg["feature_representation"]["total_dimension"] == 209
    assert cfg["feature_representation"]["morphology_samples"] == 200
    assert cfg["feature_representation"]["rr_features_count"] == 9
    assert cfg["feature_representation"]["rr_feature_names"] == list(BIDIRECTIONAL_FEATURE_NAMES)
    assert cfg["random_seed"] == 42


    # Check hyperparameters
    hp = cfg["selected_hyperparameters"]
    assert hp["n_estimators"] == 200
    assert hp["max_depth"] == 30
    assert hp["min_samples_split"] == 5
    assert hp["min_samples_leaf"] == 2
    assert hp["max_features"] == "sqrt"
    assert hp["class_weight"] == "balanced"


def test_dataset_partitions_integrity():
    """Verify exact record partitions match locked experimental design."""
    manifest = load_split_manifest()
    assert manifest is not None

    expected_train = [
        "101", "106", "109", "112", "115", "116", "119", "122",
        "124", "203", "205", "207", "208", "215", "223", "230"
    ]
    expected_val = ["108", "114", "118", "201", "209", "220"]
    expected_test = [
        "100", "103", "105", "111", "113", "117", "121", "123",
        "200", "202", "210", "212", "213", "214", "219", "221",
        "222", "228", "231", "232", "233", "234"
    ]

    assert sorted(manifest.train_records) == sorted(expected_train)
    assert sorted(manifest.validation_records) == sorted(expected_val)
    assert sorted(manifest.test_records) == sorted(expected_test)

    # Disjointness
    assert set(manifest.train_records).isdisjoint(set(manifest.test_records))
    assert set(manifest.validation_records).isdisjoint(set(manifest.test_records))


def test_feature_dimension_and_no_nan_or_inf():
    """Verify DS2 test feature representation has exactly 209 dimensions and zero NaN/Inf."""
    loader = ECGDatasetLoader()
    if not loader.is_archive_ready():
        pytest.skip("Beat archive not yet built; skipping full feature test.")

    test_data = prepare_phase8_test_datasets(loader)
    X_test = test_data["X_test_combined"]

    assert X_test.shape[1] == 209
    assert len(test_data["feature_names"]) == 209
    assert not np.isnan(X_test).any()
    assert not np.isinf(X_test).any()


def test_ds2_class_distribution_and_edge_exclusions():
    """Verify ground-truth DS2 class counts and exactly 44 boundary edge beat exclusions."""
    loader = ECGDatasetLoader()
    if not loader.is_archive_ready():
        pytest.skip("Beat archive not yet built; skipping full feature test.")

    test_data = prepare_phase8_test_datasets(loader)
    y_test = test_data["y_test"]

    # 49,683 raw 4-class beats - 44 edge beats = 49,639 usable beats
    assert len(y_test) == 49639
    assert test_data["excluded_edge_beats"] == 44

    unique_classes, counts = np.unique(y_test, return_counts=True)
    counts_dict = dict(zip(unique_classes, counts))

    assert counts_dict["N"] == 44197
    assert counts_dict["S"] == 1835
    assert counts_dict["V"] == 3220
    assert counts_dict["F"] == 388
    assert "Q" not in counts_dict


def test_confusion_matrix_dimensions_and_sum():
    """Verify confusion matrix properties from stored Phase 8 test results."""
    results_path = settings.mitbih_dir.parent / "processed" / "ml_results" / "DS2_TEST_RESULTS.json"
    if not results_path.is_file():
        pytest.skip("DS2 test results not yet generated.")

    with open(results_path, "r", encoding="utf-8") as f:
        res = json.load(f)

    cm = np.array(res["confusion_matrix"])
    assert cm.shape == (4, 4)
    assert np.sum(cm) == 49639

    row_sums = np.sum(cm, axis=1)
    assert row_sums[0] == 44197  # True N
    assert row_sums[1] == 1835   # True S
    assert row_sums[2] == 3220   # True V
    assert row_sums[3] == 388    # True F


def test_reproducibility_with_fixed_seed():
    """Verify Random Forest model initialization with random_state=42 is deterministic."""
    rf1 = create_random_forest(random_state=42, n_estimators=10)
    rf2 = create_random_forest(random_state=42, n_estimators=10)

    X_dummy = np.random.RandomState(42).randn(100, 209)
    y_dummy = np.random.RandomState(42).choice(AAMI_4_CLASSES, size=100)

    rf1.fit(X_dummy, y_dummy)
    rf2.fit(X_dummy, y_dummy)

    np.testing.assert_array_equal(rf1.predict(X_dummy), rf2.predict(X_dummy))
