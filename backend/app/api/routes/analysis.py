"""API routes for full-record arrhythmia analysis, pagination, and beat inspection."""
from typing import Optional

from fastapi import APIRouter, Query

from app.models.schemas import (
    BeatDetailResponse,
    PaginatedBeatsResponse,
    RecordAnalysisResponse,
    RecordAnalysisSummaryResponse,
)
from app.services import analysis_service

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post(
    "/{record_id}",
    response_model=RecordAnalysisResponse,
    summary="Execute Arrhythmia Analysis",
    description=(
        "Performs complete automated ECG heartbeat segmentation, 209-D feature extraction "
        "(200 morphology + 9 bidirectional RR timing features), and inference using the frozen "
        "Phase 8 Random Forest classifier. Returns per-beat classifications, class probabilities "
        "[P(N), P(S), P(V), P(F)], confidence metrics, and aggregate category totals."
    ),
)
def analyze(
    record_id: str,
    force_refresh: bool = Query(False, description="Bypass in-memory cache and recompute analysis"),
):
    return analysis_service.analyze_record(record_id, force_refresh=force_refresh)


@router.get(
    "/{record_id}/summary",
    response_model=RecordAnalysisSummaryResponse,
    summary="Get Record Analysis Summary",
    description=(
        "Retrieves a cached lightweight summary of record arrhythmia analysis without "
        "downloading the complete beat array. If the record has not been analyzed yet, "
        "returns status 'not_analyzed'."
    ),
)
def get_summary(record_id: str):
    return analysis_service.get_record_summary(record_id)


@router.get(
    "/{record_id}/beats",
    response_model=PaginatedBeatsResponse,
    summary="Get Paginated Beat Predictions",
    description=(
        "Returns paginated heartbeats with predicted classes, probabilities, ground-truth "
        "labels, and edge-beat status. Supports filtering by class, prediction, or ground truth."
    ),
)
def get_beats(
    record_id: str,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page (max 500)"),
    class_filter: Optional[str] = Query(None, description="Filter by class (matches predicted or ground truth)"),
    prediction_filter: Optional[str] = Query(None, description="Filter strictly by predicted class (N, S, V, F)"),
    ground_truth_filter: Optional[str] = Query(None, description="Filter strictly by ground-truth class or symbol"),
):
    return analysis_service.get_paginated_beats(
        record_id=record_id,
        page=page,
        page_size=page_size,
        class_filter=class_filter,
        prediction_filter=prediction_filter,
        ground_truth_filter=ground_truth_filter,
    )


@router.get(
    "/{record_id}/beats/{beat_idx}",
    response_model=BeatDetailResponse,
    summary="Get Single Beat Detail",
    description=(
        "Returns detailed information for a single beat, including the 200-sample normalized "
        "morphology waveform (-90 to +109 offsets) and the 9 bidirectional RR features."
    ),
)
def get_beat(record_id: str, beat_idx: int):
    return analysis_service.get_beat_detail(record_id, beat_idx)
