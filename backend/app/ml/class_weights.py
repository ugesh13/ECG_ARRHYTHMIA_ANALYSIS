"""Leakage-Safe Class Weight Calculation for Handling Severe Class Imbalance.

Calculates balanced class weights strictly from TRAINING split labels.
Prevents data leakage by ensuring validation and test distributions never
influence the sample weighting.
"""
from collections import Counter
import logging
from typing import Dict, List, Optional, Sequence, Union
import numpy as np

logger = logging.getLogger(__name__)

# Standard AAMI EC57 Classes
AAMI_CLASSES: List[str] = ["N", "S", "V", "F", "Q"]


def compute_balanced_class_weights(
    train_labels: Sequence[str],
    classes: Optional[Sequence[str]] = None,
    max_weight_cap: Optional[float] = None,
) -> Dict[str, float]:
    """Compute balanced class weights strictly from training set labels.

    Formula (standard scikit-learn 'balanced' formulation):
        w_c = N_train / (K * N_{c, train})

    Where:
        N_train: total training samples
        K: number of distinct classes present (or defined in `classes`)
        N_{c, train}: number of training samples belonging to class c

    Parameters:
    -----------
    train_labels : Sequence[str]
        Sequence of class labels from the TRAINING split ONLY.
    classes : Optional[Sequence[str]]
        Fixed class list (defaults to standard AAMI_CLASSES).
    max_weight_cap : Optional[float]
        Optional upper bound to prevent extreme numerical weights on ultra-rare classes.

    Returns:
    --------
    Dict[str, float] : Map from class label to balanced positive weight.
    """
    if len(train_labels) == 0:
        raise ValueError("Cannot compute class weights from an empty training label set.")

    if classes is None:
        target_classes = sorted(list(set(train_labels)))
    else:
        target_classes = list(classes)

    total_samples = len(train_labels)
    counts = Counter(train_labels)
    n_classes = len(target_classes)

    weights: Dict[str, float] = {}
    for cls in target_classes:
        count = counts.get(cls, 0)
        if count == 0:
            logger.warning("Class '%s' has 0 occurrences in training labels.", cls)
            # Default fallback for unrepresented class: 1.0 or capped
            weight = 1.0
        else:
            weight = total_samples / (n_classes * count)

        if max_weight_cap is not None and weight > max_weight_cap:
            weight = max_weight_cap

        weights[cls] = float(weight)

    return weights


def get_sample_weights(
    labels: Sequence[str],
    class_weights: Dict[str, float],
) -> np.ndarray:
    """Map class weights to an array of sample weights for training.

    Parameters:
    -----------
    labels : Sequence[str]
        Labels for the samples to weight.
    class_weights : Dict[str, float]
        Precomputed training-only class weight dictionary.
    """
    return np.array([class_weights.get(lbl, 1.0) for lbl in labels], dtype=np.float32)
