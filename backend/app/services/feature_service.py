"""Feature Extraction Service connecting WFDB records to the 209-D ML feature pipeline.

Reuses existing ML modules:
- app.ml.preprocessing: select_lead_channel, remove_baseline_wander, normalize_beat_window
- app.ml.beat_extraction: extract_record_beats
- app.ml.rr_features: RRFeatureExtractor
- app.services.ecg_service: resolve_record, load_record
"""
from dataclasses import dataclass
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import wfdb

from app.core.config import settings
from app.ml.beat_extraction import extract_record_beats
from app.ml.label_mapping import get_aami_class, is_heartbeat, is_included_beat
from app.ml.preprocessing import (
    normalize_beat_window,
    remove_baseline_wander,
    select_lead_channel,
)
from app.ml.rr_features import (
    BIDIRECTIONAL_FEATURE_NAMES,
    BeatTimingMetadata,
    RRFeatureExtractor,
)
from app.ml.schemas import BeatMetadata, ExclusionStats, WindowConfig
from app.services import ecg_service

logger = logging.getLogger(__name__)


@dataclass
class ExtractedBeat:
    """Represents a single heartbeat with its 209-D feature vector and metadata."""
    beat_index: int
    sample_index: int
    time_seconds: float
    symbol: str
    ground_truth_class: Optional[str]
    lead_name: str
    morphology_window: np.ndarray      # Shape (200,), z-score normalized
    rr_features: Dict[str, Optional[float]]
    feature_vector: np.ndarray        # Shape (209,), float32 (or zeros if edge beat)
    is_valid_bidirectional: bool
    exclusion_reason: Optional[str] = None


class RecordFeaturePipeline:
    """Orchestrates feature extraction for full records or individual beats."""

    def __init__(self, mitbih_dir: Optional[Path] = None):
        self.mitbih_dir = Path(mitbih_dir) if mitbih_dir else settings.mitbih_dir
        self.rr_extractor = RRFeatureExtractor(mitbih_dir=self.mitbih_dir)
        self.window_config = WindowConfig()

    def extract_record_features(self, record_id: str) -> List[ExtractedBeat]:
        """Extract all beat features (200 morphology + 9 RR = 209 D) for a record.

        Enforces zero temporal leakage and flags edge beats explicitly.
        """
        directory, stem, source = ecg_service.resolve_record(record_id)
        rec_path = str(directory / stem)

        # 1. Load header and signal
        header = wfdb.rdheader(rec_path)
        p_signal = wfdb.rdrecord(rec_path, physical=True).p_signal
        sig_names = list(header.sig_name or [])

        # 2. Select lead channel
        ch_idx, lead_name = select_lead_channel(sig_names, self.window_config.preferred_leads)
        raw_lead_signal = p_signal[:, ch_idx].astype(np.float64)

        # 3. Baseline wander removal on continuous signal
        filtered_signal = remove_baseline_wander(raw_lead_signal, fs=self.window_config.fs)

        # 4. Load annotations if present
        ann_path = directory / f"{stem}.atr"
        if not ann_path.is_file():
            logger.warning("No annotation file found for record %s", record_id)
            return []

        ann = wfdb.rdann(rec_path, "atr")
        ann_samples = np.asarray(ann.sample, dtype=np.int64)
        ann_symbols = [str(s).strip() for s in ann.symbol]

        # Filter strictly to valid heartbeats
        valid_heartbeats: List[Tuple[int, str]] = []
        for s_idx, sym in zip(ann_samples, ann_symbols):
            if is_heartbeat(sym):
                valid_heartbeats.append((int(s_idx), sym))

        n_beats = len(valid_heartbeats)
        if n_beats == 0:
            return []

        # 5. Extract RR features for all heartbeats
        all_samples = np.array([s for s, _ in valid_heartbeats], dtype=np.int64)
        rolling_rr_history: List[float] = []

        extracted_beats: List[ExtractedBeat] = []

        for i, (sample_idx, sym) in enumerate(valid_heartbeats):
            time_sec = round(float(sample_idx) / self.window_config.fs, 4)
            raw_aami = get_aami_class(sym)
            gt_class = raw_aami if raw_aami in ("N", "S", "V", "F") else None

            is_first_beat = (i == 0)
            is_last_beat = (i == n_beats - 1)

            # Check boundary condition for 200-sample morphology window
            start_idx = sample_idx - self.window_config.pre_samples
            end_idx = sample_idx + self.window_config.post_samples
            incomplete_morphology = (start_idx < 0 or end_idx > len(filtered_signal))

            edge_rr_features: Dict[str, Optional[float]] = {
                "RR_prev": None,
                "HR_prev": None,
                "RR_local_median": None,
                "RR_ratio_prev": None,
                "RR_dev_prev": None,
                "RR_next": None,
                "HR_next": None,
                "RR_ratio_bidi": None,
                "RR_bidi_diff": None,
            }

            if is_first_beat or is_last_beat:
                # Controlled edge beat
                reason = "First beat in record (lacks RR_prev)" if is_first_beat else "Last beat in record (lacks RR_next)"
                norm_window = np.zeros(200, dtype=np.float32) if incomplete_morphology else normalize_beat_window(filtered_signal[start_idx:end_idx], method="zscore").astype(np.float32)
                if is_first_beat and i < n_beats - 1:
                    next_s = all_samples[i + 1]
                    rr_n = float((next_s - sample_idx) / self.window_config.fs)
                    if rr_n > 0:
                        edge_rr_features["RR_next"] = round(rr_n, 4)
                        edge_rr_features["HR_next"] = round(60.0 / rr_n, 2)
                elif is_last_beat and i > 0:
                    prev_s = all_samples[i - 1]
                    rr_p = float((sample_idx - prev_s) / self.window_config.fs)
                    if rr_p > 0:
                        edge_rr_features["RR_prev"] = round(rr_p, 4)
                        edge_rr_features["HR_prev"] = round(60.0 / rr_p, 2)

                extracted_beats.append(
                    ExtractedBeat(
                        beat_index=i,
                        sample_index=sample_idx,
                        time_seconds=time_sec,
                        symbol=sym,
                        ground_truth_class=gt_class,
                        lead_name=lead_name,
                        morphology_window=norm_window,
                        rr_features=edge_rr_features,
                        feature_vector=np.zeros(209, dtype=np.float32),
                        is_valid_bidirectional=False,
                        exclusion_reason=reason,
                    )
                )
                continue

            if incomplete_morphology:
                # Boundary incomplete window
                extracted_beats.append(
                    ExtractedBeat(
                        beat_index=i,
                        sample_index=sample_idx,
                        time_seconds=time_sec,
                        symbol=sym,
                        ground_truth_class=gt_class,
                        lead_name=lead_name,
                        morphology_window=np.zeros(200, dtype=np.float32),
                        rr_features=edge_rr_features,
                        feature_vector=np.zeros(209, dtype=np.float32),
                        is_valid_bidirectional=False,
                        exclusion_reason="Incomplete morphology window at recording boundary",
                    )
                )
                continue

            # Extract and z-score normalize the 200-sample morphology window
            raw_window = filtered_signal[start_idx:end_idx]
            norm_window = normalize_beat_window(raw_window, method="zscore").astype(np.float32)

            # Valid bidirectional beat: both prev and next exist
            prev_sample = all_samples[i - 1]
            next_sample = all_samples[i + 1]

            rr_prev = float((sample_idx - prev_sample) / self.window_config.fs)
            rr_next = float((next_sample - sample_idx) / self.window_config.fs)

            if rr_prev <= 0 or rr_next <= 0:
                extracted_beats.append(
                    ExtractedBeat(
                        beat_index=i,
                        sample_index=sample_idx,
                        time_seconds=time_sec,
                        symbol=sym,
                        ground_truth_class=gt_class,
                        lead_name=lead_name,
                        morphology_window=norm_window,
                        rr_features=edge_rr_features,
                        feature_vector=np.zeros(209, dtype=np.float32),
                        is_valid_bidirectional=False,
                        exclusion_reason="Non-positive physiological RR interval",
                    )
                )
                continue

            # Calculate the 9 bidirectional RR metrics
            hr_prev = 60.0 / rr_prev
            hr_next = 60.0 / rr_next

            if len(rolling_rr_history) > 0:
                recent_rr = rolling_rr_history[-10:]
                local_median = float(np.median(recent_rr))
                rr_ratio = rr_prev / local_median if local_median > 0 else 1.0
                rr_dev = (rr_prev - local_median) / local_median if local_median > 0 else 0.0
            else:
                local_median = float(rr_prev)
                rr_ratio = 1.0
                rr_dev = 0.0
            rolling_rr_history.append(rr_prev)

            rr_ratio_bidi = rr_prev / rr_next if rr_next > 0 else 1.0
            rr_bidi_diff = rr_next - rr_prev

            rr_features_dict = {
                "RR_prev": round(rr_prev, 4),
                "HR_prev": round(hr_prev, 2),
                "RR_local_median": round(local_median, 4),
                "RR_ratio_prev": round(rr_ratio, 4),
                "RR_dev_prev": round(rr_dev, 4),
                "RR_next": round(rr_next, 4),
                "HR_next": round(hr_next, 2),
                "RR_ratio_bidi": round(rr_ratio_bidi, 4),
                "RR_bidi_diff": round(rr_bidi_diff, 4),
            }

            rr_vec = np.array([
                rr_prev, hr_prev, local_median, rr_ratio, rr_dev,
                rr_next, hr_next, rr_ratio_bidi, rr_bidi_diff,
            ], dtype=np.float32)

            feature_vector = np.concatenate([norm_window, rr_vec]).astype(np.float32)
            assert feature_vector.shape[0] == 209, f"Feature vector length must be 209, got {feature_vector.shape[0]}"

            extracted_beats.append(
                ExtractedBeat(
                    beat_index=i,
                    sample_index=sample_idx,
                    time_seconds=time_sec,
                    symbol=sym,
                    ground_truth_class=gt_class,
                    lead_name=lead_name,
                    morphology_window=norm_window,
                    rr_features=rr_features_dict,
                    feature_vector=feature_vector,
                    is_valid_bidirectional=True,
                    exclusion_reason=None,
                )
            )

        return extracted_beats


_pipeline_instance: Optional[RecordFeaturePipeline] = None


def get_record_feature_pipeline() -> RecordFeaturePipeline:
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = RecordFeaturePipeline()
    return _pipeline_instance
