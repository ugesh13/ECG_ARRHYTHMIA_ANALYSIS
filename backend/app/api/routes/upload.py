from typing import List

from fastapi import APIRouter, File, UploadFile

from app.core.errors import AppError, UploadValidationError
from app.models.schemas import UploadResponse
from app.services import ecg_service, file_service

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("", response_model=UploadResponse)
async def upload(files: List[UploadFile] = File(...)):
    """Upload one WFDB record: .hea + .dat (+ optional .atr), all with the same base name."""
    record_id, names = await file_service.save_upload(files)
    try:  # reject files that WFDB cannot parse
        ecg_service.get_record_metadata(record_id)
    except AppError:
        file_service.delete_upload(record_id)
        raise UploadValidationError("The files are not a readable WFDB record.")
    file_service.add_history_entry(record_id, "upload", names)
    return {"record_id": record_id, "files": names, "message": "Upload successful."}
