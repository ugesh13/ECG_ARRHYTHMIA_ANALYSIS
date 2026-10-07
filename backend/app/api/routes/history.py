from fastapi import APIRouter

from app.models.schemas import HistoryResponse
from app.services import file_service

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=HistoryResponse)
def history():
    entries = file_service.list_history()
    return {"count": len(entries), "entries": entries}
