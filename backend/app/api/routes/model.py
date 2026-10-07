"""Model provenance and architecture endpoints."""

from fastapi import APIRouter

from app.models.schemas import ModelInfoResponse
from app.services.experiment_service import get_experiment_service

router = APIRouter(prefix="/model", tags=["model"])


@router.get("/info", response_model=ModelInfoResponse)
def get_model_info() -> ModelInfoResponse:
    """Return frozen model architecture, hyperparameters, and provenance metadata."""
    service = get_experiment_service()
    return service.get_model_info()
