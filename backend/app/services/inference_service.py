"""Inference Service for Frozen ANSI/AAMI EC57 Arrhythmia Classification.

Loads the persisted Phase 8 Random Forest model, validates input dimensions (D=209),
executes inference with probability estimation, and provides edge-beat handling.
Follows a thread-safe singleton pattern.
"""
from dataclasses import dataclass
import json
import logging
from pathlib import Path
import threading
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np

from app.core.config import settings
from app.core.errors import ModelUnavailableError
from app.ml.models import AAMI_4_CLASSES
from app.ml.model_persistence import (
    EXPECTED_N_FEATURES,
    train_and_persist_frozen_model,
)

logger = logging.getLogger(__name__)

EDGE_BEAT_CLASS = "unclassified_edge_beat"


@dataclass
class BeatPrediction:
    """Standardized prediction result for an individual heartbeat."""
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    is_valid: bool
    reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "predicted_class": self.predicted_class,
            "confidence": round(self.confidence, 4),
            "probabilities": {k: round(v, 4) for k, v in self.probabilities.items()},
            "is_valid": self.is_valid,
            "reason": self.reason,
        }


class InferenceService:
    """Thread-safe singleton service managing the frozen Random Forest classifier."""

    _instance: Optional["InferenceService"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = Path(model_path) if model_path else settings.frozen_model_path
        self._model: Optional[Any] = None
        self._class_names: List[str] = list(AAMI_4_CLASSES)
        self._class_to_idx: Dict[str, int] = {}
        self._model_info_cache: Optional[Dict[str, Any]] = None
        self._load_lock = threading.Lock()

    @classmethod
    def get_instance(cls, model_path: Optional[Path] = None) -> "InferenceService":
        """Retrieve or initialize the singleton InferenceService instance."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls(model_path=model_path)
            return cls._instance

    def is_loaded(self) -> bool:
        """Check whether the model is loaded in memory."""
        return self._model is not None

    def load_model(self, force_reload: bool = False) -> Any:
        """Load the persisted model artifact. Auto-materializes if missing."""
        with self._load_lock:
            if self._model is not None and not force_reload:
                return self._model

            # Ensure the physical model artifact exists
            if not self.model_path.is_file():
                logger.info("Model file not found at %s. Triggering frozen model persistence...", self.model_path)
                train_and_persist_frozen_model(output_path=self.model_path)

            logger.info("Loading frozen Random Forest model from %s...", self.model_path)
            model = joblib.load(self.model_path)

            # Map scikit-learn class indices to AAMI standard classes
            scikit_classes = list(map(str, model.classes_))
            self._class_to_idx = {cls: idx for idx, cls in enumerate(scikit_classes)}
            self._model = model
            logger.info("Model loaded successfully. Classes: %s, Features: %s", scikit_classes, getattr(model, "n_features_in_", 209))
            return self._model

    def get_model_info(self) -> Dict[str, Any]:
        """Retrieve frozen model architecture, parameters, and metadata."""
        if self._model_info_cache is not None:
            return self._model_info_cache

        # Attempt to read from FINAL_MODEL_CONFIG.json if available
        config_path = settings.mitbih_dir.parent / "processed" / "ml_results" / "FINAL_MODEL_CONFIG.json"
        config_data: Dict[str, Any] = {}
        if config_path.is_file():
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    config_data = json.load(f)
            except Exception as e:
                logger.warning("Failed to load FINAL_MODEL_CONFIG.json: %s", e)

        info = {
            "model_name": config_data.get("model_family", "RandomForestClassifier"),
            "model_version": "1.0 (Frozen Phase 8)",
            "task": "N/S/V/F (ANSI/AAMI EC57:1998)",
            "classes": self._class_names,
            "n_features": EXPECTED_N_FEATURES,
            "n_estimators": 200,
            "max_depth": 30,
            "class_weight": "balanced",
            "random_state": 42,
            "status": "LOCKED_FOR_EVALUATION",
            "model_loaded": self.is_loaded(),
            "model_path": str(self.model_path),
        }
        self._model_info_cache = info
        return info

    def _validate_input_features(self, features: np.ndarray) -> np.ndarray:
        """Validate feature dimension, type, and absence of NaN/Inf."""
        arr = np.asarray(features, dtype=np.float32)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)

        if arr.ndim != 2:
            raise ValueError(f"Features must be 1D or 2D array, got ndim={arr.ndim}")

        if arr.shape[1] != EXPECTED_N_FEATURES:
            raise ValueError(
                f"Feature vector must have exactly {EXPECTED_N_FEATURES} dimensions (200 morphology + 9 RR), "
                f"got shape {arr.shape}"
            )

        if np.isnan(arr).any():
            raise ValueError("Input features contain NaN values. Ensure edge beats are handled before inference.")

        if np.isinf(arr).any():
            raise ValueError("Input features contain infinite values.")

        return arr

    def predict(self, features: np.ndarray) -> np.ndarray:
        """Predict AAMI class labels for a batch of 209-D feature vectors."""
        if not self.is_loaded():
            self.load_model()
        if self._model is None:
            raise ModelUnavailableError("The frozen ECG arrhythmia classification model is currently unavailable.")

        X = self._validate_input_features(features)
        predictions = self._model.predict(X)
        return np.asarray(predictions, dtype=str)

    def predict_proba(self, features: np.ndarray) -> np.ndarray:
        """Predict class probabilities aligned to standard [P(N), P(S), P(V), P(F)]."""
        if not self.is_loaded():
            self.load_model()
        if self._model is None:
            raise ModelUnavailableError("The frozen ECG arrhythmia classification model is currently unavailable.")

        X = self._validate_input_features(features)
        raw_proba = self._model.predict_proba(X)  # Shape (N, n_classes)

        # Align columns to canonical AAMI_4_CLASSES order: ['N', 'S', 'V', 'F']
        aligned_proba = np.zeros((X.shape[0], len(self._class_names)), dtype=np.float32)
        for i, cls in enumerate(self._class_names):
            if cls in self._class_to_idx:
                aligned_proba[:, i] = raw_proba[:, self._class_to_idx[cls]]

        return aligned_proba

    def predict_with_probabilities(
        self,
        features: np.ndarray,
        is_valid_mask: Optional[np.ndarray] = None,
    ) -> List[BeatPrediction]:
        """Predict classes with confidence and probability dictionaries for each beat.

        Supports an optional boolean mask `is_valid_mask`. Invalid beats (e.g. edge beats)
        are flagged as `unclassified_edge_beat` without entering the Random Forest.
        """
        arr = np.asarray(features, dtype=np.float32)
        if arr.ndim == 1:
            arr = arr.reshape(1, -1)

        n_samples = arr.shape[0]
        results: List[BeatPrediction] = []

        if is_valid_mask is None:
            is_valid_mask = np.ones((n_samples,), dtype=bool)
        else:
            is_valid_mask = np.asarray(is_valid_mask, dtype=bool)

        # Separate valid beats from edge/invalid beats
        valid_indices = np.where(is_valid_mask)[0]

        if len(valid_indices) > 0:
            valid_X = arr[valid_indices]
            valid_preds = self.predict(valid_X)
            valid_probas = self.predict_proba(valid_X)
        else:
            valid_preds = np.empty((0,), dtype=str)
            valid_probas = np.empty((0, len(self._class_names)), dtype=np.float32)

        valid_pointer = 0
        for i in range(n_samples):
            if is_valid_mask[i]:
                pred_cls = str(valid_preds[valid_pointer])
                probas = valid_probas[valid_pointer]
                prob_dict = {cls: float(probas[c_idx]) for c_idx, cls in enumerate(self._class_names)}
                confidence = float(np.max(probas))
                results.append(
                    BeatPrediction(
                        predicted_class=pred_cls,
                        confidence=confidence,
                        probabilities=prob_dict,
                        is_valid=True,
                        reason=None,
                    )
                )
                valid_pointer += 1
            else:
                # Controlled edge beat response
                results.append(
                    BeatPrediction(
                        predicted_class=EDGE_BEAT_CLASS,
                        confidence=0.0,
                        probabilities={cls: 0.0 for cls in self._class_names},
                        is_valid=False,
                        reason="Edge beat (first or last beat in record lacks bidirectional RR interval)",
                    )
                )

        return results

    @staticmethod
    def create_edge_beat_result(reason: str = "Boundary edge beat") -> BeatPrediction:
        """Helper generating a standardized unclassified edge beat result."""
        return BeatPrediction(
            predicted_class=EDGE_BEAT_CLASS,
            confidence=0.0,
            probabilities={cls: 0.0 for cls in AAMI_4_CLASSES},
            is_valid=False,
            reason=reason,
        )


def get_inference_service() -> InferenceService:
    """Convenience accessor for the InferenceService singleton."""
    return InferenceService.get_instance()
