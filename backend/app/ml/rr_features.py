"""Temporal and RR-Interval Feature Engineering Module for ECG Arrhythmia Analysis.

Extracts cardiac timing features from original PhysioNet MIT-BIH Arrhythmia Database
(.atr) annotations using strictly valid heartbeat positions.
Implements:
1. Variant A (Causal / Retrospective): Uses strictly preceding heartbeat timing.
2. Variant B (Bidirectional / Offline): Incorporates preceding and succeeding heartbeat timing.
Strictly enforces record isolation (never computes RR across record boundaries), zero temporal
leakage, and transparent edge-beat exclusion.
"""
from dataclasses import dataclass
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import wfdb

from app.core.config import settings
from app.ml.data_loader import BeatBatch, ECGDatasetLoader
from app.ml.label_mapping import is_heartbeat
from app.ml.models import AAMI_4_CLASSES

logger = logging.getLogger(__name__)

# Feature Column Names
CAUSAL_FEATURE_NAMES: List[str] = [
    "RR_prev",
    "HR_prev",
    "RR_local_median",
    "RR_ratio_prev",
    "RR_dev_prev",
]

BIDIRECTIONAL_FEATURE_NAMES: List[str] = [
    "RR_prev",
    "HR_prev",
    "RR_local_median",
    "RR_ratio_prev",
    "RR_dev_prev",
    "RR_next",
    "HR_next",
    "RR_ratio_bidi",
    "RR_bidi_diff",
]


@dataclass
class BeatTimingMetadata:
    """Comprehensive timing and provenance metadata for an individual heartbeat."""
    record_id: str
    annotation_sample: int
    annotation_symbol: str
    class_label: str
    lead_name: str
    prev_sample: Optional[int]
    next_sample: Optional[int]
    rr_prev_seconds: Optional[float]
    rr_next_seconds: Optional[float]
    is_valid_causal: bool
    is_valid_bidirectional: bool


@dataclass
class RRAuditStatistics:
    """Statistical summary of RR intervals across a dataset partition."""
    partition_name: str
    total_beats_examined: int
    usable_causal_beats: int
    usable_bidi_beats: int
    excluded_edge_beats_causal: int
    excluded_edge_beats_bidi: int
    invalid_or_nonpositive_rr_count: int
    nan_or_inf_count: int
    min_rr_seconds: float
    max_rr_seconds: float
    median_rr_seconds: float
    mean_rr_seconds: float
    std_rr_seconds: float


class RRFeatureExtractor:
    """Extracts, validates, and engineers RR timing features from MIT-BIH annotations."""

    def __init__(self, mitbih_dir: Optional[Path] = None, fs: float = 360.0):
        self.mitbih_dir = Path(mitbih_dir) if mitbih_dir is not None else settings.mitbih_dir
        self.fs = float(fs)
        self._record_beat_annotations_cache: Dict[str, np.ndarray] = {}

    def get_valid_heartbeat_samples_for_record(self, record_id: str) -> np.ndarray:
        """Extract sorted 1D array of sample indices for all valid heartbeats in a record.

        Filters out non-beat annotations (+, ~, |, etc.) strictly according to Phase 3 rules.
        """
        if record_id in self._record_beat_annotations_cache:
            return self._record_beat_annotations_cache[record_id]

        rec_path = str(self.mitbih_dir / record_id)
        try:
            ann = wfdb.rdann(rec_path, "atr")
        except Exception as e:
            logger.error("Failed to load WFDB annotation for record %s: %s", record_id, e)
            return np.empty((0,), dtype=np.int64)

        valid_samples: List[int] = []
        seen_samples: set[int] = set()

        for s, sym in zip(ann.sample, ann.symbol):
            s_idx = int(s)
            sym_str = str(sym).strip()
            if s_idx in seen_samples:
                continue
            seen_samples.add(s_idx)
            if is_heartbeat(sym_str):
                valid_samples.append(s_idx)

        samples_arr = np.array(sorted(valid_samples), dtype=np.int64)
        self._record_beat_annotations_cache[record_id] = samples_arr
        return samples_arr

    def extract_timing_for_batch(
        self,
        batch: BeatBatch,
        window_size_local: int = 10,
    ) -> Tuple[List[BeatTimingMetadata], np.ndarray, np.ndarray]:
        """Compute cardiac timing and metadata for all beats in a BeatBatch.

        Returns:
        --------
        metadata_list : List of BeatTimingMetadata for each beat
        causal_features : np.ndarray of shape (N, 5), float32 (NaN for edge beats)
        bidi_features : np.ndarray of shape (N, 9), float32 (NaN for edge beats)
        """
        n_beats = len(batch)
        ordered_meta: List[BeatTimingMetadata] = [None] * n_beats  # type: ignore
        causal_feats = np.full((n_beats, len(CAUSAL_FEATURE_NAMES)), np.nan, dtype=np.float32)
        bidi_feats = np.full((n_beats, len(BIDIRECTIONAL_FEATURE_NAMES)), np.nan, dtype=np.float32)

        # Group indices by record to guarantee that RR is NEVER computed across records
        unique_records = np.unique(batch.record_ids)

        for rid in unique_records:
            rec_indices = np.where(batch.record_ids == rid)[0]
            # Sort indices chronologically by sample_indices
            order = np.argsort(batch.sample_indices[rec_indices])
            sorted_rec_indices = rec_indices[order]

            # Get complete valid heartbeat sequence from the record's .atr annotation
            all_valid_samples = self.get_valid_heartbeat_samples_for_record(str(rid))
            sample_to_idx = {int(s): idx for idx, s in enumerate(all_valid_samples)}

            # Track rolling valid RR intervals for local running median/deviation
            rolling_rr_history: List[float] = []

            for i_rec, batch_idx in enumerate(sorted_rec_indices):
                curr_sample = int(batch.sample_indices[batch_idx])
                sym = str(batch.symbols[batch_idx])
                cls_label = str(batch.labels[batch_idx])
                lead = str(batch.lead_names[batch_idx])

                prev_sample: Optional[int] = None
                next_sample: Optional[int] = None
                rr_prev: Optional[float] = None
                rr_next: Optional[float] = None

                # Locate in record sequence with strict record boundary enforcement
                seq_idx = sample_to_idx.get(curr_sample)
                # First beat in the record partition is an edge beat (lacks preceding interval in partition)
                if i_rec > 0 and seq_idx is not None and seq_idx > 0:
                    prev_sample = int(all_valid_samples[seq_idx - 1])
                    rr_prev = (curr_sample - prev_sample) / self.fs
                # Last beat in the record partition is an edge beat (lacks succeeding interval in partition)
                if i_rec < len(sorted_rec_indices) - 1 and seq_idx is not None and seq_idx < len(all_valid_samples) - 1:
                    next_sample = int(all_valid_samples[seq_idx + 1])
                    rr_next = (next_sample - curr_sample) / self.fs

                # Physiological validity checks
                is_valid_causal = (rr_prev is not None and rr_prev > 0.0 and np.isfinite(rr_prev))
                is_valid_bidi = (
                    is_valid_causal and
                    rr_next is not None and
                    rr_next > 0.0 and
                    np.isfinite(rr_next)
                )

                meta = BeatTimingMetadata(
                    record_id=str(rid),
                    annotation_sample=curr_sample,
                    annotation_symbol=sym,
                    class_label=cls_label,
                    lead_name=lead,
                    prev_sample=prev_sample,
                    next_sample=next_sample,
                    rr_prev_seconds=rr_prev,
                    rr_next_seconds=rr_next,
                    is_valid_causal=is_valid_causal,
                    is_valid_bidirectional=is_valid_bidi,
                )
                ordered_meta[batch_idx] = meta

                # Compute Feature Vectors
                if is_valid_causal and rr_prev is not None:
                    hr_prev = 60.0 / rr_prev
                    # Minimum-history rule: local median draws strictly from preceding intervals
                    if len(rolling_rr_history) > 0:
                        recent_rr = rolling_rr_history[-window_size_local:]
                        local_median = float(np.median(recent_rr))
                        rr_ratio = rr_prev / local_median if local_median > 0 else 1.0
                        rr_dev = (rr_prev - local_median) / local_median if local_median > 0 else 0.0
                    else:
                        # Initial interval in record (beat 1): 0 prior intervals available; baseline defaults to initial observation
                        local_median = float(rr_prev)
                        rr_ratio = 1.0
                        rr_dev = 0.0
                    rolling_rr_history.append(rr_prev)

                    causal_feats[batch_idx, 0] = float(rr_prev)
                    causal_feats[batch_idx, 1] = float(hr_prev)
                    causal_feats[batch_idx, 2] = float(local_median)
                    causal_feats[batch_idx, 3] = float(rr_ratio)
                    causal_feats[batch_idx, 4] = float(rr_dev)

                    if is_valid_bidi and rr_next is not None:
                        hr_next = 60.0 / rr_next
                        rr_ratio_bidi = rr_prev / rr_next if rr_next > 0 else 1.0
                        rr_bidi_diff = rr_next - rr_prev

                        bidi_feats[batch_idx, 0] = float(rr_prev)
                        bidi_feats[batch_idx, 1] = float(hr_prev)
                        bidi_feats[batch_idx, 2] = float(local_median)
                        bidi_feats[batch_idx, 3] = float(rr_ratio)
                        bidi_feats[batch_idx, 4] = float(rr_dev)
                        bidi_feats[batch_idx, 5] = float(rr_next)
                        bidi_feats[batch_idx, 6] = float(hr_next)
                        bidi_feats[batch_idx, 7] = float(rr_ratio_bidi)
                        bidi_feats[batch_idx, 8] = float(rr_bidi_diff)

        return ordered_meta, causal_feats, bidi_feats

    def compute_audit_statistics(
        self,
        rr_intervals: np.ndarray,
        total_examined: int,
        usable_causal: int,
        usable_bidi: int,
        excluded_causal: int,
        excluded_bidi: int,
        partition_name: str,
    ) -> RRAuditStatistics:
        """Compute statistical quality metrics over valid RR intervals."""
        clean_rr = rr_intervals[np.isfinite(rr_intervals) & (rr_intervals > 0)]
        invalid_cnt = int(np.sum(~np.isfinite(rr_intervals) | (rr_intervals <= 0)))
        nan_inf_cnt = int(np.sum(np.isnan(rr_intervals) | np.isinf(rr_intervals)))

        if len(clean_rr) == 0:
            return RRAuditStatistics(
                partition_name=partition_name,
                total_beats_examined=total_examined,
                usable_causal_beats=0,
                usable_bidi_beats=0,
                excluded_edge_beats_causal=excluded_causal,
                excluded_edge_beats_bidi=excluded_bidi,
                invalid_or_nonpositive_rr_count=invalid_cnt,
                nan_or_inf_count=nan_inf_cnt,
                min_rr_seconds=0.0,
                max_rr_seconds=0.0,
                median_rr_seconds=0.0,
                mean_rr_seconds=0.0,
                std_rr_seconds=0.0,
            )

        return RRAuditStatistics(
            partition_name=partition_name,
            total_beats_examined=total_examined,
            usable_causal_beats=usable_causal,
            usable_bidi_beats=usable_bidi,
            excluded_edge_beats_causal=excluded_causal,
            excluded_edge_beats_bidi=excluded_bidi,
            invalid_or_nonpositive_rr_count=invalid_cnt,
            nan_or_inf_count=nan_inf_cnt,
            min_rr_seconds=round(float(np.min(clean_rr)), 4),
            max_rr_seconds=round(float(np.max(clean_rr)), 4),
            median_rr_seconds=round(float(np.median(clean_rr)), 4),
            mean_rr_seconds=round(float(np.mean(clean_rr)), 4),
            std_rr_seconds=round(float(np.std(clean_rr)), 4),
        )


def prepare_phase6_datasets(
    loader: ECGDatasetLoader,
    extractor: Optional[RRFeatureExtractor] = None,
    variant: str = "causal",
) -> Dict[str, Any]:
    """Extract and prepare controlled datasets for Phase 6 experiments.

    Parameters:
    -----------
    loader : ECGDatasetLoader
    extractor : Optional[RRFeatureExtractor]
    variant : 'causal' (Variant A, 5 timing features) or 'bidirectional' (Variant B, 9 timing features)

    Returns:
    --------
    Dictionary containing:
      X_train_morphology: (N_train_clean, 200)
      X_train_combined: (N_train_clean, 200 + D_temporal)
      y_train: (N_train_clean,)
      X_val_morphology: (N_val_clean, 200)
      X_val_combined: (N_val_clean, 200 + D_temporal)
      y_val: (N_val_clean,)
      train_stats: RRAuditStatistics
      val_stats: RRAuditStatistics
      temporal_feature_names: List[str]
    """
    if extractor is None:
        extractor = RRFeatureExtractor()

    # 1. Load raw 4-class batches (DS1 records only)
    train_batch = loader.get_train_data()
    val_batch = loader.get_validation_data()

    # Identify initial recording boundary beat (t < 250 ms / first annotation) per record
    def _is_initial_recording_beat(record_ids: np.ndarray, sample_indices: np.ndarray) -> np.ndarray:
        is_initial = np.zeros(len(record_ids), dtype=bool)
        for rid in np.unique(record_ids):
            rec_mask = (record_ids == rid)
            valid_samples = extractor.get_valid_heartbeat_samples_for_record(str(rid))
            if len(valid_samples) > 0:
                first_ann = valid_samples[0]
                is_initial[rec_mask & (sample_indices == first_ann)] = True
        return is_initial

    train_initial_mask = _is_initial_recording_beat(train_batch.record_ids, train_batch.sample_indices)
    val_initial_mask = _is_initial_recording_beat(val_batch.record_ids, val_batch.sample_indices)

    # Filter to 4 primary classes (excludes Q) and exclude initial recording boundary beats
    train_mask = np.isin(train_batch.labels, AAMI_4_CLASSES) & (~train_initial_mask)
    val_mask = np.isin(val_batch.labels, AAMI_4_CLASSES) & (~val_initial_mask)

    train_filtered = BeatBatch(
        signals=train_batch.signals[train_mask],
        labels=train_batch.labels[train_mask],
        record_ids=train_batch.record_ids[train_mask],
        lead_names=train_batch.lead_names[train_mask],
        sample_indices=train_batch.sample_indices[train_mask],
        symbols=train_batch.symbols[train_mask],
    )

    val_filtered = BeatBatch(
        signals=val_batch.signals[val_mask],
        labels=val_batch.labels[val_mask],
        record_ids=val_batch.record_ids[val_mask],
        lead_names=val_batch.lead_names[val_mask],
        sample_indices=val_batch.sample_indices[val_mask],
        symbols=val_batch.symbols[val_mask],
    )

    # 2. Extract RR features
    train_meta, train_causal, train_bidi = extractor.extract_timing_for_batch(train_filtered)
    val_meta, val_causal, val_bidi = extractor.extract_timing_for_batch(val_filtered)

    # 3. Apply edge-beat exclusion policy
    if variant == "bidirectional":
        train_valid_mask = np.array([m.is_valid_bidirectional for m in train_meta], dtype=bool)
        val_valid_mask = np.array([m.is_valid_bidirectional for m in val_meta], dtype=bool)
        train_timing = train_bidi
        val_timing = val_bidi
        feature_names = BIDIRECTIONAL_FEATURE_NAMES
    else:  # Default to causal (Variant A)
        train_valid_mask = np.array([m.is_valid_causal for m in train_meta], dtype=bool)
        val_valid_mask = np.array([m.is_valid_causal for m in val_meta], dtype=bool)
        train_timing = train_causal
        val_timing = val_causal
        feature_names = CAUSAL_FEATURE_NAMES

    # Ensure no NaN/Inf remains in selected valid slice
    train_clean_timing = train_timing[train_valid_mask]
    val_clean_timing = val_timing[val_valid_mask]

    assert not np.isnan(train_clean_timing).any(), "NaN found in clean training timing features."
    assert not np.isinf(train_clean_timing).any(), "Inf found in clean training timing features."
    assert not np.isnan(val_clean_timing).any(), "NaN found in clean validation timing features."
    assert not np.isinf(val_clean_timing).any(), "Inf found in clean validation timing features."

    # Build controlled matrices
    X_train_morph = train_filtered.signals[train_valid_mask].astype(np.float32)
    y_train = train_filtered.labels[train_valid_mask].astype(str)
    X_train_comb = np.hstack([X_train_morph, train_clean_timing]).astype(np.float32)

    X_val_morph = val_filtered.signals[val_valid_mask].astype(np.float32)
    y_val = val_filtered.labels[val_valid_mask].astype(str)
    X_val_comb = np.hstack([X_val_morph, val_clean_timing]).astype(np.float32)

    # 4. Compute Audit Statistics
    train_stats = extractor.compute_audit_statistics(
        rr_intervals=train_causal[:, 0],
        total_examined=len(train_filtered),
        usable_causal=int(np.sum([m.is_valid_causal for m in train_meta])),
        usable_bidi=int(np.sum([m.is_valid_bidirectional for m in train_meta])),
        excluded_causal=int(len(train_filtered) - np.sum([m.is_valid_causal for m in train_meta])),
        excluded_bidi=int(len(train_filtered) - np.sum([m.is_valid_bidirectional for m in train_meta])),
        partition_name="TRAIN (16 DS1 Records)",
    )

    val_stats = extractor.compute_audit_statistics(
        rr_intervals=val_causal[:, 0],
        total_examined=len(val_filtered),
        usable_causal=int(np.sum([m.is_valid_causal for m in val_meta])),
        usable_bidi=int(np.sum([m.is_valid_bidirectional for m in val_meta])),
        excluded_causal=int(len(val_filtered) - np.sum([m.is_valid_causal for m in val_meta])),
        excluded_bidi=int(len(val_filtered) - np.sum([m.is_valid_bidirectional for m in val_meta])),
        partition_name="VALIDATION (6 DS1 Records)",
    )

    return {
        "variant": variant,
        "X_train_morphology": X_train_morph,
        "X_train_combined": X_train_comb,
        "y_train": y_train,
        "X_val_morphology": X_val_morph,
        "X_val_combined": X_val_comb,
        "y_val": y_val,
        "train_stats": train_stats,
        "val_stats": val_stats,
        "temporal_feature_names": feature_names,
        "combined_feature_names": [f"ECG_{i:03d}" for i in range(200)] + feature_names,
        "train_meta": [m for i, m in enumerate(train_meta) if train_valid_mask[i]],
        "val_meta": [m for i, m in enumerate(val_meta) if val_valid_mask[i]],
    }
