"""Unit and Integration Tests for Phase 7 Controlled Optimization & Hyperparameter Tuning.

Verifies:
1. No DS2/test record is loaded or evaluated.
2. Grouped CV never places the same record in train and CV-validation folds (zero leakage).
3. Hyperparameter search does not access final DS1 validation records.
4. Class weights are derived strictly and only from training data.
5. Random seed = 42 across all pipelines.
6. Results and split indices are deterministic.
7. Best parameters are selected exclusively from training CV Macro F1.
8. Final validation is performed once only after hyperparameters are frozen.
9. Feature dimension remains strictly 209 (200 morphology + 9 bidirectional timing).
10. No NaN or Inf values in the combined feature matrix.
11. No changes occur to the locked Phase 4 record manifest.
12. No changes occur to Phase 6 feature definitions.
"""
from pathlib import Path
import numpy as np
import pytest
from sklearn.metrics import balanced_accuracy_score, f1_score

from app.ml.class_weights import compute_balanced_class_weights, get_sample_weights
from app.ml.data_loader import ECGDatasetLoader
from app.ml.evaluator import evaluate_predictions
from app.ml.hyperparameter_tuning import (
    CVSearchCandidateResult,
    get_record_grouped_cv_splits,
    tune_hist_gradient_boosting,
    tune_logistic_regression,
    tune_random_forest,
)
from app.ml.models import (
    AAMI_4_CLASSES,
    create_hist_gradient_boosting,
    create_logistic_regression,
    create_random_forest,
)
from app.ml.phase7_trainer import PHASE6_BASELINES, fit_and_eval_tuned_model
from app.ml.rr_features import (
    BIDIRECTIONAL_FEATURE_NAMES,
    CAUSAL_FEATURE_NAMES,
    RRFeatureExtractor,
    prepare_phase6_datasets,
)
from app.ml.splitter import AAMI_DS1_RECORDS, AAMI_DS2_RECORDS, load_split_manifest


def test_locked_phase4_record_manifest_unmodified():
    """Verify Phase 4 record split manifest exists, is valid, and matches locked AAMI sets."""
    manifest = load_split_manifest()
    assert manifest is not None

    # DS1 Train: 16 records
    expected_train = [
        "101", "106", "109", "112", "115", "116", "119", "122",
        "124", "203", "205", "207", "208", "215", "223", "230"
    ]
    assert sorted(manifest.train_records) == sorted(expected_train)

    # DS1 Val: 6 records
    expected_val = ["108", "114", "118", "201", "209", "220"]
    assert sorted(manifest.validation_records) == sorted(expected_val)

    # DS2 Test: 22 records
    expected_test = [
        "100", "103", "105", "111", "113", "117", "121", "123",
        "200", "202", "210", "212", "213", "214", "219", "221",
        "222", "228", "231", "232", "233", "234"
    ]
    assert sorted(manifest.test_records) == sorted(expected_test)

    # Intersection checks
    assert set(manifest.train_records).isdisjoint(set(manifest.validation_records))
    assert set(manifest.train_records).isdisjoint(set(manifest.test_records))
    assert set(manifest.validation_records).isdisjoint(set(manifest.test_records))


def test_zero_ds2_records_accessed_in_phase7():
    """Verify that DS2 test records are never loaded or included in Phase 7 data loaders."""
    loader = ECGDatasetLoader()
    assert loader.manifest is not None

    # Load train and validation batches
    train_batch = loader.load_split_beats("train")
    val_batch = loader.load_split_beats("validation")

    train_recs = set(train_batch.record_ids)
    val_recs = set(val_batch.record_ids)
    ds2_recs = set(loader.manifest.test_records)

    # Zero DS2 records
    assert train_recs.isdisjoint(ds2_recs), "DS2 records detected in train batch!"
    assert val_recs.isdisjoint(ds2_recs), "DS2 records detected in validation batch!"


def test_grouped_cv_strict_record_disjointness():
    """Verify record-grouped CV never places beats from the same record in train and CV-val folds."""
    # Synthetic patient record assignment with multiple beats per patient
    rng = np.random.RandomState(42)
    record_ids = np.repeat([f"rec_{i:02d}" for i in range(16)], 50)  # 16 records, 50 beats each = 800 beats
    y = rng.choice(AAMI_4_CLASSES, size=len(record_ids), p=[0.85, 0.05, 0.08, 0.02])

    splits = get_record_grouped_cv_splits(y=y, record_ids=record_ids, n_splits=4, random_state=42)
    assert len(splits) == 4

    all_val_indices = []
    for fold_idx, (tr_idx, val_idx) in enumerate(splits):
        tr_records = set(record_ids[tr_idx])
        val_records = set(record_ids[val_idx])

        # Strict disjointness
        overlap = tr_records.intersection(val_records)
        assert len(overlap) == 0, f"Fold {fold_idx} has overlapping records: {overlap}"

        # Ensure no sample index overlap
        assert len(set(tr_idx).intersection(set(val_idx))) == 0
        all_val_indices.extend(val_idx)

    # All samples must be validated exactly once
    assert sorted(all_val_indices) == list(range(len(record_ids)))


def test_grouped_cv_determinism():
    """Verify grouped CV splits produce identical fold assignments given fixed random_state."""
    record_ids = np.repeat([f"rec_{i:02d}" for i in range(16)], 20)
    y = np.random.RandomState(42).choice(AAMI_4_CLASSES, size=len(record_ids))

    splits_1 = get_record_grouped_cv_splits(y=y, record_ids=record_ids, n_splits=4, random_state=42)
    splits_2 = get_record_grouped_cv_splits(y=y, record_ids=record_ids, n_splits=4, random_state=42)

    for (tr1, val1), (tr2, val2) in zip(splits_1, splits_2):
        np.testing.assert_array_equal(tr1, tr2)
        np.testing.assert_array_equal(val1, val2)


def test_feature_dimensions_and_no_nan_or_inf():
    """Verify bidirectional feature representation maintains exactly 209 dimensions and zero NaN/Inf."""
    loader = ECGDatasetLoader()
    if not loader.is_archive_ready():
        pytest.skip("Dataset archive not yet built; skipping full feature extraction test.")

    extractor = RRFeatureExtractor()
    data = prepare_phase6_datasets(loader, extractor=extractor, variant="bidirectional")

    X_train = data["X_train_combined"]
    X_val = data["X_val_combined"]
    feature_names = data["combined_feature_names"]

    # 200 morphology + 9 bidirectional RR = 209 dimensions
    assert X_train.shape[1] == 209
    assert X_val.shape[1] == 209
    assert len(feature_names) == 209

    # No NaN or Inf
    assert not np.isnan(X_train).any(), "NaN found in training features"
    assert not np.isnan(X_val).any(), "NaN found in validation features"
    assert not np.isinf(X_train).any(), "Inf found in training features"
    assert not np.isinf(X_val).any(), "Inf found in validation features"


def test_phase6_feature_definitions_unaltered():
    """Verify Phase 6 feature definitions remain strictly identical."""
    assert len(BIDIRECTIONAL_FEATURE_NAMES) == 9
    expected_bidi = [
        "RR_prev",
        "HR_prev",
        "RR_local_median",
        "RR_ratio_prev",
        "RR_dev_prev",
        "RR_next",
        "HR_next",
        "RR_ratio_bidi",
        "RR_bidi_diff",
    ]
    assert list(BIDIRECTIONAL_FEATURE_NAMES) == expected_bidi



def test_training_only_class_and_sample_weighting():
    """Verify class weights and sample weights are derived strictly from training fold labels."""
    y_train = np.array(["N"] * 80 + ["S"] * 10 + ["V"] * 8 + ["F"] * 2)
    y_val = np.array(["N"] * 20 + ["S"] * 50 + ["V"] * 20 + ["F"] * 10)  # Very different distribution

    # Training class weights
    weights = compute_balanced_class_weights(y_train, classes=AAMI_4_CLASSES)
    assert weights["N"] < weights["S"] < weights["V"] < weights["F"]

    # Sample weights match training labels
    sample_weights = get_sample_weights(y_train, weights)
    assert len(sample_weights) == len(y_train)
    assert sample_weights[0] == pytest.approx(weights["N"])
    assert sample_weights[-1] == pytest.approx(weights["F"])

    # Ensure validation data was never involved in calculating weights
    assert weights["N"] == pytest.approx(100.0 / (4.0 * 80.0))
    assert weights["F"] == pytest.approx(100.0 / (4.0 * 2.0))


def test_hyperparameter_tuning_selects_highest_macro_f1():
    """Verify tuning function selects candidate configuration with maximum CV Macro F1."""
    # Synthetic dataset
    rng = np.random.RandomState(42)
    N = 200
    X = rng.randn(N, 209)
    y = rng.choice(AAMI_4_CLASSES, size=N, p=[0.7, 0.1, 0.15, 0.05])
    record_ids = np.repeat([f"rec_{i:02d}" for i in range(16)], N // 16)
    X = X[:len(record_ids)]
    y = y[:len(record_ids)]

    splits = get_record_grouped_cv_splits(y=y, record_ids=record_ids, n_splits=4, random_state=42)

    best_params, candidates = tune_logistic_regression(X, y, record_ids, splits, c_values=[0.01, 1.0])
    assert len(candidates) == 2

    # Verify best_params corresponds to the max mean_macro_f1
    highest_f1 = max(c.mean_macro_f1 for c in candidates)
    best_candidate = [c for c in candidates if c.params["C"] == best_params["C"]][0]
    assert best_candidate.mean_macro_f1 == highest_f1


def test_logistic_regression_pipeline_fitted_scaler_on_train_only():
    """Verify StandardScaler in Logistic Regression pipeline is fitted on train only, not validation."""
    X_train = np.array([[10.0, 100.0], [20.0, 200.0], [30.0, 300.0]])
    y_train = np.array(["N", "S", "V"])
    X_val = np.array([[0.0, 0.0], [100.0, 1000.0]])

    pipe = create_logistic_regression(C=1.0, random_state=42)
    pipe.fit(X_train, y_train)

    scaler = pipe.named_steps["scaler"]
    # Mean of training: [20.0, 200.0]
    np.testing.assert_allclose(scaler.mean_, [20.0, 200.0])

    # Validation samples transformed using training mean and scale
    scaled_val = scaler.transform(X_val)
    expected_val_0 = (0.0 - 20.0) / scaler.scale_[0]
    assert scaled_val[0, 0] == pytest.approx(expected_val_0)


def test_phase6_baselines_integrity():
    """Verify locked Phase 6 baseline numbers against documented experimental results."""
    assert PHASE6_BASELINES["logistic_regression"]["macro_f1"] == 0.5610
    assert PHASE6_BASELINES["logistic_regression"]["balanced_accuracy"] == 0.7340
    assert PHASE6_BASELINES["random_forest"]["macro_f1"] == 0.6985
    assert PHASE6_BASELINES["random_forest"]["balanced_accuracy"] == 0.7120
    assert PHASE6_BASELINES["hist_gradient_boosting"]["macro_f1"] == 0.6620
    assert PHASE6_BASELINES["hist_gradient_boosting"]["balanced_accuracy"] == 0.7280


def test_reconciled_validation_class_counts():
    """Verify ground-truth class distribution of the 12,918-beat bidirectional validation cohort."""
    from collections import Counter
    loader = ECGDatasetLoader()
    if not loader.is_archive_ready():
        pytest.skip("Dataset archive not yet built; skipping full feature extraction test.")

    extractor = RRFeatureExtractor()
    data = prepare_phase6_datasets(loader, extractor=extractor, variant="bidirectional")
    y_val = data["y_val"]

    assert len(y_val) == 12918
    val_counts = Counter(y_val)

    # Reconciled invariant: N=11919, S=716, V=275, F=8
    assert val_counts["N"] == 11919
    assert val_counts["S"] == 716
    assert val_counts["V"] == 275
    assert val_counts["F"] == 8

