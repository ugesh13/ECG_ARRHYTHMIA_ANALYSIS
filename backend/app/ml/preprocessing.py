"""Signal Preprocessing and Channel Selection Module for ECG Analysis.

All operations in this module are modular, deterministic, leakage-free, and
documented with explicit scientific justifications.
"""
from typing import Optional, Sequence
import numpy as np


# -----------------------------------------------------------------------------
# 1. CHANNEL SELECTION STRATEGY
# -----------------------------------------------------------------------------
def select_lead_channel(
    channel_names: Sequence[str],
    preferred_leads: Sequence[str] = ("MLII", "V5", "V1", "V2", "V4")
) -> tuple[int, str]:
    """Select the best available ECG lead based on documented priority order.

    Why needed:
      Phase 2 established that MLII is present in 45/48 records. Records 102 and 104
      have only V5 and V2 (no MLII). Record 114 has V5 as channel 0 and MLII as
      channel 1 (inverted channel ordering). Hardcoding channel 0 is erroneous.

    Selection Rule:
      1. Iterate through `preferred_leads` in priority order:
         - Modified Lead II ('MLII'): Best visibility of ventricular depolarization (QRS)
           and P-waves for rhythm analysis.
         - Lateral Precordial Lead ('V5'): Excellent QRS amplitude and morphology
           in absence of MLII.
         - Septal Precordial Lead ('V1'): Standard alternative for bundle branch blocks.
         - Anterior / Precordial ('V2', 'V4'): Supported fallback precordial leads.
      2. If an exact match is found (case-insensitive), return its channel index and name.
      3. If no preferred lead matches, fallback to channel 0 and record the raw name.

    Leakage Impact: None. Operates purely on header metadata for the single record.
    """
    clean_names = [name.strip().upper() for name in channel_names]

    for pref in preferred_leads:
        pref_upper = pref.strip().upper()
        if pref_upper in clean_names:
            idx = clean_names.index(pref_upper)
            return idx, channel_names[idx].strip()

    # Fallback to first channel if no preferred match
    fallback_idx = 0
    fallback_name = channel_names[0].strip() if channel_names else "CH0"
    return fallback_idx, fallback_name


# -----------------------------------------------------------------------------
# 2. BASELINE WANDER REMOVAL
# -----------------------------------------------------------------------------
def remove_baseline_wander(signal: np.ndarray, fs: float = 360.0) -> np.ndarray:
    """Remove low-frequency baseline drift from raw ECG voltage signal.

    Why needed:
      Electrode movement, perspiration, and patient respiration introduce slow
      isoelectric line shifts (< 0.5–0.8 Hz) that distort ST-segments and R-peak
      amplitudes without conveying diagnostic arrhythmia patterns.

    What it changes:
      Estimates the low-frequency baseline drift using a running median-approximate
      moving average filter (window ~0.6 s = 216 samples at 360 Hz) and subtracts
      it from the raw signal:
        signal_detrended = signal - baseline_estimate

    Leakage Impact: None.
      Applied independently to the continuous 1D signal of the record being processed.
      Does not compute or share statistics across records or splits.

    Train / Test Consistency:
      Applied identically to all recordings prior to beat window extraction.
    """
    if signal.size < 2:
        return signal.copy()

    # Window width of approx 0.6 seconds (spans typical cardiac cycle)
    win_len = int(round(fs * 0.6))
    if win_len % 2 == 0:
        win_len += 1
    win_len = max(3, min(win_len, signal.size))

    # Efficient moving average baseline estimation with edge reflection
    pad_width = win_len // 2
    padded = np.pad(signal, pad_width, mode="reflect")
    kernel = np.ones(win_len, dtype=np.float64) / win_len
    baseline = np.convolve(padded, kernel, mode="valid")

    return signal - baseline.astype(signal.dtype)


# -----------------------------------------------------------------------------
# 3. BEAT NORMALIZATION
# -----------------------------------------------------------------------------
def normalize_beat_window(
    window: np.ndarray,
    method: str = "zscore",
    eps: float = 1e-8
) -> np.ndarray:
    """Normalize a single beat window to invariant amplitude scale.

    Why needed:
      Absolute surface ECG amplitude varies significantly across patients due to
      skin impedance, subcutaneous fat thickness, electrode contact quality, and lead
      placement. Normalization ensures the ML model learns morphological wave shapes
      rather than arbitrary gain offsets.

    What it changes:
      - 'zscore': Rescales window to zero mean and unit variance:
          window_norm = (window - mean) / (std + eps)
      - 'minmax': Rescales window values to [0, 1]:
          window_norm = (window - min) / (max - min + eps)
      - 'none': Returns copy of window unchanged.

    Leakage Impact: NONE (ZERO LEAKAGE).
      Critical Design Principle: Normalization parameters (mean, std, min, max) are
      computed STRICTLY locally on the individual beat window (or within the single
      patient record). No global dataset statistics are used, preventing any cross-record
      or train-test leakage.

    Train / Test Consistency:
      Every sample in training, validation, and inference undergoes identical
      mathematical transformation.
    """
    if method == "none":
        return window.copy()

    if method == "zscore":
        mean_val = np.mean(window)
        std_val = np.std(window)
        if std_val < eps:
            return window - mean_val
        return (window - mean_val) / (std_val + eps)

    if method == "minmax":
        min_val = np.min(window)
        max_val = np.max(window)
        spread = max_val - min_val
        if spread < eps:
            return np.zeros_like(window)
        return (window - min_val) / (spread + eps)

    raise ValueError(f"Unsupported normalization method '{method}'. Use 'zscore', 'minmax', or 'none'.")


# -----------------------------------------------------------------------------
# 4. SIGNAL QUALITY & INTEGRITY CHECKS
# -----------------------------------------------------------------------------
def check_window_quality(window: np.ndarray, expected_length: int) -> tuple[bool, Optional[str]]:
    """Validate window integrity, shape, and numerical values.

    Returns:
      (True, None) if the window is valid.
      (False, reason_string) if any flaw is found.
    """
    if window.shape[0] != expected_length:
        return False, f"invalid_length_{window.shape[0]}_expected_{expected_length}"

    if np.isnan(window).any():
        return False, "nan_value_detected"

    if np.isinf(window).any():
        return False, "infinite_value_detected"

    # Flatline / disconnected electrode check (zero amplitude)
    if np.max(np.abs(window)) < 1e-7:
        return False, "flatline_signal"

    return True, None
