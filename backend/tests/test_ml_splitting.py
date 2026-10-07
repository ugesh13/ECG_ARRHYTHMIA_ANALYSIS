"""Unit and Integration Tests for Phase 4 Record-Level Splitting & Experiment Framework."""
from collections import Counter
import json
from pathlib import Path
import pytest
import numpy as np

from app.ml.class_weights import compute_balanced_class_weights, get_sample_weights
from app.ml.data_loader import BeatBatch, ECGDatasetLoader
from app.ml.splitter import (
    AAMI_DS1_RECORDS,
    AAMI_DS2_RECORDS,
    AAMI_PACED_RECORDS,
    ALL_48_MITBIH_RECORDS,
    SplitManifest,
    create_record_split,
    load_split_manifest,
    save_split_manifest,
    validate_record_split,
)


def test_all_48_records_inventory_completeness():
    """Verify that all 48 canonical MIT-BIH records are tracked with zero omissions."""
    assert len(ALL_48_MITBIH_RECORDS) == 48
    assert len(AAMI_DS1_RECORDS) == 22
    assert len(AAMI_DS2_RECORDS) == 22
    assert len(AAMI_PACED_RECORDS) == 4

    ds1_set = set(AAMI_DS1_RECORDS)
    ds2_set = set(AAMI_DS2_RECORDS)
    paced_set = set(AAMI_PACED_RECORDS)

    assert ds1_set.isdisjoint(ds2_set)
    assert ds1_set.isdisjoint(paced_set)
    assert ds2_set.isdisjoint(paced_set)
    assert (ds1_set | ds2_set | paced_set) == set(ALL_48_MITBIH_RECORDS)


def test_create_record_split_default_seed_42():
    """Verify default record split creation with seed 42."""
    manifest = create_record_split(strategy="aami_ds1_ds2", random_seed=42, val_num_records=6)

    assert len(manifest.train_records) == 16
    assert len(manifest.validation_records) == 6
    assert len(manifest.test_records) == 22
    assert len(manifest.excluded_records) == 4

    # Mathematical disjointness
    train_s = set(manifest.train_records)
    val_s = set(manifest.validation_records)
    test_s = set(manifest.test_records)
    excl_s = set(manifest.excluded_records)

    assert train_s.isdisjoint(val_s)
    assert train_s.isdisjoint(test_s)
    assert val_s.isdisjoint(test_s)
    assert (train_s | val_s | test_s).isdisjoint(excl_s)
    assert (train_s | val_s | test_s | excl_s) == set(ALL_48_MITBIH_RECORDS)

    is_valid, errors = validate_record_split(manifest)
    assert is_valid is True
    assert len(errors) == 0


def test_split_determinism_and_seed_sensitivity():
    """Verify identical manifest with same seed and distinct partition with different seed."""
    manifest_a = create_record_split(strategy="aami_ds1_ds2", random_seed=42, val_num_records=6)
    manifest_b = create_record_split(strategy="aami_ds1_ds2", random_seed=42, val_num_records=6)
    assert manifest_a.train_records == manifest_b.train_records
    assert manifest_a.validation_records == manifest_b.validation_records

    # Different seed must change the train/val assignment from DS1
    manifest_c = create_record_split(strategy="aami_ds1_ds2", random_seed=999, val_num_records=6)
    assert manifest_c.validation_records != manifest_a.validation_records
    assert manifest_c.test_records == manifest_a.test_records  # DS2 test set remains constant


def test_split_manifest_serialization_roundtrip(tmp_path: Path):
    """Verify JSON save and reload maintains strict bit-for-bit equivalence."""
    manifest = create_record_split(strategy="aami_ds1_ds2", random_seed=42, val_num_records=6)
    manifest_file = tmp_path / "test_split_manifest.json"

    save_split_manifest(manifest, manifest_file)
    reloaded = load_split_manifest(manifest_file)

    assert reloaded.random_seed == manifest.random_seed
    assert reloaded.strategy == manifest.strategy
    assert reloaded.train_records == manifest.train_records
    assert reloaded.validation_records == manifest.validation_records
    assert reloaded.test_records == manifest.test_records
    assert reloaded.excluded_records == manifest.excluded_records


def test_leakage_detector_catches_overlapping_records():
    """Verify that validate_record_split detects record contamination across splits."""
    bad_manifest = SplitManifest(
        random_seed=42,
        strategy="aami_ds1_ds2",
        train_records=["101", "106", "108"],
        validation_records=["108", "109"],  # 108 is in BOTH train and val!
        test_records=["100", "103"],
        excluded_records=["102"],
    )

    is_valid, errors = validate_record_split(bad_manifest)
    assert is_valid is False
    assert any("Train ∩ Val != ∅" in err for err in errors)


def test_balanced_class_weights_strictly_train_only():
    """Verify class weights calculation adheres to balanced formula on training labels."""
    # Synthetic training distribution: 100 N, 10 V, 2 S
    # Total = 112, 3 classes
    # Expected w_N = 112 / (3 * 100) = 0.3733
    # Expected w_V = 112 / (3 * 10) = 3.7333
    # Expected w_S = 112 / (3 * 2) = 18.6667
    train_labels = ["N"] * 100 + ["V"] * 10 + ["S"] * 2
    weights = compute_balanced_class_weights(train_labels, classes=["N", "S", "V"])

    assert np.isclose(weights["N"], 112 / (3 * 100), atol=1e-4)
    assert np.isclose(weights["V"], 112 / (3 * 10), atol=1e-4)
    assert np.isclose(weights["S"], 112 / (3 * 2), atol=1e-4)

    # Sample weight mapping
    sample_weights = get_sample_weights(["N", "V", "S"], weights)
    assert len(sample_weights) == 3
    assert np.isclose(sample_weights[0], weights["N"])
    assert np.isclose(sample_weights[1], weights["V"])
    assert np.isclose(sample_weights[2], weights["S"])


def test_data_loader_slice_isolation_and_provenance():
    """Verify BeatBatch and data loader slicing isolates records with metadata intact."""
    # Mock data arrays
    N = 10
    signals = np.random.randn(N, 200).astype(np.float32)
    labels = np.array(["N", "N", "V", "S", "N", "F", "Q", "N", "V", "N"])
    record_ids = np.array(["101", "101", "101", "106", "106", "100", "100", "102", "102", "102"])
    lead_names = np.array(["MLII"] * 8 + ["V5", "V5"])
    sample_indices = np.arange(100, 1100, 100, dtype=np.int64)
    symbols = labels.copy()

    batch = BeatBatch(
        signals=signals,
        labels=labels,
        record_ids=record_ids,
        lead_names=lead_names,
        sample_indices=sample_indices,
        symbols=symbols,
    )

    assert len(batch) == 10
    assert batch.get_records() == ["100", "101", "102", "106"]

    counts = batch.get_class_counts()
    assert counts["N"] == 5
    assert counts["V"] == 2
    assert counts["S"] == 1
    assert counts["F"] == 1
    assert counts["Q"] == 1


def test_record_inventory_and_split_sums_reconciliation():
    """Verify that record_inventory.json and split_manifest.json reconcile with exact audited totals."""
    inventory_path = Path(__file__).resolve().parent.parent / "data" / "processed" / "record_inventory.json"
    manifest_path = Path(__file__).resolve().parent.parent / "data" / "processed" / "split_manifest.json"

    assert inventory_path.is_file(), f"Missing {inventory_path}"
    assert manifest_path.is_file(), f"Missing {manifest_path}"

    with open(inventory_path, "r", encoding="utf-8") as f:
        inventory = json.load(f)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)

    records = inventory["records"]
    assert len(records) == 48

    train_recs = manifest_data["train_records"]
    val_recs = manifest_data["validation_records"]
    test_recs = manifest_data["test_records"]
    excl_recs = manifest_data["excluded_records"]

    # Sum counts per split
    def sum_split(rec_list):
        total = 0
        classes = {"N": 0, "S": 0, "V": 0, "F": 0, "Q": 0}
        for rid in rec_list:
            rec = records[rid]
            total += rec["total_beats"]
            for c in classes:
                classes[c] += rec["class_counts"][c]
        return total, classes

    train_beats, train_classes = sum_split(train_recs)
    val_beats, val_classes = sum_split(val_recs)
    test_beats, test_classes = sum_split(test_recs)
    excl_beats, excl_classes = sum_split(excl_recs)

    # Split beats verification
    assert train_beats == 38069
    assert val_beats == 12930
    assert test_beats == 49690
    assert excl_beats == 8757
    assert (train_beats + val_beats + test_beats + excl_beats) == 109446

    # Class totals verification across all 48 records
    total_N = train_classes["N"] + val_classes["N"] + test_classes["N"] + excl_classes["N"]
    total_S = train_classes["S"] + val_classes["S"] + test_classes["S"] + excl_classes["S"]
    total_V = train_classes["V"] + val_classes["V"] + test_classes["V"] + excl_classes["V"]
    total_F = train_classes["F"] + val_classes["F"] + test_classes["F"] + excl_classes["F"]
    total_Q = train_classes["Q"] + val_classes["Q"] + test_classes["Q"] + excl_classes["Q"]

    assert total_N == 90589
    assert total_S == 2779
    assert total_V == 7235
    assert total_F == 803
    assert total_Q == 8040
    assert (total_N + total_S + total_V + total_F + total_Q) == 109446


def test_q_class_exact_accounting_invariants():
    """Verify factual accounting invariants for Class Q and paced records."""
    manifest_path = Path(__file__).resolve().parent.parent / "data" / "processed" / "split_manifest.json"
    inventory_path = Path(__file__).resolve().parent.parent / "data" / "processed" / "record_inventory.json"

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    with open(inventory_path, "r", encoding="utf-8") as f:
        inventory = json.load(f)

    records = inventory["records"]

    # 1. Every record has complete class accounting (N, S, V, F, Q)
    for rid, rec in records.items():
        assert "class_counts" in rec
        assert set(rec["class_counts"].keys()) == {"N", "S", "V", "F", "Q"}
        # 2. N+S+V+F+Q = total for every record
        assert sum(rec["class_counts"].values()) == rec["total_beats"]

    # 3. All 48 records reconcile to 109,446
    assert len(records) == 48
    assert sum(rec["total_beats"] for rec in records.values()) == 109446

    # 4. Paced records assertion
    assert sorted(manifest["excluded_records"]) == ["102", "104", "107", "217"]

    # 5. Q counts per split
    q_counts = {rid: rec["class_counts"]["Q"] for rid, rec in records.items()}
    assert sum(q_counts.values()) == 8040

    q_train = sum(q_counts[rid] for rid in manifest["train_records"])
    q_val = sum(q_counts[rid] for rid in manifest["validation_records"])
    q_test = sum(q_counts[rid] for rid in manifest["test_records"])
    q_paced = sum(q_counts[rid] for rid in manifest["excluded_records"])

    assert q_train == 8    # Records 101 (2), 203 (4), 208 (2)
    assert q_val == 0      # Records 108, 114, 118, 201, 209, 220
    assert q_test == 7     # Records 105 (5), 214 (2)
    assert q_paced == 8025 # Records 102 (2084), 104 (2064), 107 (2077), 217 (1800)
    assert (q_train + q_val + q_test + q_paced) == 8040

    # 6. Primary 44-record aggregate reconciles to exactly 100,689 beats
    primary_records = manifest["train_records"] + manifest["validation_records"] + manifest["test_records"]
    assert len(primary_records) == 44
    primary_total_beats = sum(records[rid]["total_beats"] for rid in primary_records)
    assert primary_total_beats == 100689

    # 7. Four-class N+S+V+F aggregate is exact (100,674 beats)
    primary_non_q = sum(
        records[rid]["class_counts"]["N"]
        + records[rid]["class_counts"]["S"]
        + records[rid]["class_counts"]["V"]
        + records[rid]["class_counts"]["F"]
        for rid in primary_records
    )
    assert primary_non_q == 100674
    assert (primary_non_q + (q_train + q_val + q_test)) == primary_total_beats

    # 8. Paced aggregate reconciles to exactly 8,757 beats
    paced_total_beats = sum(records[rid]["total_beats"] for rid in manifest["excluded_records"])
    assert paced_total_beats == 8757
    assert (primary_total_beats + paced_total_beats) == 109446

    # 9. No split overlap (zero record leakage)
    train_s = set(manifest["train_records"])
    val_s = set(manifest["validation_records"])
    test_s = set(manifest["test_records"])
    paced_s = set(manifest["excluded_records"])

    assert train_s.isdisjoint(val_s)
    assert train_s.isdisjoint(test_s)
    assert val_s.isdisjoint(test_s)
    assert (train_s | val_s | test_s).isdisjoint(paced_s)
    assert (train_s | val_s | test_s | paced_s) == set(records.keys())


