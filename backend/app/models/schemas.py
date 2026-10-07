"""Pydantic response schemas."""
from typing import Optional

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    model_loaded: bool = False


class ModelInfoResponse(BaseModel):
    model_name: str
    classes: list[str]
    n_features: int
    n_estimators: int
    max_depth: Optional[int]
    status: str


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
    ground_truth_class: Optional[str] = None
    predicted_class: str
    confidence: float
    probabilities: ClassProbabilities
    is_valid: bool
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
    total_detected_beats: int
    total_classified_beats: int
    total_edge_beats: int
    aggregate_counts: AggregateCounts
    percentages: AggregatePercentages
    beats: list[BeatAnalysisItem]
    model_name: str = "RandomForestClassifier"
    model_version: str = "1.0 (Frozen Phase 8)"
    disclaimer: str = "Research prototype for educational/academic evaluation only. Not a clinical diagnostic device."


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
