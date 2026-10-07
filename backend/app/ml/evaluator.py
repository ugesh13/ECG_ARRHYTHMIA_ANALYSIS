"""Evaluation and Performance Reporting Module for 4-Class ECG Baselines.

Computes standard clinical validation metrics: Accuracy, Balanced Accuracy,
Macro & Weighted F1, Per-Class Precision/Recall/F1/Support, Confusion Matrix,
ROC-AUC (One-vs-Rest Macro), and PR-AUC. Generates standalone SVG confusion matrix plots.
Strictly operates on validation data — never touches test data.
"""
from dataclasses import asdict, dataclass
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.preprocessing import label_binarize

from app.ml.models import AAMI_4_CLASSES

logger = logging.getLogger(__name__)


@dataclass
class PerClassMetrics:
    """Class-specific diagnostic performance metrics."""
    class_label: str
    precision: float
    recall: float
    f1_score: float
    support: int


@dataclass
class ModelEvaluationReport:
    """Comprehensive performance evaluation report for a trained classifier."""
    model_name: str
    accuracy: float
    balanced_accuracy: float
    macro_precision: float
    macro_recall: float
    macro_f1: float
    weighted_f1: float
    roc_auc_ovr_macro: Optional[float]
    pr_auc_ovr_macro: Optional[float]
    per_class: Dict[str, PerClassMetrics]
    confusion_matrix: List[List[int]]
    classes: List[str]
    total_val_samples: int
    notes: List[str]

    def to_dict(self) -> Dict[str, Any]:
        """Convert report to JSON-serializable dictionary."""
        d = asdict(self)
        return d


def evaluate_predictions(
    y_true: Sequence[str],
    y_pred: Sequence[str],
    y_proba: Optional[np.ndarray] = None,
    model_name: str = "baseline_model",
    classes: Sequence[str] = AAMI_4_CLASSES,
) -> ModelEvaluationReport:
    """Compute comprehensive validation metrics for multiclass predictions.

    Parameters:
    -----------
    y_true : Sequence[str]
        Ground truth labels on the validation set.
    y_pred : Sequence[str]
        Predicted labels on the validation set.
    y_proba : Optional[np.ndarray]
        Predicted probabilities matrix of shape (N, len(classes)).
    model_name : str
        Human-readable name of the evaluated model.
    classes : Sequence[str]
        Target class list in canonical order ('N', 'S', 'V', 'F').
    """
    classes_list = list(classes)
    y_true_arr = np.array(y_true)
    y_pred_arr = np.array(y_pred)
    total_samples = len(y_true_arr)

    if total_samples == 0:
        raise ValueError("Cannot evaluate predictions on an empty dataset.")

    # 1. Overall Global Metrics
    acc = float(accuracy_score(y_true_arr, y_pred_arr))
    bal_acc = float(balanced_accuracy_score(y_true_arr, y_pred_arr))
    macro_p = float(precision_score(y_true_arr, y_pred_arr, labels=classes_list, average="macro", zero_division=0))
    macro_r = float(recall_score(y_true_arr, y_pred_arr, labels=classes_list, average="macro", zero_division=0))
    macro_f1 = float(f1_score(y_true_arr, y_pred_arr, labels=classes_list, average="macro", zero_division=0))
    weighted_f1 = float(f1_score(y_true_arr, y_pred_arr, labels=classes_list, average="weighted", zero_division=0))

    # 2. Confusion Matrix (rows = true class, columns = predicted class)
    cm = confusion_matrix(y_true_arr, y_pred_arr, labels=classes_list)

    # 3. Per-Class Metrics
    per_class: Dict[str, PerClassMetrics] = {}
    for idx, cls in enumerate(classes_list):
        cls_true = (y_true_arr == cls)
        cls_pred = (y_pred_arr == cls)
        support = int(np.sum(cls_true))

        p = float(precision_score(cls_true, cls_pred, zero_division=0))
        r = float(recall_score(cls_true, cls_pred, zero_division=0))
        f = float(f1_score(cls_true, cls_pred, zero_division=0))

        per_class[cls] = PerClassMetrics(
            class_label=cls,
            precision=round(p, 4),
            recall=round(r, 4),
            f1_score=round(f, 4),
            support=support,
        )

    # 4. Multiclass ROC-AUC and PR-AUC (One-vs-Rest, Macro-averaged)
    roc_auc_val: Optional[float] = None
    pr_auc_val: Optional[float] = None
    notes: List[str] = []

    # Check minority class support warning
    f_support = per_class.get("F", PerClassMetrics("F", 0, 0, 0, 0)).support
    if f_support <= 10:
        notes.append(
            f"F-class validation support is only {f_support} beats; therefore F-class validation "
            "metrics have high sampling uncertainty and should not be interpreted as definitive generalization performance."
        )

    if y_proba is not None and y_proba.ndim == 2 and y_proba.shape[1] == len(classes_list):
        try:
            # Binarize labels for One-vs-Rest ROC & PR curves
            y_bin = label_binarize(y_true_arr, classes=classes_list)
            if y_bin.shape[1] == len(classes_list):
                # ROC-AUC OVR Macro
                roc_auc_val = float(roc_auc_score(y_bin, y_proba, multi_class="ovr", average="macro"))
                # Average Precision OVR Macro (PR-AUC)
                pr_auc_val = float(average_precision_score(y_bin, y_proba, average="macro"))
        except Exception as e:
            logger.warning("ROC-AUC / PR-AUC calculation failed: %s", str(e))
            notes.append(f"ROC-AUC / PR-AUC calculation warning: {str(e)}")

    return ModelEvaluationReport(
        model_name=model_name,
        accuracy=round(acc, 4),
        balanced_accuracy=round(bal_acc, 4),
        macro_precision=round(macro_p, 4),
        macro_recall=round(macro_r, 4),
        macro_f1=round(macro_f1, 4),
        weighted_f1=round(weighted_f1, 4),
        roc_auc_ovr_macro=round(roc_auc_val, 4) if roc_auc_val is not None else None,
        pr_auc_ovr_macro=round(pr_auc_val, 4) if pr_auc_val is not None else None,
        per_class=per_class,
        confusion_matrix=cm.tolist(),
        classes=classes_list,
        total_val_samples=total_samples,
        notes=notes,
    )


def generate_confusion_matrix_svg(
    cm: Sequence[Sequence[int]],
    classes: Sequence[str],
    model_name: str,
    output_path: Path,
    width: int = 560,
    height: int = 520,
) -> None:
    """Generate a clean, standalone SVG visual representation of the confusion matrix.

    Rows indicate Ground Truth class; Columns indicate Predicted class.
    Cells are styled with dynamic color intensity matching cell concentration.
    """
    cm_arr = np.array(cm, dtype=np.int64)
    n_classes = len(classes)
    row_sums = cm_arr.sum(axis=1)

    margin_left = 110
    margin_top = 100
    grid_size = 320
    cell_size = grid_size / n_classes

    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" style="background:#ffffff; font-family:system-ui,-apple-system,sans-serif;">',
        f'  <!-- Header -->',
        f'  <text x="{width/2}" y="32" font-size="16" font-weight="bold" fill="#0f172a" text-anchor="middle">Confusion Matrix: {model_name}</text>',
        f'  <text x="{width/2}" y="52" font-size="11" fill="#64748b" text-anchor="middle">Validation Set | Rows: True Class | Columns: Predicted Class</text>',
        f'  <!-- Column Labels (Predicted) -->',
        f'  <text x="{margin_left + grid_size/2}" y="78" font-size="12" font-weight="600" fill="#334155" text-anchor="middle">Predicted Class</text>',
    ]

    for col_idx, cls in enumerate(classes):
        x = margin_left + col_idx * cell_size + cell_size / 2
        svg_lines.append(
            f'  <text x="{x}" y="95" font-size="12" font-weight="bold" fill="#1e293b" text-anchor="middle">{cls}</text>'
        )

    # Row Labels (True)
    svg_lines.append(
        f'  <text x="24" y="{margin_top + grid_size/2}" font-size="12" font-weight="600" fill="#334155" text-anchor="middle" transform="rotate(-90 24 {margin_top + grid_size/2})">True Class</text>'
    )

    for row_idx, cls in enumerate(classes):
        y = margin_top + row_idx * cell_size + cell_size / 2 + 4
        svg_lines.append(
            f'  <text x="{margin_left - 15}" y="{y}" font-size="12" font-weight="bold" fill="#1e293b" text-anchor="end">{cls}</text>'
        )

    # Grid Cells
    for r in range(n_classes):
        for c in range(n_classes):
            val = int(cm_arr[r, c])
            r_sum = int(row_sums[r])
            norm_val = val / r_sum if r_sum > 0 else 0.0

            x = margin_left + c * cell_size
            y = margin_top + r * cell_size

            # Dynamic heatmap fill: soft blue-green for correct, soft red/orange for off-diagonal
            if r == c:
                # Diagonal (Correct)
                alpha = max(0.12, min(0.9, 0.15 + norm_val * 0.75))
                fill_color = f"rgba(14, 165, 233, {alpha:.2f})"
                text_color = "#0369a1" if alpha < 0.6 else "#ffffff"
            else:
                # Off-diagonal (Misclassifications)
                alpha = max(0.04, min(0.85, norm_val * 0.9)) if val > 0 else 0.02
                fill_color = f"rgba(244, 63, 94, {alpha:.2f})" if val > 0 else "#f8fafc"
                text_color = "#e11d48" if alpha < 0.6 else "#ffffff"

            svg_lines.append(
                f'  <rect x="{x}" y="{y}" width="{cell_size}" height="{cell_size}" fill="{fill_color}" stroke="#cbd5e1" stroke-width="1" />'
            )
            # Count
            svg_lines.append(
                f'  <text x="{x + cell_size/2}" y="{y + cell_size/2 - 4}" font-size="13" font-weight="bold" fill="{text_color}" text-anchor="middle">{val:,}</text>'
            )
            # Percentage
            pct_str = f"{norm_val*100:.1f}%" if r_sum > 0 else "0%"
            pct_color = text_color
            svg_lines.append(
                f'  <text x="{x + cell_size/2}" y="{y + cell_size/2 + 14}" font-size="10" fill="{pct_color}" text-anchor="middle">({pct_str})</text>'
            )

    # Support column totals
    svg_lines.append(
        f'  <text x="{margin_left + grid_size + 15}" y="95" font-size="11" font-weight="600" fill="#64748b" text-anchor="start">Total</text>'
    )
    for r in range(n_classes):
        y = margin_top + r * cell_size + cell_size / 2 + 4
        svg_lines.append(
            f'  <text x="{margin_left + grid_size + 15}" y="{y}" font-size="11" fill="#475569" text-anchor="start">{int(row_sums[r]):,}</text>'
        )

    # Footer
    svg_lines.append(
        f'  <text x="{width/2}" y="{height - 20}" font-size="11" fill="#94a3b8" text-anchor="middle">Total Validation Beats: {int(cm_arr.sum()):,} | ANSI/AAMI EC57 Benchmark</text>'
    )
    svg_lines.append('</svg>')

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(svg_lines))
    logger.info("Saved confusion matrix SVG to %s", output_path)
