"""Baseline Machine Learning Models for 4-Class ECG Arrhythmia Classification.

Defines classical ML baselines (Logistic Regression with StandardScaler, Random Forest,
and HistGradientBoostingClassifier) with fixed seeds, transparent configurations,
and support for training-only class/sample weighting.
"""
from typing import Any, Dict, List, Optional
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# Primary 4-Class Diagnostic Target
AAMI_4_CLASSES: List[str] = ["N", "S", "V", "F"]


def create_logistic_regression(
    random_state: int = 42,
    max_iter: int = 1000,
    class_weight: str = "balanced",
    C: float = 1.0,
    solver: str = "lbfgs",
) -> Pipeline:
    """Create a Logistic Regression baseline encapsulated in a StandardScaler pipeline.

    StandardScaler is fitted strictly on the training set during pipeline.fit().
    """
    scaler = StandardScaler()
    clf = LogisticRegression(
        solver=solver,
        max_iter=max_iter,
        class_weight=class_weight,
        C=C,
        random_state=random_state,
    )
    return Pipeline(steps=[("scaler", scaler), ("classifier", clf)])


def create_random_forest(
    random_state: int = 42,
    n_estimators: int = 100,
    class_weight: str = "balanced",
    n_jobs: int = -1,
    max_depth: Optional[int] = None,
) -> RandomForestClassifier:
    """Create a Random Forest baseline classifier with class weighting."""
    return RandomForestClassifier(
        n_estimators=n_estimators,
        class_weight=class_weight,
        random_state=random_state,
        n_jobs=n_jobs,
        max_depth=max_depth,
    )


def create_hist_gradient_boosting(
    random_state: int = 42,
    max_iter: int = 100,
    learning_rate: float = 0.1,
    max_depth: Optional[int] = None,
    min_samples_leaf: int = 20,
) -> HistGradientBoostingClassifier:
    """Create a HistGradientBoosting baseline classifier.

    Note: HistGradientBoostingClassifier does not support a `class_weight` param,
    so balanced sample weights derived strictly from training labels are passed to fit().
    """
    return HistGradientBoostingClassifier(
        random_state=random_state,
        max_iter=max_iter,
        learning_rate=learning_rate,
        max_depth=max_depth,
        min_samples_leaf=min_samples_leaf,
    )


def get_baseline_model(model_name: str, **kwargs: Any) -> Any:
    """Factory retrieving a configured baseline model by key."""
    normalized_name = model_name.lower().replace("-", "_").strip()
    if normalized_name == "logistic_regression":
        return create_logistic_regression(**kwargs)
    elif normalized_name == "random_forest":
        return create_random_forest(**kwargs)
    elif normalized_name in ("hist_gradient_boosting", "hist_gradient_boosting_classifier"):
        return create_hist_gradient_boosting(**kwargs)
    else:
        raise ValueError(
            f"Unknown model name '{model_name}'. Supported baseline models are: "
            "'logistic_regression', 'random_forest', 'hist_gradient_boosting'."
        )


def get_baseline_model_names() -> List[str]:
    """Return ordered list of supported Phase 5 baseline model identifiers."""
    return ["logistic_regression", "random_forest", "hist_gradient_boosting"]


def get_model_hyperparameters(model_name: str, model_obj: Any) -> Dict[str, Any]:
    """Extract serializable hyperparameters for documentation and audit provenance."""
    normalized_name = model_name.lower().replace("-", "_").strip()
    if normalized_name == "logistic_regression":
        clf = model_obj.named_steps["classifier"] if isinstance(model_obj, Pipeline) else model_obj
        return {
            "pipeline": True,
            "scaler": "StandardScaler",
            "solver": clf.solver,
            "max_iter": clf.max_iter,
            "C": clf.C,
            "class_weight": clf.class_weight,
            "random_state": clf.random_state,
        }
    elif normalized_name == "random_forest":
        return {
            "pipeline": False,
            "n_estimators": model_obj.n_estimators,
            "max_depth": model_obj.max_depth,
            "class_weight": model_obj.class_weight,
            "random_state": model_obj.random_state,
            "n_jobs": model_obj.n_jobs,
        }
    elif normalized_name in ("hist_gradient_boosting", "hist_gradient_boosting_classifier"):
        return {
            "pipeline": False,
            "max_iter": model_obj.max_iter,
            "learning_rate": model_obj.learning_rate,
            "max_depth": model_obj.max_depth,
            "min_samples_leaf": model_obj.min_samples_leaf,
            "random_state": model_obj.random_state,
            "sample_weight_strategy": "training_only_balanced_weights",
        }
    return {}
