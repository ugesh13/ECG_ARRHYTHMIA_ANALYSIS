"""ML preprocessing, beat extraction, and dataset construction package."""
from app.ml.label_mapping import (
    AAMI_CLASSES,
    AAMI_CLASS_DESCRIPTIONS,
    ANNOTATION_REGISTRY,
    get_aami_class,
    get_annotation_def,
    is_heartbeat,
    is_included_beat,
)
from app.ml.preprocessing import (
    normalize_beat_window,
    remove_baseline_wander,
    select_lead_channel,
)
from app.ml.class_weights import compute_balanced_class_weights, get_sample_weights
from app.ml.data_loader import BeatBatch, ECGDatasetLoader
from app.ml.schemas import BeatMetadata, ExclusionStats, WindowConfig
from app.ml.splitter import (
    AAMI_DS1_RECORDS,
    AAMI_DS2_RECORDS,
    AAMI_PACED_RECORDS,
    ALL_48_MITBIH_RECORDS,
    SplitManifest,
    create_record_split,
    load_split_manifest,
    save_split_manifest,
    validate_record_split,
)

from app.ml.models import (
    AAMI_4_CLASSES,
    create_hist_gradient_boosting,
    create_logistic_regression,
    create_random_forest,
    get_baseline_model,
    get_baseline_model_names,
)
from app.ml.evaluator import (
    ModelEvaluationReport,
    PerClassMetrics,
    evaluate_predictions,
    generate_confusion_matrix_svg,
)
from app.ml.trainer import (
    filter_to_4_classes,
    prepare_baseline_datasets,
    run_phase5_baseline_experiment,
    train_and_evaluate_model,
)

from app.ml.rr_features import (
    BIDIRECTIONAL_FEATURE_NAMES,
    CAUSAL_FEATURE_NAMES,
    BeatTimingMetadata,
    RRAuditStatistics,
    RRFeatureExtractor,
    prepare_phase6_datasets,
)
from app.ml.phase6_trainer import run_phase6_pipeline
from app.ml.hyperparameter_tuning import (
    CVSearchCandidateResult,
    get_record_grouped_cv_splits,
    tune_hist_gradient_boosting,
    tune_logistic_regression,
    tune_random_forest,
)
from app.ml.phase7_trainer import (
    fit_and_eval_tuned_model,
    generate_phase7_comparison_markdown,
    generate_phase7_master_report,
    generate_phase7_tuning_results_markdown,
    run_phase7_pipeline,
)
from app.ml.phase8_evaluator import (
    execute_phase8_final_evaluation,
    prepare_phase8_test_datasets,
)

__all__ = [
    "AAMI_4_CLASSES",
    "AAMI_CLASSES",
    "AAMI_CLASS_DESCRIPTIONS",
    "AAMI_DS1_RECORDS",
    "AAMI_DS2_RECORDS",
    "AAMI_PACED_RECORDS",
    "ALL_48_MITBIH_RECORDS",
    "ANNOTATION_REGISTRY",
    "BIDIRECTIONAL_FEATURE_NAMES",
    "BeatBatch",
    "BeatMetadata",
    "BeatTimingMetadata",
    "CAUSAL_FEATURE_NAMES",
    "CVSearchCandidateResult",
    "ECGDatasetLoader",
    "ExclusionStats",
    "ModelEvaluationReport",
    "PerClassMetrics",
    "RRAuditStatistics",
    "RRFeatureExtractor",
    "SplitManifest",
    "WindowConfig",
    "compute_balanced_class_weights",
    "create_hist_gradient_boosting",
    "create_logistic_regression",
    "create_random_forest",
    "create_record_split",
    "evaluate_predictions",
    "execute_phase8_final_evaluation",
    "filter_to_4_classes",
    "fit_and_eval_tuned_model",
    "generate_confusion_matrix_svg",
    "generate_phase7_comparison_markdown",
    "generate_phase7_master_report",
    "generate_phase7_tuning_results_markdown",
    "get_aami_class",
    "get_annotation_def",
    "get_baseline_model",
    "get_baseline_model_names",
    "get_record_grouped_cv_splits",
    "get_sample_weights",
    "is_heartbeat",
    "is_included_beat",
    "load_split_manifest",
    "normalize_beat_window",
    "prepare_baseline_datasets",
    "prepare_phase6_datasets",
    "prepare_phase8_test_datasets",
    "remove_baseline_wander",
    "run_phase5_baseline_experiment",
    "run_phase6_pipeline",
    "run_phase7_pipeline",
    "save_split_manifest",
    "select_lead_channel",
    "train_and_evaluate_model",
    "tune_hist_gradient_boosting",
    "tune_logistic_regression",
    "tune_random_forest",
    "validate_record_split",
]





