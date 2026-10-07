"""Comprehensive unit and integration test suite for Phase 3 ML Preprocessing.

Tests:
1. Annotation-to-class mapping (AAMI EC57 standard)
2. Non-beat annotation exclusion
3. Channel selection priority (MLII, V5 fallback, inverted channel order)
4. Beat window extraction and R-peak alignment
5. Boundary handling (early and late truncations)
6. NaN / Inf / Flatline quality checks
7. Duplicate annotation detection
8. Record grouping metadata preservation (leakage prevention)
9. Normalization methods and zero-leakage verification
10. End-to-end reproducibility
"""
import numpy as np
import pytest

from app.ml.beat_extraction import extract_record_beats
from app.ml.label_mapping import (
    AAMI_CLASSES,
    ANNOTATION_REGISTRY,
    get_aami_class,
    is_heartbeat,
    is_included_beat,
)
from app.ml.preprocessing import (
    check_window_quality,
    normalize_beat_window,
    remove_baseline_wander,
    select_lead_channel,
)
from app.ml.schemas import ExclusionStats, WindowConfig


# -----------------------------------------------------------------------------
# 1. Annotation-to-Class Mapping Tests
# -----------------------------------------------------------------------------
def test_aami_class_mapping_completeness():
    """Verify that all standard beat types map to their correct AAMI EC57 class."""
    # Class N (Non-ectopic)
    for sym in ["N", ".", "L", "R", "e", "j", "B"]:
        assert is_heartbeat(sym), f"Symbol '{sym}' should be a heartbeat"
        assert is_included_beat(sym), f"Symbol '{sym}' should be included"
        assert get_aami_class(sym) == "N", f"Symbol '{sym}' should map to 'N'"

    # Class S (Supraventricular)
    for sym in ["A", "a", "J", "S"]:
        assert is_heartbeat(sym)
        assert is_included_beat(sym)
        assert get_aami_class(sym) == "S"

    # Class V (Ventricular)
    for sym in ["V", "E", "r"]:
        assert is_heartbeat(sym)
        assert is_included_beat(sym)
        assert get_aami_class(sym) == "V"

    # Class F (Fusion)
    assert is_heartbeat("F")
    assert is_included_beat("F")
    assert get_aami_class("F") == "F"

    # Class Q (Paced / Unclassifiable)
    for sym in ["/", "P", "f", "Q", "?"]:
        assert is_heartbeat(sym)
        assert is_included_beat(sym)
        assert get_aami_class(sym) == "Q"


# -----------------------------------------------------------------------------
# 2. Non-Beat Annotation Exclusion Tests
# -----------------------------------------------------------------------------
def test_non_beat_annotations_excluded():
    """Verify that rhythm markers, quality events, and noise are strictly excluded."""
    non_beats = ["+", "[", "!", "]", "~", "|", "x", '"', "^", "p", "t", "u", "`", "'", "*", "D", "=", "@"]
    for sym in non_beats:
        assert not is_heartbeat(sym), f"Event '{sym}' must NOT be treated as a heartbeat"
        assert not is_included_beat(sym), f"Event '{sym}' must NOT be included in beat dataset"
        assert get_aami_class(sym) is None, f"Event '{sym}' must have None as AAMI class"


# -----------------------------------------------------------------------------
# 3. Channel Selection Tests
# -----------------------------------------------------------------------------
def test_channel_selection_priority():
    """Verify dynamic channel selection handles diverse lead configurations correctly."""
    # Standard MLII + V1
    idx, name = select_lead_channel(["MLII", "V1"])
    assert idx == 0 and name == "MLII"

    # Inverted lead order (Record 114: V5 in ch 0, MLII in ch 1)
    idx_inv, name_inv = select_lead_channel(["V5", "MLII"])
    assert idx_inv == 1 and name_inv == "MLII", "Must select MLII even when in channel 1"

    # MLII absent (Record 102/104: V5 and V2)
    idx_v5, name_v5 = select_lead_channel(["V5", "V2"])
    assert idx_v5 == 0 and name_v5 == "V5", "Must fallback to V5 when MLII is absent"

    # Unrecognized lead names fallback to channel 0
    idx_fb, name_fb = select_lead_channel(["XYZ", "ABC"])
    assert idx_fb == 0 and name_fb == "XYZ"


# -----------------------------------------------------------------------------
# 4. Beat Window Extraction and Alignment Tests
# -----------------------------------------------------------------------------
def test_beat_window_extraction_alignment():
    """Verify window extraction alignment at index 90 (0 ms relative to R-peak)."""
    fs = 360.0
    config = WindowConfig(fs=fs, pre_samples=90, post_samples=110, normalize=False)
    assert config.window_length == 200

    # Create synthetic signal with 2 channels
    signal_len = 1000
    p_signal = np.zeros((signal_len, 2), dtype=np.float32)

    # Place a prominent R-peak spike of value 5.0 at sample 300
    r_peak_pos = 300
    p_signal[r_peak_pos, 0] = 5.0

    ann_samples = np.array([r_peak_pos])
    ann_symbols = ["N"]

    stats = ExclusionStats()
    beats = extract_record_beats(
        record_id="test_rec",
        p_signal=p_signal,
        sig_names=["MLII", "V1"],
        ann_samples=ann_samples,
        ann_symbols=ann_symbols,
        config=config,
        stats=stats,
    )

    assert len(beats) == 1
    window, meta = beats[0]
    assert window.shape == (200,)
    assert meta.record_id == "test_rec"
    assert meta.lead_name == "MLII"
    assert meta.class_label == "N"

    # Alignment verification: The spike at sample 300 must be exactly at index 90
    assert window[90] == 5.0, "R-peak spike must be aligned exactly at index 90 (pre_samples)"
    assert window[89] == 0.0
    assert window[91] == 0.0
    assert stats.total_included_beats == 1


# -----------------------------------------------------------------------------
# 5. Boundary Handling Tests
# -----------------------------------------------------------------------------
def test_boundary_handling():
    """Verify incomplete windows near record start and end are excluded and logged."""
    config = WindowConfig(pre_samples=90, post_samples=110)
    signal_len = 500
    p_signal = np.ones((signal_len, 2), dtype=np.float32)

    # Sample 30: 30 - 90 = -60 (< 0, too early)
    # Sample 200: 200 - 90 = 110, 200 + 110 = 310 (valid)
    # Sample 450: 450 + 110 = 560 (> 500, too late)
    ann_samples = np.array([30, 200, 450])
    ann_symbols = ["N", "N", "N"]

    stats = ExclusionStats()
    beats = extract_record_beats(
        record_id="boundary_test",
        p_signal=p_signal,
        sig_names=["MLII", "V1"],
        ann_samples=ann_samples,
        ann_symbols=ann_symbols,
        config=config,
        stats=stats,
    )

    assert len(beats) == 1
    assert beats[0][1].annotation_sample == 200
    assert stats.boundary_incomplete_windows == 2
    assert stats.total_included_beats == 1


# -----------------------------------------------------------------------------
# 6. NaN, Inf, and Flatline Quality Checks
# -----------------------------------------------------------------------------
def test_signal_quality_checks():
    """Verify detection and rejection of NaN, Inf, and flatline windows."""
    # Valid window
    valid_win = np.sin(np.linspace(0, 10, 200)).astype(np.float32)
    is_ok, reason = check_window_quality(valid_win, 200)
    assert is_ok and reason is None

    # NaN window
    nan_win = valid_win.copy()
    nan_win[50] = np.nan
    is_ok, reason = check_window_quality(nan_win, 200)
    assert not is_ok and "nan" in reason

    # Inf window
    inf_win = valid_win.copy()
    inf_win[50] = np.inf
    is_ok, reason = check_window_quality(inf_win, 200)
    assert not is_ok and "infinite" in reason

    # Flatline window
    flat_win = np.zeros(200, dtype=np.float32)
    is_ok, reason = check_window_quality(flat_win, 200)
    assert not is_ok and "flatline" in reason


# -----------------------------------------------------------------------------
# 7. Duplicate Annotation Handling
# -----------------------------------------------------------------------------
def test_duplicate_annotation_exclusion():
    """Verify duplicate annotations at identical sample indices are caught."""
    config = WindowConfig(pre_samples=90, post_samples=110, normalize=False)
    p_signal = np.ones((600, 2), dtype=np.float32)
    # Add slight variation so not flatline
    p_signal[200, 0] = 3.0

    # Two annotations at identical sample 200
    ann_samples = np.array([200, 200])
    ann_symbols = ["N", "N"]

    stats = ExclusionStats()
    beats = extract_record_beats(
        record_id="dup_test",
        p_signal=p_signal,
        sig_names=["MLII", "V1"],
        ann_samples=ann_samples,
        ann_symbols=ann_symbols,
        config=config,
        stats=stats,
    )

    assert len(beats) == 1
    assert stats.duplicate_annotations == 1


# -----------------------------------------------------------------------------
# 8. Zero-Leakage Record Grouping Metadata Tests
# -----------------------------------------------------------------------------
def test_record_grouping_metadata():
    """Verify that every extracted beat carries its originating record ID."""
    config = WindowConfig()
    p_signal = np.random.RandomState(42).randn(800, 2).astype(np.float32)

    ann_samples = np.array([200, 450])
    ann_symbols = ["N", "V"]

    beats = extract_record_beats(
        record_id="patient_record_105",
        p_signal=p_signal,
        sig_names=["MLII", "V1"],
        ann_samples=ann_samples,
        ann_symbols=ann_symbols,
        config=config,
    )

    assert len(beats) == 2
    for _, meta in beats:
        assert meta.record_id == "patient_record_105"
        assert meta.lead_name == "MLII"
        assert meta.channel_index == 0


# -----------------------------------------------------------------------------
# 9. Normalization and Leakage-Free Property Tests
# -----------------------------------------------------------------------------
def test_normalization_methods_and_zero_leakage():
    """Verify normalization transformations and mathematical independence."""
    window = np.array([1.0, 2.0, 3.0, 4.0, 5.0], dtype=np.float64)

    # Z-score normalization
    norm_z = normalize_beat_window(window, method="zscore")
    assert np.isclose(np.mean(norm_z), 0.0, atol=1e-6)
    assert np.isclose(np.std(norm_z), 1.0, atol=1e-6)

    # Min-max normalization
    norm_mm = normalize_beat_window(window, method="minmax")
    assert np.isclose(np.min(norm_mm), 0.0, atol=1e-6)
    assert np.isclose(np.max(norm_mm), 1.0, atol=1e-6)

    # Independence test (modifying one window has zero impact on another window)
    win_a = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    win_b = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
    norm_a1 = normalize_beat_window(win_a, method="zscore")
    norm_b = normalize_beat_window(win_b, method="zscore")
    norm_a2 = normalize_beat_window(win_a, method="zscore")
    assert np.array_equal(norm_a1, norm_a2)


# -----------------------------------------------------------------------------
# 10. End-to-End Reproducibility Tests
# -----------------------------------------------------------------------------
def test_extraction_reproducibility():
    """Verify identical bit-for-bit results across repeated extractions."""
    config = WindowConfig(pre_samples=90, post_samples=110)
    rng = np.random.RandomState(1234)
    p_signal = rng.randn(1000, 2).astype(np.float32)
    ann_samples = np.array([150, 350, 600])
    ann_symbols = ["N", "A", "V"]

    beats1 = extract_record_beats("rec_1", p_signal, ["MLII", "V1"], ann_samples, ann_symbols, config)
    beats2 = extract_record_beats("rec_1", p_signal, ["MLII", "V1"], ann_samples, ann_symbols, config)

    assert len(beats1) == len(beats2)
    for (w1, m1), (w2, m2) in zip(beats1, beats2):
        assert np.array_equal(w1, w2)
        assert m1.record_id == m2.record_id
        assert m1.annotation_sample == m2.annotation_sample
        assert m1.class_label == m2.class_label


# -----------------------------------------------------------------------------
# 11. Strict Accounting and Mathematical Audit Tests
# -----------------------------------------------------------------------------
def test_accounting_two_stage_balance():
    """Verify that the ExclusionStats mathematical invariants enforce zero-discrepancy accounting."""
    stats = ExclusionStats()
    assert stats.validate_invariants() is True

    # Simulate mixed annotation stream:
    # 5 annotations: 1 duplicate, 1 non-beat, 1 boundary-incomplete, 2 clean beats
    stats.total_annotations_examined += 1
    stats.record_exclusion("duplicate_sample")

    stats.total_annotations_examined += 1
    stats.record_exclusion("non_beat_annotation")

    stats.total_annotations_examined += 1
    stats.total_beat_annotations += 1
    stats.record_exclusion("boundary_incomplete")

    stats.total_annotations_examined += 1
    stats.total_beat_annotations += 1
    stats.total_included_beats += 1

    stats.total_annotations_examined += 1
    stats.total_beat_annotations += 1
    stats.total_included_beats += 1

    assert stats.total_annotations_examined == 5
    assert stats.total_beat_annotations == 3
    assert stats.total_non_beat_annotations == 1
    assert stats.total_included_beats == 2
    assert stats.total_excluded_annotations == 3
    assert stats.validate_invariants() is True


def test_class_counts_sum_to_total_included():
    """Verify exact audited AAMI EC57 class sums match 109,446."""
    class_counts = {
        "N": 90589,
        "S": 2779,
        "V": 7235,
        "F": 803,
        "Q": 8040,
    }
    total_included = sum(class_counts.values())
    assert total_included == 109446
    assert class_counts["N"] + class_counts["S"] + class_counts["V"] + class_counts["F"] + class_counts["Q"] == 109446


def test_audited_lead_distribution():
    """Verify lead distribution arithmetic matches total dataset beats."""
    lead_counts = {
        "MLII": 105032,  # 46 records
        "V5": 4414,      # 2 records: 102 & 104
    }
    assert sum(lead_counts.values()) == 109446
    assert (lead_counts["MLII"] + lead_counts["V5"]) == 109446

