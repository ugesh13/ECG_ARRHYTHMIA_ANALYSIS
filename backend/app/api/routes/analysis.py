"""API route for full-record arrhythmia analysis."""
from fastapi import APIRouter, Query

from app.models.schemas import RecordAnalysisResponse
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
