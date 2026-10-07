"""Input validation helpers (record ids, filenames, extensions)."""
import re
from pathlib import Path

from app.core.config import settings
from app.core.errors import InvalidRecordIdError, UploadValidationError

RECORD_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def validate_record_id(record_id: str) -> str:
    """Reject anything that could escape the data directories (e.g. '../x')."""
    if not RECORD_ID_RE.fullmatch(record_id or ""):
        raise InvalidRecordIdError("Record id may only contain letters, digits, '_' and '-'.")
    return record_id


def sanitize_filename(filename: str) -> str:
    name = Path(filename or "").name  # strip any directory components
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name).lstrip(".")
    if not name or len(name) > 100:
        raise UploadValidationError("Invalid or too long filename.")
    return name


def validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in settings.allowed_extensions:
        raise UploadValidationError(
            f"Unsupported file type '{ext or 'none'}'. Allowed: {', '.join(settings.allowed_extensions)}."
        )
    return ext
