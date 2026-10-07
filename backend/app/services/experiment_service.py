"""Service for retrieving locked experimental results and model provenance.

All data is loaded from frozen Phase 8/9 artifacts stored in backend/data/processed/ml_results/.
Results are cached in-memory on first read for lightweight, non-blocking performance.
No scientific results are recalculated or retrained.
"""

from __future__ import annotations

import csv
import json
import logging
from pathlib import Path
from threading import Lock
from typing import Any, Optional

from fastapi import HTTPException

from app.core.config import settings
from app.models.schemas import (
    ArtifactDetail,
    BenchmarkResponse,
    ClassMetricItem,
    CohortDistributionItem,
    ConfusionMatrixResponse,
    DatasetDistributionResponse,
    ExperimentArtifactsResponse,
    FeatureImportanceItem,
    FeatureImportanceResponse,
    GeneralizationComparisonRow,
    GeneralizationMetrics,
    GeneralizationResponse,
    ModelInfoResponse,
    OverallBenchmarkMetrics,
    RecordBreakdownItem,
    RecordBreakdownResponse,
)

logger = logging.getLogger(__name__)


class ExperimentService:
    """Provides thread-safe access to locked experimental artifacts and model provenance."""

    def __init__(self, ml_results_dir: Optional[Path] = None):
        self._results_dir = ml_results_dir or settings.ml_results_dir
        self._lock = Lock()
        self._cache: dict[str, Any] = {}

    def _get_path(self, relative_path: str) -> Path:
        return self._results_dir / relative_path

    def _require_file(self, relative_path: str, logical_name: str) -> Path:
        path = self._get_path(relative_path)
        if not path.is_file():
            logger.error("Required artifact '%s' not found at %s", logical_name, path)
            raise HTTPException(
                status_code=503,
                detail=f"Experimental artifact '{logical_name}' is currently unavailable.",
            )
        return path

    def _load_json(self, relative_path: str, logical_name: str) -> dict[str, Any]:
        with self._lock:
            cache_key = f"json:{relative_path}"
            if cache_key in self._cache:
                return self._cache[cache_key]
            path = self._require_file(relative_path, logical_name)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self._cache[cache_key] = data
                return data
            except Exception as exc:
                logger.error("Failed to parse JSON artifact '%s': %s", logical_name, exc)
                raise HTTPException(
                    status_code=503,
                    detail=f"Experimental artifact '{logical_name}' could not be parsed.",
                ) from exc

    def _load_csv(self, relative_path: str, logical_name: str) -> list[dict[str, str]]:
        with self._lock:
            cache_key = f"csv:{relative_path}"
            if cache_key in self._cache:
                return self._cache[cache_key]
            path = self._require_file(relative_path, logical_name)
            try:
                rows: list[dict[str, str]] = []
                with open(path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        rows.append(row)
                self._cache[cache_key] = rows
                return rows
            except Exception as exc:
                logger.error("Failed to parse CSV artifact '%s': %s", logical_name, exc)
                raise HTTPException(
                    status_code=503,
                    detail=f"Experimental artifact '{logical_name}' could not be parsed.",
                ) from exc

    def clear_cache(self) -> None:
        """Clear the in-memory artifact cache (e.g. for testing)."""
        with self._lock:
            self._cache.clear()

    # -------------------------------------------------------------------------
    # TASK 2: Model Information & Provenance
    # -------------------------------------------------------------------------
    def get_model_info(self) -> ModelInfoResponse:
        """Return the authoritative model hyperparameters and provenance from FINAL_MODEL_CONFIG.json."""
        config = self._load_json("FINAL_MODEL_CONFIG.json", "FINAL_MODEL_CONFIG")
        hp = config.get("selected_hyperparameters", {})
        feat_rep = config.get("feature_representation", {})

        from app.services.inference_service import get_inference_service

        inference_service = get_inference_service()
        model_loaded = inference_service.is_loaded()
        model_artifact_available = settings.frozen_model_path.is_file()

        class_labels = config.get("classes", ["N", "S", "V", "F"])
        model_type = config.get("model_family", "RandomForestClassifier")
        n_features = feat_rep.get("total_dimension", 209)

        return ModelInfoResponse(
            model_type=model_type,
            n_estimators=hp.get("n_estimators", 200),
            max_depth=hp.get("max_depth", 30),
            min_samples_split=hp.get("min_samples_split", 5),
            min_samples_leaf=hp.get("min_samples_leaf", 2),
            max_features=hp.get("max_features", "sqrt"),
            class_weight=hp.get("class_weight", "balanced"),
            random_state=hp.get("random_seed", 42) or hp.get("random_state", 42),
            n_jobs=hp.get("n_jobs", -1),
            feature_dimension=n_features,
            morphology_dimension=feat_rep.get("morphology_samples", 200),
            rr_dimension=feat_rep.get("rr_features_count", 9),
            class_labels=class_labels,
            model_loaded=model_loaded,
            model_artifact_available=model_artifact_available,
            standard_reference=config.get("standard_reference", "ANSI/AAMI EC57:1998"),
            status=config.get("status", "LOCKED_FOR_EVALUATION"),
            frozen_at_utc=config.get("frozen_at_utc"),
            feature_description=feat_rep,
            training_partitions=config.get("dataset_partitions"),
            validation_results_summary=config.get("phase7_ds1_validation_results"),
            # Backward compatibility aliases
            model_name=model_type,
            classes=class_labels,
            n_features=n_features,
        )

    # -------------------------------------------------------------------------
    # TASK 3 & 4: Experimental Benchmark & Confusion Matrix
    # -------------------------------------------------------------------------
    def get_benchmark(self) -> BenchmarkResponse:
        """Return the locked Phase 8 DS2 held-out benchmark and multi-view confusion matrix."""
        test_results = self._load_json("DS2_TEST_RESULTS.json", "DS2_TEST_RESULTS")

        raw_cm = test_results.get("confusion_matrix", [])
        class_order = ["N", "S", "V", "F"]
        n_classes = len(raw_cm)

        # Compute row-normalized (recall / true class percentages)
        row_normalized: list[list[float]] = []
        for row in raw_cm:
            row_sum = sum(row)
            if row_sum > 0:
                row_normalized.append([round(val / row_sum, 4) for val in row])
            else:
                row_normalized.append([0.0] * n_classes)

        # Compute column-normalized (precision / predicted class percentages)
        col_sums = [sum(raw_cm[r][c] for r in range(n_classes)) for c in range(n_classes)]
        column_normalized: list[list[float]] = []
        for row in raw_cm:
            norm_row: list[float] = []
            for c_idx, val in enumerate(row):
                if col_sums[c_idx] > 0:
                    norm_row.append(round(val / col_sums[c_idx], 4))
                else:
                    norm_row.append(0.0)
            column_normalized.append(norm_row)

        cm_response = ConfusionMatrixResponse(
            class_order=class_order,
            raw=raw_cm,
            row_normalized=row_normalized,
            column_normalized=column_normalized,
            total_beats=test_results.get("evaluated_beats_count", 49639),
            notes="Explicit ANSI/AAMI class order [N, S, V, F]. Rows represent true classes; columns represent predicted classes.",
        )

        overall_metrics = OverallBenchmarkMetrics(
            accuracy=test_results["accuracy"],
            balanced_accuracy=test_results["balanced_accuracy"],
            macro_precision=test_results["macro_precision"],
            macro_recall=test_results["macro_recall"],
            macro_f1=test_results["macro_f1"],
            weighted_f1=test_results["weighted_f1"],
            roc_auc=test_results["roc_auc_ovr_macro"],
            pr_auc=test_results["pr_auc_ovr_macro"],
            evaluated_beats=test_results["evaluated_beats_count"],
        )

        per_class_raw = test_results.get("per_class", {})
        per_class: dict[str, ClassMetricItem] = {}
        for cls_name, cls_metrics in per_class_raw.items():
            per_class[cls_name] = ClassMetricItem(
                precision=cls_metrics["precision"],
                recall=cls_metrics["recall"],
                f1_score=cls_metrics["f1_score"],
                support=cls_metrics["support"],
            )

        return BenchmarkResponse(
            model_name=test_results.get("model_name", "RandomForestClassifier"),
            phase=test_results.get("phase", 8),
            evaluation_partition=test_results.get("evaluation_partition", "DS2 (22 Held-Out Test Records)"),
            evaluated_beats_count=test_results.get("evaluated_beats_count", 49639),
            metrics=overall_metrics,
            confusion_matrix=cm_response,
            per_class=per_class,
            class_supports=test_results.get("class_supports", {}),
            notes="Held-out DS2 test evaluation on 22 inter-patient records according to ANSI/AAMI EC57:1998 partitioning.",
        )

    # -------------------------------------------------------------------------
    # TASK 5: DS1 vs DS2 Generalization
    # -------------------------------------------------------------------------
    def get_generalization(self) -> GeneralizationResponse:
        """Return DS1 validation vs DS2 held-out generalization comparison from locked tables."""
        csv_rows = self._load_csv("tables/DS1_DS2_COMPARISON.csv", "DS1_DS2_COMPARISON")

        # Map rows
        metrics_by_name: dict[str, dict[str, Any]] = {}
        comparison_table: list[GeneralizationComparisonRow] = []

        for row in csv_rows:
            metric_name = row["metric"]
            ds1_val = float(row["ds1_validation"])
            ds2_val = float(row["ds2_test"])
            diff = float(row["absolute_difference"])
            rel_change = row["relative_change_pct"]

            metrics_by_name[metric_name] = {
                "ds1": ds1_val,
                "ds2": ds2_val,
                "diff": diff,
                "rel": rel_change,
            }
            comparison_table.append(
                GeneralizationComparisonRow(
                    metric=metric_name,
                    ds1_validation=ds1_val,
                    ds2_test=ds2_val,
                    absolute_difference=diff,
                    relative_change_pct=rel_change,
                )
            )

        ds1_metrics = GeneralizationMetrics(
            accuracy=metrics_by_name.get("Accuracy", {}).get("ds1", 0.9668),
            balanced_accuracy=metrics_by_name.get("Balanced Accuracy", {}).get("ds1", 0.7079),
            macro_precision=metrics_by_name.get("Macro Precision", {}).get("ds1", 0.7166),
            macro_recall=metrics_by_name.get("Macro Recall", {}).get("ds1", 0.7079),
            macro_f1=metrics_by_name.get("Macro F1", {}).get("ds1", 0.7095),
            weighted_f1=metrics_by_name.get("Weighted F1", {}).get("ds1", 0.9664),
            roc_auc=metrics_by_name.get("Macro ROC-AUC", {}).get("ds1", 0.9782),
            pr_auc=metrics_by_name.get("Macro PR-AUC", {}).get("ds1", 0.7321),
        )

        ds2_metrics = GeneralizationMetrics(
            accuracy=metrics_by_name.get("Accuracy", {}).get("ds2", 0.9093),
            balanced_accuracy=metrics_by_name.get("Balanced Accuracy", {}).get("ds2", 0.7000),
            macro_precision=metrics_by_name.get("Macro Precision", {}).get("ds2", 0.6348),
            macro_recall=metrics_by_name.get("Macro Recall", {}).get("ds2", 0.7000),
            macro_f1=metrics_by_name.get("Macro F1", {}).get("ds2", 0.6403),
            weighted_f1=metrics_by_name.get("Weighted F1", {}).get("ds2", 0.9174),
            roc_auc=metrics_by_name.get("Macro ROC-AUC", {}).get("ds2", 0.9425),
            pr_auc=metrics_by_name.get("Macro PR-AUC", {}).get("ds2", 0.6280),
        )

        differences = {
            "accuracy": metrics_by_name.get("Accuracy", {}).get("diff", -0.0575),
            "balanced_accuracy": metrics_by_name.get("Balanced Accuracy", {}).get("diff", -0.0079),
            "macro_precision": metrics_by_name.get("Macro Precision", {}).get("diff", -0.0818),
            "macro_recall": metrics_by_name.get("Macro Recall", {}).get("diff", -0.0079),
            "macro_f1": metrics_by_name.get("Macro F1", {}).get("diff", -0.0692),
            "weighted_f1": metrics_by_name.get("Weighted F1", {}).get("diff", -0.0490),
            "roc_auc": metrics_by_name.get("Macro ROC-AUC", {}).get("diff", -0.0357),
            "pr_auc": metrics_by_name.get("Macro PR-AUC", {}).get("diff", -0.1041),
        }

        relative_change_pct = {
            "accuracy": metrics_by_name.get("Accuracy", {}).get("rel", "-5.95%"),
            "balanced_accuracy": metrics_by_name.get("Balanced Accuracy", {}).get("rel", "-1.12%"),
            "macro_precision": metrics_by_name.get("Macro Precision", {}).get("rel", "-11.42%"),
            "macro_recall": metrics_by_name.get("Macro Recall", {}).get("rel", "-1.12%"),
            "macro_f1": metrics_by_name.get("Macro F1", {}).get("rel", "-9.75%"),
            "weighted_f1": metrics_by_name.get("Weighted F1", {}).get("rel", "-5.07%"),
            "roc_auc": metrics_by_name.get("Macro ROC-AUC", {}).get("rel", "-3.65%"),
            "pr_auc": metrics_by_name.get("Macro PR-AUC", {}).get("rel", "-14.22%"),
        }

        return GeneralizationResponse(
            evaluation_type="held-out inter-record generalization within the MIT-BIH dataset",
            ds1_validation=ds1_metrics,
            ds2_test=ds2_metrics,
            differences=differences,
            relative_change_pct=relative_change_pct,
            comparison_table=comparison_table,
            notes=(
                "Evaluation reflects held-out inter-record generalization within the MIT-BIH dataset. "
                "Performance differences reflect inter-patient morphological and rhythm heterogeneity, "
                "not statistically tested significance or external clinical generalization."
            ),
        )

    # -------------------------------------------------------------------------
    # TASK 6: Feature Importance
    # -------------------------------------------------------------------------
    def get_feature_importance(self) -> FeatureImportanceResponse:
        """Return model-level Random Forest Gini feature importances from locked artifacts."""
        csv_rows = self._load_csv("tables/FEATURE_IMPORTANCE_TABLE.csv", "FEATURE_IMPORTANCE_TABLE")
        test_results = self._load_json("DS2_TEST_RESULTS.json", "DS2_TEST_RESULTS")

        top_features: list[FeatureImportanceItem] = []
        for row in csv_rows:
            top_features.append(
                FeatureImportanceItem(
                    rank=int(row["rank"]),
                    feature_name=row["feature_name"],
                    feature_type=row["feature_type"],
                    gini_importance=float(row["gini_importance"]),
                    description=row.get("description"),
                )
            )

        temporal_total = test_results.get("temporal_features_total_importance", 0.2638)
        temporal_names = [
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

        return FeatureImportanceResponse(
            model_family="RandomForestClassifier",
            importance_metric="Gini impurity / Mean Decrease in Impurity (MDI)",
            top_features=top_features,
            temporal_features_total_importance=temporal_total,
            temporal_feature_names=temporal_names,
            notes=(
                "Random Forest feature importance reflects Gini impurity reduction across 200 trees. "
                "This indicates model-level feature utilization, not physiological proof, causal mechanism, "
                "or clinical diagnostic sufficiency."
            ),
        )

    # -------------------------------------------------------------------------
    # TASK 7: Record Breakdown
    # -------------------------------------------------------------------------
    def get_record_breakdown(
        self,
        sort_by: Optional[str] = None,
        sort_order: Optional[str] = "asc",
        limit: Optional[int] = None,
    ) -> RecordBreakdownResponse:
        """Return DS2 per-record evaluation breakdown with optional sorting and limiting."""
        csv_rows = self._load_csv("DS2_RECORD_RESULTS.csv", "DS2_RECORD_RESULTS")

        records: list[RecordBreakdownItem] = []
        for r in csv_rows:
            def _parse_float(val: str) -> Optional[float]:
                val = val.strip() if val else ""
                return float(val) if val else None

            def _parse_int(val: str) -> int:
                val = val.strip() if val else ""
                return int(val) if val else 0

            records.append(
                RecordBreakdownItem(
                    record_id=r["record_id"],
                    evaluated_beats=_parse_int(r["evaluated_beats"]),
                    accuracy=float(r["accuracy"]),
                    n_recall=_parse_float(r.get("N_recall", "")),
                    n_support=_parse_int(r.get("N_support", "0")),
                    s_recall=_parse_float(r.get("S_recall", "")),
                    s_support=_parse_int(r.get("S_support", "0")),
                    v_recall=_parse_float(r.get("V_recall", "")),
                    v_support=_parse_int(r.get("V_support", "0")),
                    f_recall=_parse_float(r.get("F_recall", "")),
                    f_support=_parse_int(r.get("F_support", "0")),
                )
            )

        if sort_by:
            valid_fields = {
                "record_id",
                "evaluated_beats",
                "accuracy",
                "n_recall",
                "n_support",
                "s_recall",
                "s_support",
                "v_recall",
                "v_support",
                "f_recall",
                "f_support",
            }
            if sort_by not in valid_fields:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid sort field '{sort_by}'. Allowed fields: {sorted(list(valid_fields))}",
                )

            reverse = (sort_order or "asc").lower() == "desc"

            def sort_key(item: RecordBreakdownItem):
                val = getattr(item, sort_by)
                if val is None:
                    # Place None values at the end regardless of asc/desc
                    return -1e9 if reverse else 1e9
                return val

            records.sort(key=sort_key, reverse=reverse)

        if limit is not None and limit > 0:
            records = records[:limit]

        return RecordBreakdownResponse(
            total_records=len(records),
            partition="DS2 (22 Held-Out Inter-Patient Test Records)",
            records=records,
        )

    # -------------------------------------------------------------------------
    # TASK 8: Dataset Class Distribution
    # -------------------------------------------------------------------------
    def get_dataset_distribution(self) -> DatasetDistributionResponse:
        """Return dataset cohort distribution from locked DATASET_CLASS_DISTRIBUTION.csv."""
        csv_rows = self._load_csv("tables/DATASET_CLASS_DISTRIBUTION.csv", "DATASET_CLASS_DISTRIBUTION")

        cohorts: list[CohortDistributionItem] = []
        for r in csv_rows:
            cohorts.append(
                CohortDistributionItem(
                    partition=r["partition"],
                    record_count=int(r["record_count"]),
                    usable_beats=int(r["usable_beats"]),
                    n_count=int(r["N_count"]),
                    n_pct=r["N_pct"],
                    s_count=int(r["S_count"]),
                    s_pct=r["S_pct"],
                    v_count=int(r["V_count"]),
                    v_pct=r["V_pct"],
                    f_count=int(r["F_count"]),
                    f_pct=r["F_pct"],
                    isolated_q=int(r["isolated_Q"]),
                )
            )

        return DatasetDistributionResponse(
            cohorts=cohorts,
            notes=(
                "Inter-patient dataset partition following ANSI/AAMI EC57:1998 standard division: "
                "DS1 partitioned into 16 training and 6 validation records; DS2 comprises 22 held-out test records; "
                "4 pacemaker records isolated."
            ),
        )

    # -------------------------------------------------------------------------
    # TASK 9: Artifact Metadata
    # -------------------------------------------------------------------------
    def get_artifacts_metadata(self) -> ExperimentArtifactsResponse:
        """Return safe logical metadata regarding available experimental artifacts."""
        artifacts_to_check = [
            ("FINAL_MODEL_CONFIG", "FINAL_MODEL_CONFIG.json", "json", "Frozen model hyperparameters and partition specifications"),
            ("DS2_TEST_RESULTS", "DS2_TEST_RESULTS.json", "json", "DS2 held-out test metrics and raw confusion matrix"),
            ("DS2_RECORD_RESULTS", "DS2_RECORD_RESULTS.csv", "csv", "DS2 record-level performance and per-class supports"),
            ("FEATURE_IMPORTANCE_TABLE", "tables/FEATURE_IMPORTANCE_TABLE.csv", "csv", "Top-15 Gini feature importances and descriptions"),
            ("DS1_DS2_COMPARISON", "tables/DS1_DS2_COMPARISON.csv", "csv", "DS1 validation vs DS2 held-out generalization delta table"),
            ("DATASET_CLASS_DISTRIBUTION", "tables/DATASET_CLASS_DISTRIBUTION.csv", "csv", "ANSI/AAMI partition beat and class distributions"),
            ("CLASSWISE_DS2_RESULTS", "tables/CLASSWISE_DS2_RESULTS.csv", "csv", "Per-class Precision, Recall, and F1 table"),
            ("FINAL_PERFORMANCE_TABLE", "tables/FINAL_PERFORMANCE_TABLE.csv", "csv", "Cross-phase benchmark performance summary"),
        ]

        details: list[ArtifactDetail] = []
        status_map: dict[str, bool] = {}

        for name, rel_path, fmt, desc in artifacts_to_check:
            is_avail = self._get_path(rel_path).is_file()
            status_map[name] = is_avail
            details.append(
                ArtifactDetail(
                    name=name,
                    logical_path=f"ml_results/{rel_path}",
                    available=is_avail,
                    format=fmt,
                    description=desc,
                )
            )

        return ExperimentArtifactsResponse(
            benchmark=status_map.get("DS2_TEST_RESULTS", False),
            model_config=status_map.get("FINAL_MODEL_CONFIG", False),
            confusion_matrix=status_map.get("DS2_TEST_RESULTS", False),
            generalization=status_map.get("DS1_DS2_COMPARISON", False),
            feature_importance=status_map.get("FEATURE_IMPORTANCE_TABLE", False),
            record_breakdown=status_map.get("DS2_RECORD_RESULTS", False),
            dataset_distribution=status_map.get("DATASET_CLASS_DISTRIBUTION", False),
            artifacts=details,
        )


_experiment_service: Optional[ExperimentService] = None
_service_lock = Lock()


def get_experiment_service() -> ExperimentService:
    """Return the thread-safe singleton instance of ExperimentService."""
    global _experiment_service
    if _experiment_service is None:
        with _service_lock:
            if _experiment_service is None:
                _experiment_service = ExperimentService()
    return _experiment_service
