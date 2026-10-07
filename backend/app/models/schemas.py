"""Pydantic response schemas."""
from typing import Optional
from pydantic import BaseModel, Field
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    model_loaded: bool = False


class ModelInfoResponse(BaseModel):
    model_type: str = "RandomForestClassifier"
    n_estimators: int = 200
    max_depth: Optional[int] = 30
    min_samples_split: int = 5
    min_samples_leaf: int = 2
    max_features: str = "sqrt"
    class_weight: str = "balanced"
    random_state: int = 42
    n_jobs: int = -1
    feature_dimension: int = 209
    morphology_dimension: int = 200
    rr_dimension: int = 9
    class_labels: list[str] = ["N", "S", "V", "F"]
    model_loaded: bool = False
    model_artifact_available: bool = False
    standard_reference: str = "ANSI/AAMI EC57:1998"
    status: str = "LOCKED_FOR_EVALUATION"
    frozen_at_utc: Optional[str] = None
    feature_description: Optional[dict] = None
    training_partitions: Optional[dict] = None
    validation_results_summary: Optional[dict] = None
    # Backward compatibility aliases
    model_name: Optional[str] = None
    classes: Optional[list[str]] = None
    n_features: Optional[int] = None


class ConfusionMatrixResponse(BaseModel):
    class_order: list[str]
    raw: list[list[int]]
    row_normalized: list[list[float]]
    column_normalized: list[list[float]]
    total_beats: int
    notes: Optional[str] = None


class ClassMetricItem(BaseModel):
    precision: float
    recall: float
    f1_score: float
    support: int


class OverallBenchmarkMetrics(BaseModel):
    accuracy: float
    balanced_accuracy: float
    macro_precision: float
    macro_recall: float
    macro_f1: float
    weighted_f1: float
    roc_auc: float
    pr_auc: float
    evaluated_beats: int


class BenchmarkResponse(BaseModel):
    model_name: str
    phase: int
    evaluation_partition: str
    evaluated_beats_count: int
    metrics: OverallBenchmarkMetrics
    confusion_matrix: ConfusionMatrixResponse
    per_class: dict[str, ClassMetricItem]
    class_supports: dict[str, int]
    notes: Optional[str] = None


class GeneralizationMetrics(BaseModel):
    accuracy: float
    balanced_accuracy: float
    macro_precision: Optional[float] = None
    macro_recall: Optional[float] = None
    macro_f1: float
    weighted_f1: float
    roc_auc: Optional[float] = None
    pr_auc: Optional[float] = None


class GeneralizationComparisonRow(BaseModel):
    metric: str
    ds1_validation: float
    ds2_test: float
    absolute_difference: float
    relative_change_pct: str


class GeneralizationResponse(BaseModel):
    evaluation_type: str
    ds1_validation: GeneralizationMetrics
    ds2_test: GeneralizationMetrics
    differences: dict[str, float]
    relative_change_pct: dict[str, str]
    comparison_table: list[GeneralizationComparisonRow]
    notes: str


class FeatureImportanceItem(BaseModel):
    rank: int
    feature_name: str
    feature_type: str
    gini_importance: float
    description: Optional[str] = None


class FeatureImportanceResponse(BaseModel):
    model_family: str
    importance_metric: str
    top_features: list[FeatureImportanceItem]
    temporal_features_total_importance: float
    temporal_feature_names: list[str]
    notes: str


class RecordBreakdownItem(BaseModel):
    record_id: str
    evaluated_beats: int
    accuracy: float
    n_recall: Optional[float] = None
    n_support: int
    s_recall: Optional[float] = None
    s_support: int
    v_recall: Optional[float] = None
    v_support: int
    f_recall: Optional[float] = None
    f_support: int


class RecordBreakdownResponse(BaseModel):
    total_records: int
    partition: str
    records: list[RecordBreakdownItem]


class CohortDistributionItem(BaseModel):
    partition: str
    record_count: int
    usable_beats: int
    n_count: int
    n_pct: str
    s_count: int
    s_pct: str
    v_count: int
    v_pct: str
    f_count: int
    f_pct: str
    isolated_q: int


class DatasetDistributionResponse(BaseModel):
    cohorts: list[CohortDistributionItem]
    notes: str


class ArtifactDetail(BaseModel):
    name: str
    logical_path: str
    available: bool
    format: str
    description: str


class ExperimentArtifactsResponse(BaseModel):
    benchmark: bool
    model_config_: bool = Field(alias="model_config")
    confusion_matrix: bool
    generalization: bool
    feature_importance: bool
    record_breakdown: bool
    dataset_distribution: bool
    artifacts: list[ArtifactDetail]


class RecordSummary(BaseModel):
    record_id: str
    source: str  # "mitbih" | "upload"
    has_annotations: bool


class RecordListResponse(BaseModel):
    count: int
    records: list[RecordSummary]


class RecordMetadata(BaseModel):
    record_id: str
    source: str
    sampling_frequency: float
    n_channels: int
    n_samples: int
    duration_seconds: float
    channel_names: list[str]
    units: list[str]
    signal_formats: list[str]
    adc_gain: list[Optional[float]]
    adc_baseline: list[Optional[int]]
    header_comments: list[str]
    has_annotations: bool


class ChannelData(BaseModel):
    name: str
    unit: str
    values: list[Optional[float]]


class SignalResponse(BaseModel):
    record_id: str
    sampling_frequency: float
    start_sample: int
    end_sample: int
    decimation_step: int
    n_points: int
    time: list[float]  # seconds
    samples: list[int]  # absolute sample indices
    channels: list[ChannelData]


class AnnotationItem(BaseModel):
    sample: int
    time: float
    symbol: str
    aux_note: str = ""


class AnnotationsResponse(BaseModel):
    record_id: str
    available: bool
    total: int
    offset: int
    limit: int
    symbol_counts: dict[str, int]
    symbol_descriptions: dict[str, str]
    annotations: list[AnnotationItem]


class UploadResponse(BaseModel):
    record_id: str
    files: list[str]
    message: str


class ClassProbabilities(BaseModel):
    N: float
    S: float
    V: float
    F: float


class BeatAnalysisItem(BaseModel):
    beat_index: int
    sample_index: int
    time_seconds: float
    symbol: Optional[str] = None
    ground_truth_symbol: Optional[str] = None
    ground_truth_class: Optional[str] = None
    predicted_class: Optional[str] = None
    confidence: float
    probabilities: ClassProbabilities
    is_edge_beat: bool = False
    status: Optional[str] = "classified"
    is_valid: bool = True
    exclusion_reason: Optional[str] = None


class AggregateCounts(BaseModel):
    normal_count: int
    supraventricular_count: int
    ventricular_count: int
    fusion_count: int
    unclassified_edge_count: int
    total_detected_beats: int
    total_classified_beats: int


class AggregatePercentages(BaseModel):
    normal_percentage: float
    supraventricular_percentage: float
    ventricular_percentage: float
    fusion_percentage: float
    unclassified_edge_percentage: float


class RecordAnalysisResponse(BaseModel):
    record_id: str
    status: str = "completed"
    message: str = "Arrhythmia analysis completed successfully."
    lead_name: str
    sampling_rate: float
    duration_seconds: float
    total_beats_detected: int
    valid_beats_analyzed: int
    edge_beats: int
    total_detected_beats: int
    total_classified_beats: int
    total_edge_beats: int
    class_counts: dict[str, int]
    class_percentages: dict[str, float]
    execution_time_ms: float = 0.0
    aggregate_counts: AggregateCounts
    percentages: AggregatePercentages
    beats: list[BeatAnalysisItem]
    model_name: str = "RandomForestClassifier"
    model_version: str = "1.0 (Frozen Phase 8)"
    disclaimer: str = "Research prototype for educational/academic evaluation only. Not a clinical diagnostic device."


class MorphologyData(BaseModel):
    samples: list[float]
    sample_offsets: list[int]


class BeatDetailResponse(BaseModel):
    record_id: str
    beat_index: int
    sample_index: int
    time_seconds: float
    ground_truth_symbol: Optional[str] = None
    ground_truth_class: Optional[str] = None
    predicted_class: Optional[str] = None
    confidence: float
    probabilities: ClassProbabilities
    is_edge_beat: bool
    status: Optional[str] = None
    is_valid: bool
    exclusion_reason: Optional[str] = None
    morphology: MorphologyData
    rr_features: dict[str, Optional[float]]


class PaginatedBeatsResponse(BaseModel):
    record_id: str
    page: int
    page_size: int
    total: int
    items: list[BeatAnalysisItem]


class RecordAnalysisSummaryResponse(BaseModel):
    record_id: str
    status: str  # "completed" | "not_analyzed"
    message: Optional[str] = None
    lead_name: Optional[str] = None
    sampling_rate: Optional[float] = None
    duration_seconds: Optional[float] = None
    total_beats_detected: Optional[int] = None
    valid_beats_analyzed: Optional[int] = None
    edge_beats: Optional[int] = None
    class_counts: Optional[dict[str, int]] = None
    class_percentages: Optional[dict[str, float]] = None
    execution_time_ms: Optional[float] = None
    model_name: Optional[str] = None
    model_version: Optional[str] = None


# Retain AnalysisResponse as an alias for backward compatibility
AnalysisResponse = RecordAnalysisResponse


class HistoryEntry(BaseModel):
    record_id: str
    source: str
    files: list[str] = []
    created_at: str
    analysis_status: str = "not_run"


class HistoryResponse(BaseModel):
    count: int
    entries: list[HistoryEntry]
