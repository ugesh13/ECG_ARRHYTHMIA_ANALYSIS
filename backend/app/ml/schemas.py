"""Schemas and configuration dataclasses for Phase 3 ML preprocessing."""
from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class WindowConfig:
    """Configuration for beat-centered ECG window extraction.

    Default: 360 Hz, 90 samples pre-R (0.250 s), 110 samples post-R (0.306 s).
    Total window length: 200 samples (0.556 s).
    Alignment point: sample index `pre_samples` (index 90 in a 200-sample array).
    """
    fs: float = 360.0
    pre_samples: int = 90
    post_samples: int = 110
    normalize: bool = True
    normalization_method: str = "zscore"  # "zscore" | "minmax" | "none"
    remove_baseline: bool = False
    preferred_leads: tuple[str, ...] = ("MLII", "V5", "V1", "V2", "V4")

    @property
    def window_length(self) -> int:
        return self.pre_samples + self.post_samples

    @property
    def duration_seconds(self) -> float:
        return self.window_length / self.fs


@dataclass
class BeatMetadata:
    """Metadata recorded for each extracted beat window."""
    record_id: str
    annotation_sample: int
    annotation_symbol: str
    class_label: str
    lead_name: str
    channel_index: int
    is_valid: bool = True
    exclusion_reason: Optional[str] = None


@dataclass
class ExclusionStats:
    """Tracks counts of all examined annotations across explicit pipeline stages.

    Mathematical Invariants:
      1. total_annotations_examined == total_beat_annotations + total_non_beat_annotations + duplicate_annotations
      2. total_beat_annotations == total_included_beats + (boundary_incomplete + nan_or_inf + unsupported)
      3. total_excluded_annotations == non_beat_event_annotations + boundary_incomplete + nan_or_inf + duplicate + unsupported
      4. total_annotations_examined == total_included_beats + total_excluded_annotations
    """
    total_annotations_examined: int = 0
    total_beat_annotations: int = 0
    total_non_beat_annotations: int = 0

    total_included_beats: int = 0
    total_excluded_annotations: int = 0

    # Specific exclusion breakdown (sums exactly to total_excluded_annotations)
    non_beat_event_annotations: int = 0
    boundary_incomplete_windows: int = 0
    nan_or_inf_signal: int = 0
    duplicate_annotations: int = 0
    unsupported_or_rejected_symbols: int = 0

    def record_exclusion(self, reason: str) -> None:
        self.total_excluded_annotations += 1
        if reason == "non_beat_annotation":
            self.non_beat_event_annotations += 1
            self.total_non_beat_annotations += 1
        elif reason == "boundary_incomplete":
            self.boundary_incomplete_windows += 1
        elif reason == "nan_or_inf":
            self.nan_or_inf_signal += 1
        elif reason == "duplicate_sample":
            self.duplicate_annotations += 1
        elif reason == "unsupported_symbol":
            self.unsupported_or_rejected_symbols += 1
        else:
            self.unsupported_or_rejected_symbols += 1

    def validate_invariants(self) -> bool:
        """Verify mathematical reconciliation across all pipeline stages."""
        stage1_ok = (self.total_annotations_examined ==
                     self.total_beat_annotations + self.total_non_beat_annotations + self.duplicate_annotations)
        stage2_ok = (self.total_beat_annotations ==
                     self.total_included_beats + self.boundary_incomplete_windows +
                     self.nan_or_inf_signal + self.unsupported_or_rejected_symbols)
        overall_ok = (self.total_annotations_examined ==
                      self.total_included_beats + self.total_excluded_annotations)
        exclusions_sum_ok = (self.total_excluded_annotations ==
                             self.non_beat_event_annotations + self.boundary_incomplete_windows +
                             self.nan_or_inf_signal + self.duplicate_annotations +
                             self.unsupported_or_rejected_symbols)
        return stage1_ok and stage2_ok and overall_ok and exclusions_sum_ok

    def to_dict(self) -> dict:
        return {
            "total_annotations_examined": self.total_annotations_examined,
            "total_beat_annotations": self.total_beat_annotations,
            "total_non_beat_annotations": self.total_non_beat_annotations,
            "total_included_beats": self.total_included_beats,
            "total_excluded_annotations": self.total_excluded_annotations,
            "breakdown": {
                "non_beat_event_annotations": self.non_beat_event_annotations,
                "boundary_incomplete_windows": self.boundary_incomplete_windows,
                "nan_or_inf_signal": self.nan_or_inf_signal,
                "duplicate_annotations": self.duplicate_annotations,
                "unsupported_or_rejected_symbols": self.unsupported_or_rejected_symbols,
            },
            "reconciliation_valid": self.validate_invariants(),
        }
