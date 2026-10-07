"""WFDB-based ECG service.

Everything (channels, sampling rate, length, annotation symbols) is read from the
actual record. Nothing here is hard-coded to a specific MIT-BIH record.

Record layout: <dir>/<stem>.hea + <stem>.dat (required), <stem>.atr (optional).
.xws files (WAVE workspace) are ignored.
"""
import logging
import math
from collections import Counter
from pathlib import Path
from typing import Optional

import numpy as np
import wfdb
from wfdb.io.annotation import ann_label_table

from app.core.config import settings
from app.core.errors import (
    EmptySignalError, InvalidRangeError, RecordNotFoundError, RecordReadError,
)
from app.utils.validators import validate_record_id

logger = logging.getLogger(__name__)
ANNOTATION_EXT = "atr"  # TODO: support other annotators (e.g. 'qrs', 'ecg') via query param


# ---------------------------------------------------------------- discovery
def _has_pair(directory: Path, stem: str) -> bool:
    return (directory / f"{stem}.hea").is_file() and (directory / f"{stem}.dat").is_file()


def _upload_stem(upload_dir: Path) -> Optional[str]:
    for hea in sorted(upload_dir.glob("*.hea")):
        if _has_pair(upload_dir, hea.stem):
            return hea.stem
    return None


def discover_records(include_uploads: bool = True) -> list[dict]:
    """Find records by .hea + .dat pairs. Annotation file is detected if present."""
    found: list[dict] = []
    if settings.mitbih_dir.is_dir():
        for hea in sorted(settings.mitbih_dir.glob("*.hea")):
            if _has_pair(settings.mitbih_dir, hea.stem):
                found.append({
                    "record_id": hea.stem, "source": "mitbih",
                    "has_annotations": (settings.mitbih_dir / f"{hea.stem}.{ANNOTATION_EXT}").is_file(),
                })
    if include_uploads and settings.uploads_dir.is_dir():
        for d in sorted(p for p in settings.uploads_dir.iterdir() if p.is_dir()):
            stem = _upload_stem(d)
            if stem:
                found.append({
                    "record_id": d.name, "source": "upload",
                    "has_annotations": (d / f"{stem}.{ANNOTATION_EXT}").is_file(),
                })
    return found


def resolve_record(record_id: str) -> tuple[Path, str, str]:
    """Return (directory, file stem, source) for a record id or raise RecordNotFoundError."""
    validate_record_id(record_id)
    if _has_pair(settings.mitbih_dir, record_id):
        return settings.mitbih_dir, record_id, "mitbih"
    up = settings.uploads_dir / record_id
    if up.is_dir():
        stem = _upload_stem(up)
        if stem:
            return up, stem, "upload"
    raise RecordNotFoundError(f"Record '{record_id}' was not found.")


# ------------------------------------------------------------------ reading
def _header(record_id: str):
    directory, stem, source = resolve_record(record_id)
    try:
        return wfdb.rdheader(str(directory / stem)), directory, stem, source
    except Exception as exc:  # WFDB raises many exception types
        logger.warning("Header read failed for %s: %s", record_id, exc)
        raise RecordReadError("The record header could not be read.") from exc


def get_record_metadata(record_id: str) -> dict:
    h, directory, stem, source = _header(record_id)
    n_sig = int(h.n_sig or 0)
    fs = float(h.fs or 0)
    n_samples = int(h.sig_len or 0)
    return {
        "record_id": record_id,
        "source": source,
        "sampling_frequency": fs,
        "n_channels": n_sig,
        "n_samples": n_samples,
        "duration_seconds": (n_samples / fs) if fs else 0.0,
        "channel_names": list(h.sig_name or []),
        "units": list(h.units or []),
        "signal_formats": list(h.fmt or []),
        "adc_gain": [None if g is None else float(g) for g in (h.adc_gain or [])],
        "adc_baseline": [None if b is None else int(b) for b in (h.baseline or [])],
        "header_comments": list(h.comments or []),  # free text, not interpreted
        "has_annotations": (directory / f"{stem}.{ANNOTATION_EXT}").is_file(),
    }


def load_record(record_id: str, sampfrom: int = 0, sampto: Optional[int] = None,
                channels: Optional[list[int]] = None):
    """Load a (partial) record as a wfdb.Record with physical signals."""
    directory, stem, _ = resolve_record(record_id)
    try:
        return wfdb.rdrecord(str(directory / stem), sampfrom=sampfrom, sampto=sampto,
                             channels=channels, physical=True)
    except FileNotFoundError as exc:
        raise RecordNotFoundError("A required record file is missing.") from exc
    except Exception as exc:
        logger.warning("Record read failed for %s: %s", record_id, exc)
        raise RecordReadError("The record could not be read (corrupted or unsupported).") from exc


def prepare_signal_for_visualization(p_signal: np.ndarray, fs: float, sampfrom: int,
                                     max_points: int) -> dict:
    """Decimate by stride so the payload stays small.

    TODO: use min/max-per-bucket decimation so R-peaks are never dropped when zoomed out.
    """
    n = p_signal.shape[0]
    step = max(1, math.ceil(n / max(1, max_points)))
    idx = np.arange(0, n, step)
    samples = (idx + sampfrom).astype(int)
    return {
        "decimation_step": int(step),
        "samples": samples.tolist(),
        "time": (samples / fs).round(5).tolist(),
        "values": p_signal[idx],  # (m, channels) float array, may contain NaN
    }


def get_signal(record_id: str, start_s: float = 0.0, end_s: Optional[float] = None,
               max_points: Optional[int] = None, channels: Optional[list[int]] = None) -> dict:
    meta = get_record_metadata(record_id)
    fs, total = meta["sampling_frequency"], meta["n_samples"]
    if fs <= 0 or total <= 0:
        raise EmptySignalError("The record contains no signal data.")
    sampfrom = int(start_s * fs)
    sampto = min(total, int(end_s * fs)) if end_s is not None else total
    if sampfrom < 0 or sampfrom >= sampto:
        raise InvalidRangeError("Invalid time range for this record.")
    if channels and any(c < 0 or c >= meta["n_channels"] for c in channels):
        raise InvalidRangeError("Invalid channel index.")

    rec = load_record(record_id, sampfrom, sampto, channels)
    if rec.p_signal is None or rec.p_signal.size == 0:
        raise EmptySignalError("The record contains no signal data.")

    prep = prepare_signal_for_visualization(rec.p_signal, fs, sampfrom,
                                            max_points or settings.max_signal_points)
    vals = prep["values"]
    out_channels = [{
        "name": rec.sig_name[i], "unit": rec.units[i] if rec.units else "",
        "values": [None if v != v else round(float(v), 4) for v in vals[:, i]],
    } for i in range(vals.shape[1])]
    return {
        "record_id": record_id, "sampling_frequency": fs,
        "start_sample": sampfrom, "end_sample": sampto,
        "decimation_step": prep["decimation_step"], "n_points": len(prep["time"]),
        "time": prep["time"], "samples": prep["samples"], "channels": out_channels,
    }


def get_annotations(record_id: str, start_s: float = 0.0, end_s: Optional[float] = None,
                    limit: int = 1000, offset: int = 0) -> dict:
    directory, stem, _ = resolve_record(record_id)
    base = {"record_id": record_id, "offset": offset, "limit": limit}
    if not (directory / f"{stem}.{ANNOTATION_EXT}").is_file():
        return {**base, "available": False, "total": 0, "symbol_counts": {},
                "symbol_descriptions": {}, "annotations": []}

    fs = get_record_metadata(record_id)["sampling_frequency"]
    sampfrom = int(start_s * fs)
    sampto = int(end_s * fs) if end_s is not None else None
    if sampto is not None and sampfrom >= sampto:
        raise InvalidRangeError("Invalid time range for this record.")
    try:
        ann = wfdb.rdann(str(directory / stem), ANNOTATION_EXT, sampfrom=sampfrom, sampto=sampto)
    except Exception as exc:
        logger.warning("Annotation read failed for %s: %s", record_id, exc)
        raise RecordReadError("The annotation file could not be read.") from exc

    # Symbol meanings come from WFDB's own label table, restricted to symbols present.
    present = set(map(str, ann.symbol))
    descriptions = {str(r.symbol): str(r.description)
                    for r in ann_label_table.itertuples() if str(r.symbol) in present}

    total = len(ann.sample)
    notes = ann.aux_note or [""] * total
    items = [{
        "sample": int(ann.sample[i]), "time": round(float(ann.sample[i]) / fs, 5),
        "symbol": str(ann.symbol[i]), "aux_note": (notes[i] or "").strip("\x00"),
    } for i in range(offset, min(total, offset + limit))]
    return {**base, "available": True, "total": total,
            "symbol_counts": dict(Counter(map(str, ann.symbol))),
            "symbol_descriptions": descriptions, "annotations": items}
