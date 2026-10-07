"""Focused dataset verification tests for Phase 2.

Verifies that the WFDB backend dynamically and correctly interacts with the
complete MIT-BIH Arrhythmia Database (48 records).
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import ecg_service

client = TestClient(app)


def test_health():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_record_discovery_complete_dataset():
    resp = client.get("/api/ecg/records")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 48

    record_map = {r["record_id"]: r for r in data["records"]}
    expected_sample = ["100", "101", "102", "104", "114", "124", "200", "207", "234"]
    for rid in expected_sample:
        assert rid in record_map, f"Record {rid} missing from discovery"
        assert record_map[rid]["source"] == "mitbih"
        assert record_map[rid]["has_annotations"] is True


@pytest.mark.parametrize("record_id, expected_leads", [
    ("100", ["MLII", "V5"]),
    ("102", ["V5", "V2"]),    # No MLII lead
    ("114", ["V5", "MLII"]),  # Inverted order: V5 is ch0, MLII is ch1
    ("124", ["MLII", "V4"]),  # V4 lead
    ("207", ["MLII", "V1"]),  # High-complexity ventricular record
])
def test_metadata_dynamic_loading(record_id, expected_leads):
    resp = client.get(f"/api/ecg/{record_id}/metadata")
    assert resp.status_code == 200
    meta = resp.json()
    assert meta["record_id"] == record_id
    assert meta["sampling_frequency"] == 360.0
    assert meta["n_channels"] == 2
    assert meta["n_samples"] == 650000
    assert meta["duration_seconds"] == pytest.approx(1805.556, rel=1e-3)
    assert meta["channel_names"] == expected_leads
    assert meta["has_annotations"] is True


def test_signal_loading_and_windowing():
    # 10s window on record 100 with max_points=200
    resp = client.get("/api/ecg/100/signal?start_s=0&end_s=10&max_points=200")
    assert resp.status_code == 200
    data = resp.json()
    assert data["record_id"] == "100"
    assert data["sampling_frequency"] == 360.0
    assert data["start_sample"] == 0
    assert data["end_sample"] == 3600
    assert len(data["time"]) == data["n_points"]
    assert data["n_points"] <= 200
    assert len(data["channels"]) == 2
    assert data["channels"][0]["name"] == "MLII"
    assert data["channels"][1]["name"] == "V5"
    assert len(data["channels"][0]["values"]) == data["n_points"]


def test_signal_channel_filtering():
    # Channel 0 only
    resp0 = client.get("/api/ecg/114/signal?start_s=0&end_s=5&channels=0")
    assert resp0.status_code == 200
    data0 = resp0.json()
    assert len(data0["channels"]) == 1
    assert data0["channels"][0]["name"] == "V5"

    # Channel 1 only
    resp1 = client.get("/api/ecg/114/signal?start_s=0&end_s=5&channels=1")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert len(data1["channels"]) == 1
    assert data1["channels"][0]["name"] == "MLII"


def test_annotation_loading_diverse_symbols():
    # Record 102 contains paced beats ('/')
    resp_102 = client.get("/api/ecg/102/annotations")
    assert resp_102.status_code == 200
    data_102 = resp_102.json()
    assert data_102["available"] is True
    assert data_102["total"] > 0
    assert "/" in data_102["symbol_counts"]

    # Record 109 contains LBBB beats ('L')
    resp_109 = client.get("/api/ecg/109/annotations")
    assert resp_109.status_code == 200
    data_109 = resp_109.json()
    assert "L" in data_109["symbol_counts"]

    # Record 207 contains ventricular flutter waves ('!')
    resp_207 = client.get("/api/ecg/207/annotations")
    assert resp_207.status_code == 200
    data_207 = resp_207.json()
    assert "!" in data_207["symbol_counts"]


def test_invalid_and_missing_record_handling():
    # Non-existent record
    assert client.get("/api/ecg/999/metadata").status_code == 404

    # Path traversal attack
    assert client.get("/api/ecg/..%2F..%2Fetc/metadata").status_code in (400, 404)

    # Inverted time range
    assert client.get("/api/ecg/100/signal?start_s=50&end_s=10").status_code == 400

    # Inverted annotation range
    assert client.get("/api/ecg/100/annotations?start_s=50&end_s=10").status_code == 400

    # Non-existent channel index
    assert client.get("/api/ecg/100/signal?channels=99").status_code == 400


def test_analysis_endpoint_not_connected():
    resp = client.post("/api/analysis/100")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "model_not_loaded"
    assert "not connected" in body["message"].lower()
    assert "predictions" not in body
