"""Hyperparameter Optimization Module for Phase 7 ECG Classification.

Implements record-grouped cross-validation strictly within the 16-record training set.
Evaluates candidate parameter configurations for Logistic Regression, Random Forest,
and HistGradientBoostingClassifier using training-fold balanced class/sample weighting.
The final DS1 validation partition (6 records) and the DS2 test partition (22 records)
remain strictly unseen during hyperparameter search.
"""
from dataclasses import asdict, dataclass
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
from sklearn.metrics import balanced_accuracy_score, f1_score
from sklearn.model_selection import GroupKFold, StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.ml.class_weights import compute_balanced_class_weights, get_sample_weights
from app.ml.models import (
    AAMI_4_CLASSES,
    create_hist_gradient_boosting,
    create_logistic_regression,
    create_random_forest,
)

logger = logging.getLogger(__name__)


@dataclass
class CVSearchCandidateResult:
    """Evaluation result for a single hyperparameter configuration across CV folds."""
    model_name: str
    params: Dict[str, Any]
    fold_macro_f1s: List[float]
    fold_balanced_accs: List[float]
    mean_macro_f1: float
    std_macro_f1: float
    mean_balanced_acc: float
    std_balanced_acc: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def get_record_grouped_cv_splits(
    y: np.ndarray,
    record_ids: np.ndarray,
    n_splits: int = 4,
    random_state: int = 42,
    use_stratified: bool = True,
) -> List[Tuple[np.ndarray, np.ndarray]]:
    """Generate record-grouped cross-validation folds ensuring zero record leakage across folds."""
    unique_records = np.unique(record_ids)
    if len(unique_records) < n_splits:
        raise ValueError(f"Cannot create {n_splits} folds with only {len(unique_records)} records.")

    splits: List[Tuple[np.ndarray, np.ndarray]] = []
    if use_stratified:
        try:
            sgkf = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
            for tr_idx, val_idx in sgkf.split(X=np.zeros(len(y)), y=y, groups=record_ids):
                # Verify zero overlap
                tr_recs = set(record_ids[tr_idx])
                val_recs = set(record_ids[val_idx])
                assert len(tr_recs.intersection(val_recs)) == 0, "Record leakage detected in CV split!"
                splits.append((tr_idx, val_idx))
            return splits
        except Exception as exc:
            logger.warning("StratifiedGroupKFold failed (%s); falling back to GroupKFold.", exc)

    gkf = GroupKFold(n_splits=n_splits)
    for tr_idx, val_idx in gkf.split(X=np.zeros(len(y)), y=y, groups=record_ids):
        tr_recs = set(record_ids[tr_idx])
        val_recs = set(record_ids[val_idx])
        assert len(tr_recs.intersection(val_recs)) == 0, "Record leakage detected in CV split!"
        splits.append((tr_idx, val_idx))
    return splits


def tune_logistic_regression(
    X: np.ndarray,
    y: np.ndarray,
    record_ids: np.ndarray,
    cv_splits: List[Tuple[np.ndarray, np.ndarray]],
    c_values: Sequence[float] = (0.01, 0.1, 1.0, 10.0, 100.0),
) -> Tuple[Dict[str, Any], List[CVSearchCandidateResult]]:
    """Tune regularization parameter C for Logistic Regression pipeline using grouped CV."""
    logger.info("Tuning Logistic Regression across C=%s...", list(c_values))
    candidate_results: List[CVSearchCandidateResult] = []

    for c in c_values:
        fold_f1s: List[float] = []
        fold_accs: List[float] = []

        for fold_idx, (tr_idx, val_idx) in enumerate(cv_splits):
            X_tr, y_tr = X[tr_idx], y[tr_idx]
            X_val, y_val = X[val_idx], y[val_idx]

            pipe = create_logistic_regression(
                C=c,
                class_weight="balanced",
                solver="lbfgs",
                max_iter=1000,
                random_state=42,
            )
            pipe.fit(X_tr, y_tr)
            y_pred = pipe.predict(X_val)

            f1 = float(f1_score(y_val, y_pred, labels=AAMI_4_CLASSES, average="macro", zero_division=0))
            bal_acc = float(balanced_accuracy_score(y_val, y_pred))
            fold_f1s.append(f1)
            fold_accs.append(bal_acc)

        res = CVSearchCandidateResult(
            model_name="logistic_regression",
            params={"C": float(c), "class_weight": "balanced", "solver": "lbfgs", "max_iter": 1000},
            fold_macro_f1s=[round(f, 4) for f in fold_f1s],
            fold_balanced_accs=[round(a, 4) for a in fold_accs],
            mean_macro_f1=round(float(np.mean(fold_f1s)), 4),
            std_macro_f1=round(float(np.std(fold_f1s)), 4),
            mean_balanced_acc=round(float(np.mean(fold_accs)), 4),
            std_balanced_acc=round(float(np.std(fold_accs)), 4),
        )
        candidate_results.append(res)
        logger.info("  C=%.2f -> CV Macro F1: %.4f (+/- %.4f)", c, res.mean_macro_f1, res.std_macro_f1)

    # Select candidate with highest mean Macro F1
    best_candidate = max(candidate_results, key=lambda r: r.mean_macro_f1)
    logger.info("Best Logistic Regression configuration: %s (CV Macro F1 = %.4f)", best_candidate.params, best_candidate.mean_macro_f1)
    return best_candidate.params, candidate_results


def tune_random_forest(
    X: np.ndarray,
    y: np.ndarray,
    record_ids: np.ndarray,
    cv_splits: List[Tuple[np.ndarray, np.ndarray]],
) -> Tuple[Dict[str, Any], List[CVSearchCandidateResult]]:
    """Tune Random Forest architectural hyperparameters using grouped CV."""
    logger.info("Tuning Random Forest hyperparameters...")
    # Targeted search grid covering the locked search bounds
    candidate_grid: List[Dict[str, Any]] = [
        {"n_estimators": 100, "max_depth": None, "min_samples_split": 2, "min_samples_leaf": 1, "max_features": "sqrt"},
        {"n_estimators": 200, "max_depth": None, "min_samples_split": 2, "min_samples_leaf": 1, "max_features": "sqrt"},
        {"n_estimators": 200, "max_depth": 20, "min_samples_split": 5, "min_samples_leaf": 2, "max_features": "sqrt"},
        {"n_estimators": 200, "max_depth": 30, "min_samples_split": 5, "min_samples_leaf": 1, "max_features": "sqrt"},
        {"n_estimators": 300, "max_depth": None, "min_samples_split": 5, "min_samples_leaf": 2, "max_features": "sqrt"},
        {"n_estimators": 200, "max_depth": 20, "min_samples_split": 5, "min_samples_leaf": 2, "max_features": "log2"},
        {"n_estimators": 100, "max_depth": 20, "min_samples_split": 10, "min_samples_leaf": 5, "max_features": "sqrt"},
        {"n_estimators": 200, "max_depth": 30, "min_samples_split": 10, "min_samples_leaf": 2, "max_features": "sqrt"},
    ]

    candidate_results: List[CVSearchCandidateResult] = []

    for params in candidate_grid:
        fold_f1s: List[float] = []
        fold_accs: List[float] = []

        for fold_idx, (tr_idx, val_idx) in enumerate(cv_splits):
            X_tr, y_tr = X[tr_idx], y[tr_idx]
            X_val, y_val = X[val_idx], y[val_idx]

            rf = create_random_forest(
                n_estimators=params["n_estimators"],
                max_depth=params["max_depth"],
                class_weight="balanced",
                random_state=42,
                n_jobs=-1,
            )
            rf.min_samples_split = params["min_samples_split"]
            rf.min_samples_leaf = params["min_samples_leaf"]
            rf.max_features = params["max_features"]

            rf.fit(X_tr, y_tr)
            y_pred = rf.predict(X_val)

            f1 = float(f1_score(y_val, y_pred, labels=AAMI_4_CLASSES, average="macro", zero_division=0))
            bal_acc = float(balanced_accuracy_score(y_val, y_pred))
            fold_f1s.append(f1)
            fold_accs.append(bal_acc)

        res = CVSearchCandidateResult(
            model_name="random_forest",
            params={**params, "class_weight": "balanced", "random_state": 42},
            fold_macro_f1s=[round(f, 4) for f in fold_f1s],
            fold_balanced_accs=[round(a, 4) for a in fold_accs],
            mean_macro_f1=round(float(np.mean(fold_f1s)), 4),
            std_macro_f1=round(float(np.std(fold_f1s)), 4),
            mean_balanced_acc=round(float(np.mean(fold_accs)), 4),
            std_balanced_acc=round(float(np.std(fold_accs)), 4),
        )
        candidate_results.append(res)
        logger.info("  RF params %s -> CV Macro F1: %.4f (+/- %.4f)", params, res.mean_macro_f1, res.std_macro_f1)

    best_candidate = max(candidate_results, key=lambda r: r.mean_macro_f1)
    logger.info("Best Random Forest configuration: %s (CV Macro F1 = %.4f)", best_candidate.params, best_candidate.mean_macro_f1)
    return best_candidate.params, candidate_results


def tune_hist_gradient_boosting(
    X: np.ndarray,
    y: np.ndarray,
    record_ids: np.ndarray,
    cv_splits: List[Tuple[np.ndarray, np.ndarray]],
) -> Tuple[Dict[str, Any], List[CVSearchCandidateResult]]:
    """Tune HistGradientBoostingClassifier hyperparameters using grouped CV."""
    logger.info("Tuning HistGradientBoosting hyperparameters...")
    candidate_grid: List[Dict[str, Any]] = [
        {"learning_rate": 0.1, "max_iter": 100, "max_leaf_nodes": 31, "min_samples_leaf": 20, "l2_regularization": 0.0},
        {"learning_rate": 0.05, "max_iter": 200, "max_leaf_nodes": 31, "min_samples_leaf": 20, "l2_regularization": 0.0},
        {"learning_rate": 0.05, "max_iter": 300, "max_leaf_nodes": 31, "min_samples_leaf": 20, "l2_regularization": 0.1},
        {"learning_rate": 0.05, "max_iter": 200, "max_leaf_nodes": 63, "min_samples_leaf": 20, "l2_regularization": 0.1},
        {"learning_rate": 0.03, "max_iter": 300, "max_leaf_nodes": 31, "min_samples_leaf": 20, "l2_regularization": 0.0},
        {"learning_rate": 0.1, "max_iter": 200, "max_leaf_nodes": 15, "min_samples_leaf": 50, "l2_regularization": 1.0},
        {"learning_rate": 0.05, "max_iter": 200, "max_leaf_nodes": 31, "min_samples_leaf": 50, "l2_regularization": 0.1},
        {"learning_rate": 0.1, "max_iter": 100, "max_leaf_nodes": 63, "min_samples_leaf": 10, "l2_regularization": 0.1},
    ]

    candidate_results: List[CVSearchCandidateResult] = []

    for params in candidate_grid:
        fold_f1s: List[float] = []
        fold_accs: List[float] = []

        for fold_idx, (tr_idx, val_idx) in enumerate(cv_splits):
            X_tr, y_tr = X[tr_idx], y[tr_idx]
            X_val, y_val = X[val_idx], y[val_idx]

            # Fold-specific sample weights derived strictly from training fold labels
            fold_weights = compute_balanced_class_weights(y_tr, classes=AAMI_4_CLASSES)
            fold_sample_weights = get_sample_weights(y_tr, fold_weights)

            hgb = create_hist_gradient_boosting(
                random_state=42,
                learning_rate=params["learning_rate"],
                max_iter=params["max_iter"],
                min_samples_leaf=params["min_samples_leaf"],
            )
            hgb.max_leaf_nodes = params["max_leaf_nodes"]
            hgb.l2_regularization = params["l2_regularization"]

            hgb.fit(X_tr, y_tr, sample_weight=fold_sample_weights)
            y_pred = hgb.predict(X_val)

            f1 = float(f1_score(y_val, y_pred, labels=AAMI_4_CLASSES, average="macro", zero_division=0))
            bal_acc = float(balanced_accuracy_score(y_val, y_pred))
            fold_f1s.append(f1)
            fold_accs.append(bal_acc)

        res = CVSearchCandidateResult(
            model_name="hist_gradient_boosting",
            params={**params, "random_state": 42, "sample_weights": "training_derived_balanced"},
            fold_macro_f1s=[round(f, 4) for f in fold_f1s],
            fold_balanced_accs=[round(a, 4) for a in fold_accs],
            mean_macro_f1=round(float(np.mean(fold_f1s)), 4),
            std_macro_f1=round(float(np.std(fold_f1s)), 4),
            mean_balanced_acc=round(float(np.mean(fold_accs)), 4),
            std_balanced_acc=round(float(np.std(fold_accs)), 4),
        )
        candidate_results.append(res)
        logger.info("  HGB params %s -> CV Macro F1: %.4f (+/- %.4f)", params, res.mean_macro_f1, res.std_macro_f1)

    best_candidate = max(candidate_results, key=lambda r: r.mean_macro_f1)
    logger.info("Best HistGradientBoosting configuration: %s (CV Macro F1 = %.4f)", best_candidate.params, best_candidate.mean_macro_f1)
    return best_candidate.params, candidate_results
