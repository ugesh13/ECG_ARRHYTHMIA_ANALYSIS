from typing import Optional

from fastapi import APIRouter, Query

from app.core.config import settings
from app.core.errors import InvalidRangeError
from app.models.schemas import (
    AnnotationsResponse, RecordAnalysisResponse, RecordListResponse, RecordMetadata, SignalResponse,
)
from app.services import ecg_service

router = APIRouter(prefix="/ecg", tags=["ecg"])


@router.get("/records", response_model=RecordListResponse)
def list_records():
    records = ecg_service.discover_records()
    return {"count": len(records), "records": records}


@router.get("/{record_id}/metadata", response_model=RecordMetadata)
def metadata(record_id: str):
    return ecg_service.get_record_metadata(record_id)


@router.get("/{record_id}/signal", response_model=SignalResponse)
def signal(
    record_id: str,
    start_s: float = Query(0, ge=0),
    end_s: Optional[float] = Query(None, gt=0),
    max_points: int = Query(settings.max_signal_points, ge=10, le=50000),
    channels: Optional[str] = Query(None, description="Comma-separated channel indices, e.g. 0,1"),
):
    # TODO: pagination / streaming for very long ranges
    try:
        ch = [int(c) for c in channels.split(",")] if channels else None
    except ValueError:
        raise InvalidRangeError("Channels must be comma-separated integers.")
    return ecg_service.get_signal(record_id, start_s, end_s, max_points, ch)


@router.get("/{record_id}/annotations", response_model=AnnotationsResponse)
def annotations(
    record_id: str,
    start_s: float = Query(0, ge=0),
    end_s: Optional[float] = Query(None, gt=0),
    limit: int = Query(1000, ge=1, le=20000),
    offset: int = Query(0, ge=0),
):
    return ecg_service.get_annotations(record_id, start_s, end_s, limit, offset)


@router.post(
    "/{record_id}/analyze",
    response_model=RecordAnalysisResponse,
    summary="Execute Arrhythmia Analysis (RESTful alias)",
    description="Analyzes all beats in the specified record using the frozen Phase 8 Random Forest pipeline.",
)
def analyze_record_ecg(
    record_id: str,
    force_refresh: bool = Query(False, description="Bypass in-memory cache and recompute analysis"),
):
    from app.services import analysis_service
    return analysis_service.analyze_record(record_id, force_refresh=force_refresh)

