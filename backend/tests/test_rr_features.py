"""Unit and Integration Tests for Phase 6 Temporal / RR-Interval Feature Engineering."""
from collections import Counter
from pathlib import Path
import numpy as np
import pytest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.ml.data_loader import BeatBatch, ECGDatasetLoader
from app.ml.models import AAMI_4_CLASSES
from app.ml.rr_features import (
    BIDIRECTIONAL_FEATURE_NAMES,
    CAUSAL_FEATURE_NAMES,
    RRFeatureExtractor,
    prepare_phase6_datasets,
)


def test_rr_calculation_in_seconds():
    """Verify RR interval calculation converts sample differences correctly to seconds (fs=360Hz)."""
    fs = 360.0
    extractor = RRFeatureExtractor(fs=fs)

    # Synthetic record with 4 beats at sample positions: 360, 720, 1170, 1440
    # Expected RR intervals:
    # Beat 1 (720): (720 - 360) / 360 = 1.000 s
    # Beat 2 (1170): (1170 - 720) / 360 = 1.250 s
    # Beat 3 (1440): (1440 - 1170) / 360 = 0.750 s
    extractor._record_beat_annotations_cache["test_rec"] = np.array([360, 720, 1170, 1440], dtype=np.int64)

    batch = BeatBatch(
        signals=np.zeros((4, 200), dtype=np.float32),
        labels=np.array(["N", "N", "V", "N"]),
        record_ids=np.array(["test_rec", "test_rec", "test_rec", "test_rec"]),
        lead_names=np.array(["MLII", "MLII", "MLII", "MLII"]),
        sample_indices=np.array([360, 720, 1170, 1440], dtype=np.int64),
        symbols=np.array(["N", "N", "V", "N"]),
    )

    meta, causal_feats, bidi_feats = extractor.extract_timing_for_batch(batch)

    # Beat 0: edge beat (first beat) -> rr_prev is None
    assert meta[0].rr_prev_seconds is None
    assert np.isnan(causal_feats[0, 0])

    # Beat 1: rr_prev = 1.0 s, HR_prev = 60 bpm. Initial interval in record -> ratio=1.0, dev=0.0
    assert meta[1].rr_prev_seconds == pytest.approx(1.0, abs=1e-4)
    assert causal_feats[1, 0] == pytest.approx(1.0, abs=1e-4)
    assert causal_feats[1, 1] == pytest.approx(60.0, abs=1e-4)
    assert causal_feats[1, 2] == pytest.approx(1.0, abs=1e-4)  # local_median
    assert causal_feats[1, 3] == pytest.approx(1.0, abs=1e-4)  # ratio = 1.0
    assert causal_feats[1, 4] == pytest.approx(0.0, abs=1e-4)  # dev = 0.0

    # Beat 2: rr_prev = 1.25 s, HR_prev = 48 bpm.
    # Prior history strictly contains interval from Beat 1 (1.0 s). Current 1.25s is NOT in history!
    assert meta[2].rr_prev_seconds == pytest.approx(1.25, abs=1e-4)
    assert causal_feats[2, 0] == pytest.approx(1.25, abs=1e-4)
    assert causal_feats[2, 1] == pytest.approx(48.0, abs=1e-4)
    assert causal_feats[2, 2] == pytest.approx(1.0, abs=1e-4)   # local_median = 1.0
    assert causal_feats[2, 3] == pytest.approx(1.25, abs=1e-4)  # ratio = 1.25 / 1.0 = 1.25
    assert causal_feats[2, 4] == pytest.approx(0.25, abs=1e-4)  # dev = ratio - 1 = 0.25

    # Beat 3: rr_prev = 0.75 s, HR_prev = 80 bpm.
    # Prior history strictly contains [1.0, 1.25]. median = 1.125 s. Current 0.75s is NOT in history!
    assert meta[3].rr_prev_seconds == pytest.approx(0.75, abs=1e-4)
    assert causal_feats[3, 0] == pytest.approx(0.75, abs=1e-4)
    assert causal_feats[3, 1] == pytest.approx(80.0, abs=1e-4)
    assert causal_feats[3, 2] == pytest.approx(1.125, abs=1e-4)  # median([1.0, 1.25])
    assert causal_feats[3, 3] == pytest.approx(0.75 / 1.125, abs=1e-4)
    assert causal_feats[3, 4] == pytest.approx((0.75 / 1.125) - 1.0, abs=1e-4)


def test_feature_redundancy_mathematical_identities():
    """Verify exact mathematical redundancies: HR_prev = 60/RR_prev and RR_dev_prev = RR_ratio_prev - 1."""
    extractor = RRFeatureExtractor(fs=360.0)
    extractor._record_beat_annotations_cache["test_rec"] = np.array([360, 720, 1080], dtype=np.int64)

    batch = BeatBatch(
        signals=np.zeros((3, 200), dtype=np.float32),
        labels=np.array(["N", "N", "N"]),
        record_ids=np.array(["test_rec", "test_rec", "test_rec"]),
        lead_names=np.array(["MLII", "MLII", "MLII"]),
        sample_indices=np.array([360, 720, 1080], dtype=np.int64),
        symbols=np.array(["N", "N", "N"]),
    )

    meta, causal_feats, bidi_feats = extractor.extract_timing_for_batch(batch)

    for i in range(1, 3):
        rr = causal_feats[i, 0]
        hr = causal_feats[i, 1]
        ratio = causal_feats[i, 3]
        dev = causal_feats[i, 4]

        # 1. HR_prev == 60 / RR_prev
        assert hr == pytest.approx(60.0 / rr, abs=1e-5)
        # 2. RR_dev_prev == RR_ratio_prev - 1
        assert dev == pytest.approx(ratio - 1.0, abs=1e-5)


def test_rr_never_crosses_record_boundaries():
    """Verify that consecutive beats in different records never calculate an RR interval between them."""
    fs = 360.0
    extractor = RRFeatureExtractor(fs=fs)

    # Two records: 'rec_A' and 'rec_B'
    extractor._record_beat_annotations_cache["rec_A"] = np.array([500, 900], dtype=np.int64)
    extractor._record_beat_annotations_cache["rec_B"] = np.array([200, 600], dtype=np.int64)

    # Batch where rec_B beat follows rec_A beat
    batch = BeatBatch(
        signals=np.zeros((4, 200), dtype=np.float32),
        labels=np.array(["N", "N", "V", "V"]),
        record_ids=np.array(["rec_A", "rec_A", "rec_B", "rec_B"]),
        lead_names=np.array(["MLII", "MLII", "MLII", "MLII"]),
        sample_indices=np.array([500, 900, 200, 600], dtype=np.int64),
        symbols=np.array(["N", "N", "V", "V"]),
    )

    meta, causal_feats, bidi_feats = extractor.extract_timing_for_batch(batch)

    # Index 2 is the FIRST beat of rec_B. It must NOT use sample 900 from rec_A!
    assert meta[2].record_id == "rec_B"
    assert meta[2].rr_prev_seconds is None  # Must be None, not (200 - 900)/360
    assert np.isnan(causal_feats[2, 0])

    # Index 3 is the second beat of rec_B -> (600 - 200) / 360 = 1.111 s
    assert meta[3].record_id == "rec_B"
    assert meta[3].rr_prev_seconds == pytest.approx(400.0 / 360.0, abs=1e-4)
    assert meta[3].prev_sample == 200


def test_metadata_and_provenance_preservation():
    """Verify BeatTimingMetadata preserves record_id, samples, symbols, and labels."""
    extractor = RRFeatureExtractor(fs=360.0)
    extractor._record_beat_annotations_cache["101"] = np.array([1000, 1400], dtype=np.int64)

    batch = BeatBatch(
        signals=np.zeros((2, 200), dtype=np.float32),
        labels=np.array(["N", "V"]),
        record_ids=np.array(["101", "101"]),
        lead_names=np.array(["MLII", "MLII"]),
        sample_indices=np.array([1000, 1400], dtype=np.int64),
        symbols=np.array(["N", "V"]),
    )

    meta, causal_feats, bidi_feats = extractor.extract_timing_for_batch(batch)
    assert len(meta) == 2
    assert meta[0].record_id == "101"
    assert meta[0].annotation_sample == 1000
    assert meta[0].class_label == "N"
    assert meta[1].record_id == "101"
    assert meta[1].annotation_sample == 1400
    assert meta[1].class_label == "V"
    assert meta[1].prev_sample == 1000
    assert meta[1].rr_prev_seconds == pytest.approx(400.0 / 360.0, abs=1e-4)


def test_first_last_edge_beat_handling():
    """Verify first beat has no previous RR, and last beat has no next RR."""
    extractor = RRFeatureExtractor(fs=360.0)
    extractor._record_beat_annotations_cache["101"] = np.array([100, 500, 900], dtype=np.int64)

    batch = BeatBatch(
        signals=np.zeros((3, 200), dtype=np.float32),
        labels=np.array(["N", "N", "N"]),
        record_ids=np.array(["101", "101", "101"]),
        lead_names=np.array(["MLII", "MLII", "MLII"]),
        sample_indices=np.array([100, 500, 900], dtype=np.int64),
        symbols=np.array(["N", "N", "N"]),
    )

    meta, causal_feats, bidi_feats = extractor.extract_timing_for_batch(batch)

    # Beat 0: first beat -> valid causal is False, valid bidi is False
    assert not meta[0].is_valid_causal
    assert not meta[0].is_valid_bidirectional
    assert meta[0].rr_prev_seconds is None
    assert meta[0].rr_next_seconds == pytest.approx(400.0 / 360.0, abs=1e-4)

    # Beat 1: middle beat -> valid causal is True, valid bidi is True
    assert meta[1].is_valid_causal
    assert meta[1].is_valid_bidirectional
    assert meta[1].rr_prev_seconds == pytest.approx(400.0 / 360.0, abs=1e-4)
    assert meta[1].rr_next_seconds == pytest.approx(400.0 / 360.0, abs=1e-4)

    # Beat 2: last beat -> valid causal is True, valid bidi is False
    assert meta[2].is_valid_causal
    assert not meta[2].is_valid_bidirectional
    assert meta[2].rr_prev_seconds == pytest.approx(400.0 / 360.0, abs=1e-4)
    assert meta[2].rr_next_seconds is None


def test_feature_dimensions_and_no_nan_in_clean_matrices():
    """Verify clean feature matrices have exact dimensions and zero NaN/Inf."""
    extractor = RRFeatureExtractor(fs=360.0)
    samples = np.arange(500, 500 + 15 * 300, 300, dtype=np.int64)
    extractor._record_beat_annotations_cache["101"] = samples
    n = len(samples)

    batch = BeatBatch(
        signals=np.random.randn(n, 200).astype(np.float32),
        labels=np.array(["N"] * n),
        record_ids=np.array(["101"] * n),
        lead_names=np.array(["MLII"] * n),
        sample_indices=samples,
        symbols=np.array(["N"] * n),
    )

    meta, causal_feats, bidi_feats = extractor.extract_timing_for_batch(batch)

    # Causal valid slice (excludes first beat)
    causal_mask = np.array([m.is_valid_causal for m in meta])
    assert np.sum(causal_mask) == n - 1
    clean_causal = causal_feats[causal_mask]
    assert clean_causal.shape == (n - 1, len(CAUSAL_FEATURE_NAMES))
    assert not np.isnan(clean_causal).any()
    assert not np.isinf(clean_causal).any()
    assert (clean_causal[:, 0] > 0).all()  # All RR > 0

    # Bidirectional valid slice (excludes first and last beat)
    bidi_mask = np.array([m.is_valid_bidirectional for m in meta])
    assert np.sum(bidi_mask) == n - 2
    clean_bidi = bidi_feats[bidi_mask]
    assert clean_bidi.shape == (n - 2, len(BIDIRECTIONAL_FEATURE_NAMES))
    assert not np.isnan(clean_bidi).any()
    assert not np.isinf(clean_bidi).any()


def test_training_only_standard_scaler_behavior():
    """Verify StandardScaler fits strictly on training data and transforms validation data without leakage."""
    np.random.seed(42)
    # Synthetic train with mean=10.0, std=2.0
    X_train = np.random.normal(loc=10.0, scale=2.0, size=(100, 5)).astype(np.float32)
    # Synthetic val with different distribution (e.g. mean=5.0, std=1.0)
    X_val = np.random.normal(loc=5.0, scale=1.0, size=(50, 5)).astype(np.float32)

    scaler = StandardScaler()
    scaler.fit(X_train)

    # Scaler mean must match X_train, NOT X_val or combined
    assert np.allclose(scaler.mean_, np.mean(X_train, axis=0), atol=1e-5)
    assert not np.allclose(scaler.mean_, np.mean(X_val, axis=0), atol=1e-2)

    # Transform validation using training-fitted scaler
    X_val_trans = scaler.transform(X_val)
    # Validation mean when transformed with training scaler will NOT be 0
    assert not np.allclose(np.mean(X_val_trans, axis=0), 0.0, atol=1e-2)


def test_prepare_phase6_datasets_leakage_safety():
    """Verify integration of Phase 6 dataset preparation with zero test leakage."""
    processed_dir = Path(__file__).resolve().parent.parent / "data" / "processed"
    npz_path = processed_dir / "mitbih_processed_beats.npz"
    manifest_path = processed_dir / "split_manifest.json"

    if not npz_path.is_file() or not manifest_path.is_file():
        pytest.skip("Dataset archive not found; skipping integration test.")

    loader = ECGDatasetLoader(npz_path=npz_path, manifest_path=manifest_path)
    data = prepare_phase6_datasets(loader, variant="causal")

    # 1. Feature dimensions
    assert data["X_train_morphology"].shape[1] == 200
    assert data["X_train_combined"].shape[1] == 200 + len(CAUSAL_FEATURE_NAMES)
    assert data["X_val_morphology"].shape[1] == 200
    assert data["X_val_combined"].shape[1] == 200 + len(CAUSAL_FEATURE_NAMES)

    # 2. Classes strictly N, S, V, F
    assert set(np.unique(data["y_train"])).issubset(set(AAMI_4_CLASSES))
    assert set(np.unique(data["y_val"])).issubset(set(AAMI_4_CLASSES))
    assert "Q" not in data["y_train"]
    assert "Q" not in data["y_val"]

    # 3. No NaN / Inf in features
    assert not np.isnan(data["X_train_combined"]).any()
    assert not np.isinf(data["X_train_combined"]).any()
    assert not np.isnan(data["X_val_combined"]).any()
    assert not np.isinf(data["X_val_combined"]).any()

    # 4. Excluded edge beats: only 16 train edge beats (1 per record) and 6 val edge beats
    assert data["train_stats"].excluded_edge_beats_causal == 16
    assert data["val_stats"].excluded_edge_beats_causal == 6
    assert len(data["X_train_combined"]) == 38061 - 16  # 38,045 usable causal beats
    assert len(data["X_val_combined"]) == 12930 - 6    # 12,924 usable causal beats
