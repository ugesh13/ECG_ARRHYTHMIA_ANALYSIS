"""Minimal smoke tests. Dataset-dependent tests are skipped when no records are present."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import ecg_service

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "healthy"


def test_invalid_record_id_and_missing_record():
    assert client.get("/api/ecg/..%2Fx/metadata").status_code in (400, 404)
    assert client.get("/api/ecg/does_not_exist/metadata").status_code == 404


def test_upload_rejects_bad_extension():
    r = client.post("/api/upload", files=[("files", ("evil.exe", b"x", "application/octet-stream"))])
    assert r.status_code == 400


@pytest.mark.skipif(not ecg_service.discover_records(False), reason="no MIT-BIH records present")
def test_first_record_endpoints():
    rid = ecg_service.discover_records(False)[0]["record_id"]
    assert client.get(f"/api/ecg/{rid}/metadata").status_code == 200
    assert client.get(f"/api/ecg/{rid}/signal?end_s=5").status_code == 200
    assert client.get(f"/api/ecg/{rid}/annotations").status_code == 200
    res = client.post(f"/api/analysis/{rid}").json()
    assert res["status"] in ("completed", "model_not_loaded")

