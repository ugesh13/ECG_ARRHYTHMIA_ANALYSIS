from fastapi import APIRouter

from app.core.config import settings
from app.models.schemas import HealthResponse

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthResponse)
def health():
    from app.services.inference_service import get_inference_service
    service = get_inference_service()
    return {
        "status": "healthy",
        "service": settings.app_name,
        "model_loaded": service.is_loaded(),
    }
