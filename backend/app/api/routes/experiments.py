"""Endpoints for retrieving locked experimental results, benchmark performance, and model analysis."""

from typing import Optional

from fastapi import APIRouter, Query

from app.models.schemas import (
    BenchmarkResponse,
    DatasetDistributionResponse,
    ExperimentArtifactsResponse,
    FeatureImportanceResponse,
    GeneralizationResponse,
    RecordBreakdownResponse,
)
from app.services.experiment_service import get_experiment_service

router = APIRouter(prefix="/experiments", tags=["experiments"])


@router.get("/benchmark", response_model=BenchmarkResponse)
def get_benchmark() -> BenchmarkResponse:
    """Return locked Phase 8 DS2 held-out test benchmark metrics and 4x4 confusion matrix."""
    service = get_experiment_service()
    return service.get_benchmark()


@router.get("/generalization", response_model=GeneralizationResponse)
def get_generalization() -> GeneralizationResponse:
    """Return DS1 validation vs DS2 test generalization comparison and inter-record performance differences."""
    service = get_experiment_service()
    return service.get_generalization()


@router.get("/feature-importance", response_model=FeatureImportanceResponse)
def get_feature_importance() -> FeatureImportanceResponse:
    """Return locked Random Forest model-level Gini feature importances and temporal feature breakdown."""
    service = get_experiment_service()
    return service.get_feature_importance()


@router.get("/record-breakdown", response_model=RecordBreakdownResponse)
def get_record_breakdown(
    sort_by: Optional[str] = Query(None, description="Field to sort by (e.g. accuracy, evaluated_beats, record_id)"),
    sort_order: Optional[str] = Query("asc", description="Sort direction ('asc' or 'desc')"),
    limit: Optional[int] = Query(None, ge=1, description="Maximum number of records to return"),
) -> RecordBreakdownResponse:
    """Return DS2 held-out evaluation breakdown across individual patient records."""
    service = get_experiment_service()
    return service.get_record_breakdown(sort_by=sort_by, sort_order=sort_order, limit=limit)


@router.get("/dataset-distribution", response_model=DatasetDistributionResponse)
def get_dataset_distribution() -> DatasetDistributionResponse:
    """Return ANSI/AAMI cohort beat counts and class distributions across DS1, DS2, and paced records."""
    service = get_experiment_service()
    return service.get_dataset_distribution()


@router.get("/artifacts", response_model=ExperimentArtifactsResponse)
def get_artifacts() -> ExperimentArtifactsResponse:
    """Return safe logical metadata regarding availability of locked experimental artifact files."""
    service = get_experiment_service()
    return service.get_artifacts_metadata()
