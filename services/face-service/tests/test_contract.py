from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.main import health, require_service_key


def test_health_does_not_claim_liveness(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    monkeypatch.setenv("FACE_MODEL_DIR", str(tmp_path))
    response = health()
    assert response.status == "degraded"
    assert response.detectorModelPresent is False
    assert response.recognizerModelPresent is False
    assert response.livenessImplemented is False


def test_protected_endpoint_requires_configured_secret(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("FACE_SERVICE_SECRET", raising=False)
    with pytest.raises(HTTPException) as exc_info:
        require_service_key("anything")
    assert exc_info.value.status_code == 503


def test_protected_endpoint_rejects_wrong_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FACE_SERVICE_SECRET", "correct-secret-value")
    with pytest.raises(HTTPException) as exc_info:
        require_service_key("wrong-secret-value")
    assert exc_info.value.status_code == 401


def test_protected_endpoint_accepts_exact_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FACE_SERVICE_SECRET", "correct-secret-value")
    require_service_key("correct-secret-value")
