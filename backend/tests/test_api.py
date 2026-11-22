"""Smoke tests for the API. Run from the backend directory: pytest -q."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

SAMPLE_CSV = Path(__file__).resolve().parents[2] / "frontend" / "public" / "sample_records.csv"

VALID_RECORD = {
    "duration": 0, "protocol_type": "tcp", "service": "http", "flag": "SF",
    "src_bytes": 181, "dst_bytes": 5450, "land": 0, "wrong_fragment": 0,
    "urgent": 0, "hot": 0, "num_failed_logins": 0, "logged_in": 1,
    "num_compromised": 0, "root_shell": 0, "su_attempted": 0, "num_root": 0,
    "num_file_creations": 0, "num_shells": 0, "num_access_files": 0,
    "num_outbound_cmds": 0, "is_host_login": 0, "is_guest_login": 0,
    "count": 8, "srv_count": 8, "serror_rate": 0, "srv_serror_rate": 0,
    "rerror_rate": 0, "srv_rerror_rate": 0, "same_srv_rate": 1,
    "diff_srv_rate": 0, "srv_diff_host_rate": 0, "dst_host_count": 9,
    "dst_host_srv_count": 9, "dst_host_same_srv_rate": 1,
    "dst_host_diff_srv_rate": 0, "dst_host_same_src_port_rate": 0.11,
    "dst_host_srv_diff_host_rate": 0, "dst_host_serror_rate": 0,
    "dst_host_srv_serror_rate": 0, "dst_host_rerror_rate": 0,
    "dst_host_srv_rerror_rate": 0,
}


def test_health_and_model_info():
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["model_ready"] is True

        info = client.get("/model-info")
        assert info.status_code == 200
        assert len(info.json()["features"]) == 41
        assert set(info.json()["categorical_values"]) == {"protocol_type", "service", "flag"}


def test_single_prediction():
    with TestClient(app) as client:
        response = client.post("/predict", json=VALID_RECORD)
        assert response.status_code == 200
        body = response.json()
        assert body["prediction"] in {"NORMAL", "ATTACK"}
        assert body["label"] in {0, 1}
        assert set(body["votes"]) == {"gaussian_naive_bayes", "decision_tree", "xgboost"}
        assert 0 <= body["confidence"] <= 1


def test_invalid_input_returns_422():
    with TestClient(app) as client:
        invalid = dict(VALID_RECORD)
        invalid["src_bytes"] = -5
        response = client.post("/predict", json=invalid)
        assert response.status_code == 422


def test_csv_batch_and_download_contract():
    with TestClient(app) as client:
        with SAMPLE_CSV.open("rb") as handle:
            response = client.post("/predict-batch", files={"file": ("sample_records.csv", handle, "text/csv")})
        assert response.status_code == 200
        body = response.json()
        assert body["count"] == 2
        assert len(body["results"]) == 2
        assert body["results"][0]["prediction"] in {"NORMAL", "ATTACK"}


def test_csv_missing_column_returns_422():
    with TestClient(app) as client:
        response = client.post(
            "/predict-batch",
            files={"file": ("bad.csv", b"duration,protocol_type\n0,tcp\n", "text/csv")},
        )
        assert response.status_code == 422
        assert "missing_columns" in response.json()["detail"]
