"""Upload storage and a simple JSON-file history. No database (by design, for now)."""
import json
import logging
import shutil
import threading
import uuid
from datetime import datetime, timezone

from fastapi import UploadFile

from app.core.config import settings
from app.core.errors import UploadTooLargeError, UploadValidationError
from app.utils.validators import sanitize_filename, validate_extension

logger = logging.getLogger(__name__)
_lock = threading.Lock()


# ------------------------------------------------------------------ uploads
async def save_upload(files: list[UploadFile]) -> tuple[str, list[str]]:
    """Validate and store a WFDB record (.hea + .dat, optional .atr). Returns (upload_id, names).

    Original (sanitised) names are kept because the .hea refers to its .dat by name.
    TODO: stronger content sniffing (header syntax, .dat length vs header).
    """
    if not files:
        raise UploadValidationError("No files were provided.")
    seen: dict[str, str] = {}
    for f in files:
        name = sanitize_filename(f.filename or "")
        ext = validate_extension(name)
        if ext in seen:
            raise UploadValidationError(f"Duplicate '{ext}' file.")
        seen[ext] = name
    if ".hea" not in seen or ".dat" not in seen:
        raise UploadValidationError("A WFDB record needs both a .hea and a .dat file.")
    stems = {n.rsplit(".", 1)[0] for n in seen.values()}
    if len(stems) != 1:
        raise UploadValidationError("All files must share the same record name (e.g. 100.hea, 100.dat).")

    upload_id = f"up_{uuid.uuid4().hex[:12]}"
    target = settings.uploads_dir / upload_id
    target.mkdir(parents=True, exist_ok=False)
    try:
        for f in files:
            name = sanitize_filename(f.filename or "")
            size = 0
            with open(target / name, "wb") as out:
                while chunk := await f.read(1024 * 1024):
                    size += len(chunk)
                    if size > settings.max_upload_bytes:
                        raise UploadTooLargeError(f"'{name}' exceeds the {settings.max_upload_mb} MB limit.")
                    out.write(chunk)
            if size == 0:
                raise UploadValidationError(f"'{name}' is empty.")
            if name.endswith(".hea"):
                try:
                    (target / name).read_text(encoding="ascii")
                except UnicodeDecodeError as exc:
                    raise UploadValidationError("The .hea file is not a valid text header.") from exc
    except Exception:
        delete_upload(upload_id)
        raise
    return upload_id, sorted(seen.values())


def delete_upload(upload_id: str) -> None:
    shutil.rmtree(settings.uploads_dir / upload_id, ignore_errors=True)


# ------------------------------------------------------------------ history
def _read_history() -> list[dict]:
    try:
        return json.loads(settings.history_file.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _write_history(entries: list[dict]) -> None:
    settings.history_file.parent.mkdir(parents=True, exist_ok=True)
    settings.history_file.write_text(json.dumps(entries, indent=2), encoding="utf-8")


def add_history_entry(record_id: str, source: str, files: list[str]) -> None:
    with _lock:
        entries = _read_history()
        entries.append({"record_id": record_id, "source": source, "files": files,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "analysis_status": "not_run"})
        _write_history(entries)


def update_analysis_status(record_id: str, source: str, status: str) -> None:
    """Record that analysis was requested; creates an entry for dataset records too."""
    with _lock:
        entries = _read_history()
        for e in entries:
            if e["record_id"] == record_id:
                e["analysis_status"] = status
                break
        else:
            entries.append({"record_id": record_id, "source": source, "files": [],
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "analysis_status": status})
        _write_history(entries)


def list_history() -> list[dict]:
    with _lock:
        return list(reversed(_read_history()))  # newest first
