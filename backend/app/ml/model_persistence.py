"""Model Persistence and Verification Module for Frozen Phase 8 Random Forest.

Provides deterministic materialization and structural verification of the frozen
ANSI/AAMI EC57 4-class Random Forest model artifact. Strictly adheres to Phase 8
specifications (16 DS1 training records, 209 features, random_state=42).
"""
import logging
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

from app.core.config import settings
from app.ml.data_loader import ECGDatasetLoader
from app.ml.models import AAMI_4_CLASSES, create_random_forest
from app.ml.rr_features import RRFeatureExtractor, prepare_phase6_datasets

logger = logging.getLogger(__name__)

# Expected frozen model properties per FINAL_MODEL_CONFIG.json
EXPECTED_N_ESTIMATORS = 200
EXPECTED_MAX_DEPTH = 30
EXPECTED_MIN_SAMPLES_SPLIT = 5
EXPECTED_MIN_SAMPLES_LEAF = 2
EXPECTED_MAX_FEATURES = "sqrt"
EXPECTED_CLASS_WEIGHT = "balanced"
EXPECTED_RANDOM_STATE = 42
EXPECTED_N_JOBS = -1
EXPECTED_N_FEATURES = 209
EXPECTED_CLASSES = set(AAMI_4_CLASSES)


def train_and_persist_frozen_model(
    output_path: Optional[Path] = None,
    force_retrain: bool = False,
) -> Path:
    """Train and persist the frozen Random Forest model strictly on DS1 training records.

    If the artifact already exists and force_retrain is False, verifies and returns it.
    Zero leakage: trained strictly on the 16 DS1 records using frozen Phase 8 parameters.
    """
    if output_path is None:
        output_path = settings.frozen_model_path

    output_path = Path(output_path)

    if output_path.is_file() and not force_retrain:
        logger.info("Frozen model artifact already exists at %s. Verifying...", output_path)
        verify_model_artifact(output_path)
        return output_path

    logger.info("Materializing frozen Random Forest model artifact at %s...", output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Load training data (16 DS1 records only)
    loader = ECGDatasetLoader()
    extractor = RRFeatureExtractor()

    logger.info("Loading DS1 training split (16 records)...")
    train_data = prepare_phase6_datasets(loader, extractor=extractor, variant="bidirectional")
    X_train = train_data["X_train_combined"]
    y_train = train_data["y_train"]

    logger.info("Loaded %d training beats with D=%d features.", len(X_train), X_train.shape[1])
    assert X_train.shape[1] == EXPECTED_N_FEATURES, (
        f"Expected {EXPECTED_N_FEATURES} features, got {X_train.shape[1]}"
    )

    # 2. Instantiate with frozen Phase 8 hyperparameters
    model = create_random_forest(
        n_estimators=EXPECTED_N_ESTIMATORS,
        max_depth=EXPECTED_MAX_DEPTH,
        class_weight=EXPECTED_CLASS_WEIGHT,
        random_state=EXPECTED_RANDOM_STATE,
        n_jobs=EXPECTED_N_JOBS,
    )
    model.min_samples_split = EXPECTED_MIN_SAMPLES_SPLIT
    model.min_samples_leaf = EXPECTED_MIN_SAMPLES_LEAF
    model.max_features = EXPECTED_MAX_FEATURES

    # 3. Fit strictly on training set
    logger.info("Fitting Random Forest on %d training beats...", len(X_train))
    model.fit(X_train, y_train)

    # 4. Save serialized artifact
    joblib.dump(model, output_path)
    logger.info("Successfully persisted model artifact to %s", output_path)

    # 5. Verify the saved file
    verify_model_artifact(output_path)
    return output_path


def verify_model_artifact(model_path: Path) -> Dict[str, Any]:
    """Verify that a saved model file matches all 13 frozen Phase 8 specifications.

    Raises AssertionError if any parameter or structural invariant deviates.
    """
    model_path = Path(model_path)
    assert model_path.is_file(), f"Model file does not exist at: {model_path}"

    model = joblib.load(model_path)
    assert isinstance(model, RandomForestClassifier), (
        f"Expected RandomForestClassifier, got {type(model).__name__}"
    )

    # Verify structural attributes
    assert model.n_estimators == EXPECTED_N_ESTIMATORS, (
        f"n_estimators mismatch: expected {EXPECTED_N_ESTIMATORS}, got {model.n_estimators}"
    )
    assert model.max_depth == EXPECTED_MAX_DEPTH, (
        f"max_depth mismatch: expected {EXPECTED_MAX_DEPTH}, got {model.max_depth}"
    )
    assert model.min_samples_split == EXPECTED_MIN_SAMPLES_SPLIT, (
        f"min_samples_split mismatch: expected {EXPECTED_MIN_SAMPLES_SPLIT}, got {model.min_samples_split}"
    )
    assert model.min_samples_leaf == EXPECTED_MIN_SAMPLES_LEAF, (
        f"min_samples_leaf mismatch: expected {EXPECTED_MIN_SAMPLES_LEAF}, got {model.min_samples_leaf}"
    )
    assert model.max_features == EXPECTED_MAX_FEATURES, (
        f"max_features mismatch: expected {EXPECTED_MAX_FEATURES}, got {model.max_features}"
    )
    assert model.class_weight == EXPECTED_CLASS_WEIGHT, (
        f"class_weight mismatch: expected {EXPECTED_CLASS_WEIGHT}, got {model.class_weight}"
    )
    assert model.random_state == EXPECTED_RANDOM_STATE, (
        f"random_state mismatch: expected {EXPECTED_RANDOM_STATE}, got {model.random_state}"
    )
    assert model.n_jobs == EXPECTED_N_JOBS, (
        f"n_jobs mismatch: expected {EXPECTED_N_JOBS}, got {model.n_jobs}"
    )
    assert getattr(model, "n_features_in_", None) == EXPECTED_N_FEATURES, (
        f"n_features_in_ mismatch: expected {EXPECTED_N_FEATURES}, got {getattr(model, 'n_features_in_', None)}"
    )

    classes_present = set(map(str, model.classes_))
    assert classes_present == EXPECTED_CLASSES, (
        f"Classes mismatch: expected {EXPECTED_CLASSES}, got {classes_present}"
    )

    file_size_bytes = model_path.stat().st_size
    return {
        "file_path": str(model_path),
        "file_size_bytes": file_size_bytes,
        "model_type": type(model).__name__,
        "n_estimators": model.n_estimators,
        "max_depth": model.max_depth,
        "min_samples_split": model.min_samples_split,
        "min_samples_leaf": model.min_samples_leaf,
        "max_features": model.max_features,
        "class_weight": model.class_weight,
        "random_state": model.random_state,
        "n_jobs": model.n_jobs,
        "n_features_in": model.n_features_in_,
        "classes": list(map(str, model.classes_)),
        "verified": True,
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    print("=" * 70)
    print("PHASE 15: MATERIALIZING FROZEN RANDOM FOREST MODEL ARTIFACT")
    print("=" * 70)
    path = train_and_persist_frozen_model()
    stats = verify_model_artifact(path)
    print(f"\nModel successfully persisted at: {path}")
    print(f"Artifact Size: {stats['file_size_bytes'] / (1024*1024):.2f} MB")
    print(f"Estimators:    {stats['n_estimators']}")
    print(f"Max Depth:     {stats['max_depth']}")
    print(f"Classes:       {stats['classes']}")
    print(f"Features:      {stats['n_features_in']}")
    print("Verification:  PASSED")
    print("=" * 70)
