"""Beat Extraction and Window Construction Module.

Slices beat-centered windows aligned to ground-truth annotation fiducial points,
evaluates quality checks, handles boundary conditions, and logs comprehensive
exclusion counters.
"""
from typing import Any, Optional
import numpy as np

from app.ml.label_mapping import get_aami_class, is_heartbeat, is_included_beat
from app.ml.preprocessing import (
    check_window_quality,
    normalize_beat_window,
    remove_baseline_wander,
    select_lead_channel,
)
from app.ml.schemas import BeatMetadata, ExclusionStats, WindowConfig


def extract_record_beats(
    record_id: str,
    p_signal: np.ndarray,
    sig_names: list[str],
    ann_samples: np.ndarray,
    ann_symbols: list[str],
    config: WindowConfig,
    stats: Optional[ExclusionStats] = None,
) -> list[tuple[np.ndarray, BeatMetadata]]:
    """Extract, preprocess, and validate all beat-centered windows for a single record.

    Parameters:
      record_id: Identifier of the ECG recording (e.g. '100', '102').
      p_signal: 2D NumPy array of physical voltage signals (N_samples, N_channels).
      sig_names: List of channel lead names corresponding to p_signal columns.
      ann_samples: 1D array of sample indices where annotations occur.
      ann_symbols: List of annotation symbol strings.
      config: WindowConfig defining pre/post samples, normalization, and lead priorities.
      stats: ExclusionStats instance to accumulate inclusion/exclusion counts.

    Returns:
      List of (window_array, BeatMetadata) tuples.
    """
    if stats is None:
        stats = ExclusionStats()

    if p_signal is None or p_signal.ndim != 2 or p_signal.shape[0] == 0:
        return []

    n_samples, n_channels = p_signal.shape
    if n_samples < config.window_length:
        return []

    # 1. Channel selection according to priority strategy
    channel_idx, lead_name = select_lead_channel(sig_names, config.preferred_leads)
    if channel_idx >= n_channels:
        channel_idx = 0
        lead_name = sig_names[0] if sig_names else "CH0"

    lead_signal = p_signal[:, channel_idx].astype(np.float64)

    # 2. Baseline wander removal on continuous signal
    if config.remove_baseline:
        lead_signal = remove_baseline_wander(lead_signal, fs=config.fs)

    extracted_beats: list[tuple[np.ndarray, BeatMetadata]] = []
    seen_samples: set[int] = set()

    # 3. Process each reference annotation
    for sample_pos, symbol in zip(ann_samples, ann_symbols):
        sample_idx = int(sample_pos)
        symbol_str = str(symbol).strip()

        stats.total_annotations_examined += 1

        # Check for duplicate annotation sample
        if sample_idx in seen_samples:
            stats.record_exclusion("duplicate_sample")
            continue
        seen_samples.add(sample_idx)

        # Check if annotation represents a cardiac beat
        if not is_heartbeat(symbol_str):
            stats.record_exclusion("non_beat_annotation")
            continue

        stats.total_beat_annotations += 1

        # Check if beat symbol is supported/included in the ML mapping
        if not is_included_beat(symbol_str):
            stats.record_exclusion("unsupported_symbol")
            continue

        # Boundary checks: does the window fully fit inside the record?
        start_idx = sample_idx - config.pre_samples
        end_idx = sample_idx + config.post_samples

        if start_idx < 0 or end_idx > n_samples:
            stats.record_exclusion("boundary_incomplete")
            continue

        # Extract window
        window = lead_signal[start_idx:end_idx].copy()

        # Signal quality check (NaN, Inf, flatline)
        is_valid, quality_reason = check_window_quality(window, config.window_length)
        if not is_valid:
            stats.record_exclusion("nan_or_inf")
            continue

        # Normalize window (leakage-free per-beat normalization)
        if config.normalize:
            window = normalize_beat_window(window, method=config.normalization_method)

        class_label = get_aami_class(symbol_str) or "Q"

        meta = BeatMetadata(
            record_id=str(record_id),
            annotation_sample=sample_idx,
            annotation_symbol=symbol_str,
            class_label=class_label,
            lead_name=lead_name,
            channel_index=channel_idx,
            is_valid=True,
            exclusion_reason=None,
        )

        stats.total_included_beats += 1
        extracted_beats.append((window.astype(np.float32), meta))

    return extracted_beats
