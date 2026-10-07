"""ML Data Loader Module for Beat-Level ECG Datasets.

Provides a clean, memory-efficient interface for loading train, validation, and test
splits while strictly preserving record IDs, lead names, and annotation provenance.
Ensures zero data leakage across split boundaries.
"""
from dataclasses import dataclass
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

from app.core.config import settings
from app.ml.splitter import SplitManifest, load_split_manifest

logger = logging.getLogger(__name__)


@dataclass
class BeatBatch:
    """Container for an extracted split slice of beat data with full metadata provenance."""
    signals: np.ndarray          # Shape: (N, 200), float32
    labels: np.ndarray           # Shape: (N,), string AAMI classes ('N', 'S', 'V', 'F', 'Q')
    record_ids: np.ndarray       # Shape: (N,), string record identifiers ('100', '101', etc.)
    lead_names: np.ndarray       # Shape: (N,), string lead identifiers ('MLII', 'V5')
    sample_indices: np.ndarray   # Shape: (N,), int64 sample indices in original recording
    symbols: np.ndarray          # Shape: (N,), original WFDB annotation symbols

    def __len__(self) -> int:
        return len(self.labels)

    def get_class_counts(self) -> Dict[str, int]:
        """Compute frequency distribution of AAMI classes in this batch."""
        unique, counts = np.unique(self.labels, return_counts=True)
        return {str(u): int(c) for u, c in zip(unique, counts)}

    def get_record_distribution(self) -> Dict[str, int]:
        """Compute frequency distribution of beats per record in this batch."""
        unique, counts = np.unique(self.record_ids, return_counts=True)
        return {str(u): int(c) for u, c in zip(unique, counts)}

    def get_records(self) -> List[str]:
        """Return sorted list of unique records contributing to this batch."""
        return sorted(list(set(self.record_ids)))


class ECGDatasetLoader:
    """Dataset loader orchestrating record-level split isolation and access."""

    def __init__(
        self,
        npz_path: Optional[Path] = None,
        manifest: Optional[SplitManifest] = None,
        manifest_path: Optional[Path] = None,
    ):
        processed_dir = settings.mitbih_dir.parent / "processed"

        if npz_path is None:
            npz_path = processed_dir / "mitbih_processed_beats.npz"
        self.npz_path = Path(npz_path)

        if manifest is not None:
            self.manifest = manifest
        elif manifest_path is not None:
            self.manifest = load_split_manifest(Path(manifest_path))
        else:
            default_manifest_path = processed_dir / "split_manifest.json"
            if default_manifest_path.is_file():
                self.manifest = load_split_manifest(default_manifest_path)
            else:
                self.manifest = None

        self._signals: Optional[np.ndarray] = None
        self._labels: Optional[np.ndarray] = None
        self._record_ids: Optional[np.ndarray] = None
        self._lead_names: Optional[np.ndarray] = None
        self._sample_indices: Optional[np.ndarray] = None
        self._symbols: Optional[np.ndarray] = None

    def is_archive_ready(self) -> bool:
        """Check if the underlying preprocessed NPZ archive exists."""
        return self.npz_path.is_file()

    def _load_npz(self) -> None:
        """Lazily load the NPZ archive into memory."""
        if self._signals is not None:
            return

        if not self.npz_path.is_file():
            logger.info("Processed beat archive not found at '%s'. Building dataset...", self.npz_path)
            from app.ml.dataset_builder import build_processed_dataset
            build_processed_dataset(output_dir=self.npz_path.parent)

        if not self.npz_path.is_file():
            raise FileNotFoundError(
                f"Processed beat archive not found at '{self.npz_path}'. "
                "Ensure Phase 3 dataset builder has generated the archive."
            )

        with np.load(self.npz_path, allow_pickle=True) as data:
            self._signals = data["signals"].astype(np.float32)
            self._labels = data["labels"].astype(str)
            self._record_ids = data["record_ids"].astype(str)
            self._lead_names = data["lead_names"].astype(str)
            self._sample_indices = data["sample_indices"].astype(np.int64)
            self._symbols = data["symbols"].astype(str)

    def get_data_for_records(self, target_records: List[str]) -> BeatBatch:
        """Extract all beats belonging to the specified set of record IDs."""
        self._load_npz()
        assert self._record_ids is not None
        assert self._signals is not None
        assert self._labels is not None
        assert self._lead_names is not None
        assert self._sample_indices is not None
        assert self._symbols is not None

        mask = np.isin(self._record_ids, target_records)
        return BeatBatch(
            signals=self._signals[mask],
            labels=self._labels[mask],
            record_ids=self._record_ids[mask],
            lead_names=self._lead_names[mask],
            sample_indices=self._sample_indices[mask],
            symbols=self._symbols[mask],
        )

    def get_train_data(self) -> BeatBatch:
        """Return training split beat batch (zero leakage from val/test)."""
        if self.manifest is None:
            raise ValueError("Split manifest is not loaded.")
        return self.get_data_for_records(self.manifest.train_records)

    def get_validation_data(self) -> BeatBatch:
        """Return validation split beat batch (used for model tuning/selection only)."""
        if self.manifest is None:
            raise ValueError("Split manifest is not loaded.")
        return self.get_data_for_records(self.manifest.validation_records)

    def get_test_data(self) -> BeatBatch:
        """Return test split beat batch (held out, touched only once for final benchmark)."""
        if self.manifest is None:
            raise ValueError("Split manifest is not loaded.")
        return self.get_data_for_records(self.manifest.test_records)

    def get_paced_data(self) -> BeatBatch:
        """Return paced records beat batch (for secondary paced evaluation)."""
        if self.manifest is None:
            raise ValueError("Split manifest is not loaded.")
        return self.get_data_for_records(self.manifest.excluded_records)
