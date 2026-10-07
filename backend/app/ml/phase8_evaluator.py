"""Phase 8 Final Model Freeze and Locked DS2 Test Evaluation Module.

Implements the single, final held-out test evaluation on the 22 DS2 records of the
MIT-BIH Arrhythmia Database. Strictly isolates learned preprocessing to training data
and generates comprehensive diagnostic, error, record-level, and model card artifacts.
"""
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import sklearn
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

from app.core.config import settings
from app.ml.class_weights import compute_balanced_class_weights
from app.ml.data_loader import BeatBatch, ECGDatasetLoader
from app.ml.evaluator import (
    ModelEvaluationReport,
    PerClassMetrics,
    evaluate_predictions,
    generate_confusion_matrix_svg,
)
from app.ml.models import AAMI_4_CLASSES, create_random_forest
from app.ml.rr_features import (
    BIDIRECTIONAL_FEATURE_NAMES,
    RRFeatureExtractor,
    prepare_phase6_datasets,
)

logger = logging.getLogger(__name__)


def prepare_phase8_test_datasets(
    loader: ECGDatasetLoader,
    extractor: Optional[RRFeatureExtractor] = None,
) -> Dict[str, Any]:
    """Prepare the locked DS2 test set using the frozen Phase 6 bidirectional feature pipeline."""
    if extractor is None:
        extractor = RRFeatureExtractor()

    # Load raw 4-class test batch (22 DS2 records only)
    test_batch = loader.get_test_data()
    test_mask = np.isin(test_batch.labels, AAMI_4_CLASSES)

    test_filtered = BeatBatch(
        signals=test_batch.signals[test_mask],
        labels=test_batch.labels[test_mask],
        record_ids=test_batch.record_ids[test_mask],
        lead_names=test_batch.lead_names[test_mask],
        sample_indices=test_batch.sample_indices[test_mask],
        symbols=test_batch.symbols[test_mask],
    )

    test_meta, _, test_bidi = extractor.extract_timing_for_batch(test_filtered)
    test_valid_mask = np.array([m.is_valid_bidirectional for m in test_meta], dtype=bool)

    test_clean_timing = test_bidi[test_valid_mask]
    assert not np.isnan(test_clean_timing).any(), "NaN found in clean test timing features."
    assert not np.isinf(test_clean_timing).any(), "Inf found in clean test timing features."

    X_test_morph = test_filtered.signals[test_valid_mask].astype(np.float32)
    y_test = test_filtered.labels[test_valid_mask].astype(str)
    X_test_comb = np.hstack([X_test_morph, test_clean_timing]).astype(np.float32)

    return {
        "X_test_combined": X_test_comb,
        "y_test": y_test,
        "test_meta": [m for i, m in enumerate(test_meta) if test_valid_mask[i]],
        "feature_names": [f"ECG_{i:03d}" for i in range(200)] + list(BIDIRECTIONAL_FEATURE_NAMES),
        "total_examined": len(test_filtered),
        "usable_bidi": int(np.sum(test_valid_mask)),
        "excluded_edge_beats": int(len(test_filtered) - np.sum(test_valid_mask)),
    }


def execute_phase8_final_evaluation(
    data_dir: Optional[Path] = None,
    output_dir: Optional[Path] = None,
    models_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """Execute the final Phase 8 training and single DS2 evaluation."""
    if output_dir is None:
        output_dir = settings.mitbih_dir.parent / "processed" / "ml_results"
    if models_dir is None:
        models_dir = settings.mitbih_dir.parent.parent / "models" / "phase8"

    output_dir.mkdir(parents=True, exist_ok=True)
    models_dir.mkdir(parents=True, exist_ok=True)

    loader = ECGDatasetLoader()
    extractor = RRFeatureExtractor()

    # 1. Load Training Data (16 DS1 records only)
    logger.info("Loading training data (16 DS1 records)...")
    train_data = prepare_phase6_datasets(loader, extractor=extractor, variant="bidirectional")
    X_train = train_data["X_train_combined"]
    y_train = train_data["y_train"]

    # 2. Retrain the Frozen Random Forest model strictly on training data
    logger.info("Fitting frozen Random Forest on %d training beats...", len(X_train))
    model = create_random_forest(
        n_estimators=200,
        max_depth=30,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.min_samples_split = 5
    model.min_samples_leaf = 2
    model.max_features = "sqrt"

    model.fit(X_train, y_train)

    # Save frozen model artifact
    model_path = models_dir / "random_forest_final_phase8.joblib"
    joblib.dump(model, model_path)
    logger.info("Saved final frozen model to %s", model_path)

    # 3. Load Held-Out DS2 Test Set (22 records)
    logger.info("Loading held-out DS2 test set (22 records)...")
    test_data = prepare_phase8_test_datasets(loader, extractor=extractor)
    X_test = test_data["X_test_combined"]
    y_test = test_data["y_test"]
    test_meta = test_data["test_meta"]

    # 4. Predict ONCE on DS2
    logger.info("Executing single inference pass on %d DS2 test beats...", len(X_test))
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)

    # 5. Evaluate DS2 Metrics
    report = evaluate_predictions(
        y_true=y_test,
        y_pred=y_pred,
        y_proba=y_proba,
        model_name="Random Forest Final (Phase 8 Locked DS2 Benchmark)",
        classes=AAMI_4_CLASSES,
    )

    # Generate Confusion Matrix SVG
    cm_svg_path = output_dir / "phase8_ds2_confusion_matrix.svg"
    generate_confusion_matrix_svg(
        cm=report.confusion_matrix,
        classes=AAMI_4_CLASSES,
        model_name="Random Forest (Locked DS2 Test Set)",
        output_path=cm_svg_path,
    )

    # 6. Compute Record-Level Breakdown
    test_records = np.array([m.record_id for m in test_meta])
    record_results: List[Dict[str, Any]] = []

    for rec_id in sorted(list(set(test_records))):
        rec_mask = test_records == rec_id
        y_true_rec = y_test[rec_mask]
        y_pred_rec = y_pred[rec_mask]

        acc = float(accuracy_score(y_true_rec, y_pred_rec))
        rec_stats: Dict[str, Any] = {
            "record_id": rec_id,
            "evaluated_beats": int(len(y_true_rec)),
            "accuracy": round(acc, 4),
        }
        for cls in AAMI_4_CLASSES:
            cls_mask = y_true_rec == cls
            if np.sum(cls_mask) > 0:
                rec_stats[f"{cls}_recall"] = round(float(recall_score(y_true_rec == cls, y_pred_rec == cls, zero_division=0)), 4)
                rec_stats[f"{cls}_support"] = int(np.sum(cls_mask))
            else:
                rec_stats[f"{cls}_recall"] = None
                rec_stats[f"{cls}_support"] = 0
        record_results.append(rec_stats)

    # Save DS2_RECORD_RESULTS.csv
    csv_path = output_dir / "DS2_RECORD_RESULTS.csv"
    with open(csv_path, "w", encoding="utf-8") as f:
        f.write("record_id,evaluated_beats,accuracy,N_recall,N_support,S_recall,S_support,V_recall,V_support,F_recall,F_support\n")
        for r in record_results:
            n_r = "" if r["N_recall"] is None else f"{r['N_recall']:.4f}"
            s_r = "" if r["S_recall"] is None else f"{r['S_recall']:.4f}"
            v_r = "" if r["V_recall"] is None else f"{r['V_recall']:.4f}"
            f_r = "" if r["F_recall"] is None else f"{r['F_recall']:.4f}"
            f.write(f"{r['record_id']},{r['evaluated_beats']},{r['accuracy']:.4f},{n_r},{r['N_support']},{s_r},{r['S_support']},{v_r},{r['V_support']},{f_r},{r['F_support']}\n")

    # 7. Compute Feature Importances
    importances = model.feature_importances_
    feat_names = test_data["feature_names"]
    sorted_idx = np.argsort(importances)[::-1]
    top_15_features = [{"feature": feat_names[i], "importance": round(float(importances[i]), 5)} for i in sorted_idx[:15]]
    temporal_importance_sum = float(np.sum([importances[i] for i, name in enumerate(feat_names) if name in BIDIRECTIONAL_FEATURE_NAMES]))

    # Save DS2_TEST_RESULTS.json
    results_json = {
        "model_name": "RandomForestClassifier",
        "phase": 8,
        "evaluation_partition": "DS2 (22 Held-Out Test Records)",
        "evaluated_beats_count": len(y_test),
        "class_supports": {cls: int(report.per_class[cls].support) for cls in AAMI_4_CLASSES},
        "accuracy": report.accuracy,
        "balanced_accuracy": report.balanced_accuracy,
        "macro_precision": report.macro_precision,
        "macro_recall": report.macro_recall,
        "macro_f1": report.macro_f1,
        "weighted_f1": report.weighted_f1,
        "roc_auc_ovr_macro": report.roc_auc_ovr_macro,
        "pr_auc_ovr_macro": report.pr_auc_ovr_macro,
        "per_class": {cls: report.per_class[cls].to_dict() for cls in AAMI_4_CLASSES},
        "confusion_matrix": report.confusion_matrix,
        "top_15_features": top_15_features,
        "temporal_features_total_importance": round(temporal_importance_sum, 4),
        "evaluated_at_utc": datetime.now(timezone.utc).isoformat(),
        "library_versions": {
            "scikit-learn": sklearn.__version__,
            "numpy": np.__version__,
            "joblib": joblib.__version__,
        },
    }
    with open(output_dir / "DS2_TEST_RESULTS.json", "w", encoding="utf-8") as f:
        json.dump(results_json, f, indent=2)

    return {
        "report": report,
        "record_results": record_results,
        "top_15_features": top_15_features,
        "temporal_importance": temporal_importance_sum,
        "results_json": results_json,
    }
