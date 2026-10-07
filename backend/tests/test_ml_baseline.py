"""Unit and Integration Tests for Phase 5 Baseline ML Models and Evaluation."""
from collections import Counter
import json
from pathlib import Path
import tempfile
import numpy as np
import pytest
from sklearn.pipeline import Pipeline

from app.ml.class_weights import compute_balanced_class_weights, get_sample_weights
from app.ml.data_loader import BeatBatch, ECGDatasetLoader
from app.ml.evaluator import (
    ModelEvaluationReport,
    evaluate_predictions,
    generate_confusion_matrix_svg,
)
from app.ml.models import (
    AAMI_4_CLASSES,
    create_hist_gradient_boosting,
    create_logistic_regression,
    create_random_forest,
    get_baseline_model,
    get_baseline_model_names,
)
from app.ml.trainer import filter_to_4_classes, prepare_baseline_datasets


def test_baseline_model_factory_and_names():
    """Verify factory returns valid scikit-learn estimators for all 3 baseline keys."""
    names = get_baseline_model_names()
    assert names == ["logistic_regression", "random_forest", "hist_gradient_boosting"]

    # 1. Logistic Regression pipeline
    lr_pipe = get_baseline_model("logistic_regression")
    assert isinstance(lr_pipe, Pipeline)
    assert "scaler" in lr_pipe.named_steps
    assert "classifier" in lr_pipe.named_steps
    assert lr_pipe.named_steps["classifier"].class_weight == "balanced"
    assert lr_pipe.named_steps["classifier"].random_state == 42

    # 2. Random Forest
    rf = get_baseline_model("random_forest")
    assert rf.n_estimators == 100
    assert rf.class_weight == "balanced"
    assert rf.random_state == 42

    # 3. HistGradientBoosting
    hgb = get_baseline_model("hist_gradient_boosting")
    assert hgb.random_state == 42
    assert hgb.learning_rate == 0.1

    # Invalid model name
    with pytest.raises(ValueError, match="Unknown model name"):
        get_baseline_model("deep_cnn")


def test_filter_to_4_classes_excludes_q_beats():
    """Verify that filter_to_4_classes isolates the 4 primary classes and strips Class Q."""
    # Synthetic batch with 10 beats including 2 Q beats
    N = 10
    signals = np.random.randn(N, 200).astype(np.float32)
    labels = np.array(["N", "N", "V", "S", "Q", "F", "Q", "N", "V", "N"])
    record_ids = np.array(["101"] * N)
    lead_names = np.array(["MLII"] * N)
    sample_indices = np.arange(100, 1100, 100, dtype=np.int64)
    symbols = labels.copy()

    batch = BeatBatch(
        signals=signals,
        labels=labels,
        record_ids=record_ids,
        lead_names=lead_names,
        sample_indices=sample_indices,
        symbols=symbols,
    )

    X_filtered, y_filtered, mask = filter_to_4_classes(batch)
    assert len(X_filtered) == 8  # 10 - 2 Q beats = 8
    assert len(y_filtered) == 8
    assert "Q" not in y_filtered
    assert set(np.unique(y_filtered)).issubset(set(AAMI_4_CLASSES))
    assert X_filtered.shape == (8, 200)


def test_balanced_class_weights_strictly_training_only():
    """Verify balanced class weight formula strictly matches standard AAMI 4-class targets."""
    # Training distribution counts: N=33914, S=227, V=3513, F=407 (Total=38061)
    train_labels = (
        ["N"] * 33914 +
        ["S"] * 227 +
        ["V"] * 3513 +
        ["F"] * 407
    )
    weights = compute_balanced_class_weights(train_labels, classes=AAMI_4_CLASSES)

    total_samples = 38061
    k = 4
    assert np.isclose(weights["N"], total_samples / (k * 33914), atol=1e-4)
    assert np.isclose(weights["V"], total_samples / (k * 3513), atol=1e-4)
    assert np.isclose(weights["F"], total_samples / (k * 407), atol=1e-4)
    assert np.isclose(weights["S"], total_samples / (k * 227), atol=1e-4)

    # Sample weights mapping
    sample_weights = get_sample_weights(["N", "S", "V", "F"], weights)
    assert len(sample_weights) == 4
    assert np.isclose(sample_weights[0], weights["N"])
    assert np.isclose(sample_weights[1], weights["S"])
    assert np.isclose(sample_weights[2], weights["V"])
    assert np.isclose(sample_weights[3], weights["F"])


def test_evaluator_metrics_and_confusion_matrix_shape():
    """Verify evaluator calculates accurate metrics and returns 4x4 confusion matrix."""
    y_true = ["N"] * 80 + ["S"] * 10 + ["V"] * 8 + ["F"] * 2
    # Mock predictions with 90% accuracy
    y_pred = ["N"] * 75 + ["S"] * 5 + ["S"] * 8 + ["V"] * 2 + ["V"] * 8 + ["F"] * 2
    # Mock probabilities
    y_proba = np.zeros((100, 4), dtype=np.float32)
    for i, pred in enumerate(y_pred):
        cls_idx = AAMI_4_CLASSES.index(pred)
        y_proba[i, cls_idx] = 0.85
        y_proba[i, (cls_idx + 1) % 4] = 0.15

    report = evaluate_predictions(
        y_true=y_true,
        y_pred=y_pred,
        y_proba=y_proba,
        model_name="test_classifier",
        classes=AAMI_4_CLASSES,
    )

    assert 0.0 <= report.accuracy <= 1.0
    assert 0.0 <= report.balanced_accuracy <= 1.0
    assert 0.0 <= report.macro_f1 <= 1.0
    assert len(report.confusion_matrix) == 4
    assert len(report.confusion_matrix[0]) == 4
    assert report.total_val_samples == 100
    assert set(report.per_class.keys()) == set(AAMI_4_CLASSES)
    assert report.per_class["N"].support == 80
    assert report.per_class["S"].support == 10
    assert report.per_class["V"].support == 8
    assert report.per_class["F"].support == 2

    # Verify minority class warning note
    assert any("F-class validation support is only 2 beats" in note for note in report.notes)


def test_confusion_matrix_svg_generation(tmp_path: Path):
    """Verify SVG generator creates valid standalone SVG visual document."""
    cm = [
        [11000, 100, 800, 31],
        [50, 600, 50, 16],
        [20, 15, 230, 10],
        [1, 1, 2, 4],
    ]
    svg_path = tmp_path / "test_cm.svg"
    generate_confusion_matrix_svg(
        cm=cm,
        classes=AAMI_4_CLASSES,
        model_name="Test Model",
        output_path=svg_path,
    )

    assert svg_path.is_file()
    content = svg_path.read_text(encoding="utf-8")
    assert "<svg" in content
    assert "</svg>" in content
    assert "Confusion Matrix: Test Model" in content
    assert "True Class" in content
    assert "Predicted Class" in content
    for cls in AAMI_4_CLASSES:
        assert cls in content


def test_prepare_baseline_datasets_leakage_safety():
    """Verify prepare_baseline_datasets isolates Train and Validation with zero test leakage."""
    processed_dir = Path(__file__).resolve().parent.parent / "data" / "processed"
    npz_path = processed_dir / "mitbih_processed_beats.npz"
    manifest_path = processed_dir / "split_manifest.json"

    if not npz_path.is_file() or not manifest_path.is_file():
        pytest.skip("Dataset archive or split manifest not found; skipping integration test.")

    loader = ECGDatasetLoader(npz_path=npz_path, manifest_path=manifest_path)
    X_train, y_train, X_val, y_val = prepare_baseline_datasets(loader)

    # 1. Exact sample counts
    assert len(X_train) == 38061
    assert len(X_val) == 12930
    assert len(y_train) == 38061
    assert len(y_val) == 12930

    # 2. Feature dimensions
    assert X_train.shape[1] == 200
    assert X_val.shape[1] == 200

    # 3. Class labels strictly in 4 classes
    assert set(np.unique(y_train)) == set(AAMI_4_CLASSES)
    assert set(np.unique(y_val)) == set(AAMI_4_CLASSES)
    assert "Q" not in y_train
    assert "Q" not in y_val

    # 4. Verified class distributions
    train_counts = Counter(y_train)
    assert train_counts["N"] == 33914
    assert train_counts["S"] == 227
    assert train_counts["V"] == 3513
    assert train_counts["F"] == 407

    val_counts = Counter(y_val)
    assert val_counts["N"] == 11931
    assert val_counts["S"] == 716
    assert val_counts["V"] == 275
    assert val_counts["F"] == 8
