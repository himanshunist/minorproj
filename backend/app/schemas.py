"""Pydantic request/response contracts."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .ml.features import FEATURE_DESCRIPTIONS


class TrafficRecord(BaseModel):
    """One KDD Cup 1999 connection record (all 41 predictors required)."""

    model_config = ConfigDict(extra="forbid")

    duration: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["duration"])
    protocol_type: str = Field(..., min_length=1, description=FEATURE_DESCRIPTIONS["protocol_type"])
    service: str = Field(..., min_length=1, description=FEATURE_DESCRIPTIONS["service"])
    flag: str = Field(..., min_length=1, description=FEATURE_DESCRIPTIONS["flag"])
    src_bytes: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["src_bytes"])
    dst_bytes: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["dst_bytes"])
    land: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["land"])
    wrong_fragment: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["wrong_fragment"])
    urgent: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["urgent"])
    hot: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["hot"])
    num_failed_logins: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["num_failed_logins"])
    logged_in: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["logged_in"])
    num_compromised: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["num_compromised"])
    root_shell: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["root_shell"])
    su_attempted: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["su_attempted"])
    num_root: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["num_root"])
    num_file_creations: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["num_file_creations"])
    num_shells: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["num_shells"])
    num_access_files: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["num_access_files"])
    num_outbound_cmds: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["num_outbound_cmds"])
    is_host_login: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["is_host_login"])
    is_guest_login: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["is_guest_login"])
    count: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["count"])
    srv_count: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["srv_count"])
    serror_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["serror_rate"])
    srv_serror_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["srv_serror_rate"])
    rerror_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["rerror_rate"])
    srv_rerror_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["srv_rerror_rate"])
    same_srv_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["same_srv_rate"])
    diff_srv_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["diff_srv_rate"])
    srv_diff_host_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["srv_diff_host_rate"])
    dst_host_count: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["dst_host_count"])
    dst_host_srv_count: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["dst_host_srv_count"])
    dst_host_same_srv_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["dst_host_same_srv_rate"])
    dst_host_diff_srv_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["dst_host_diff_srv_rate"])
    dst_host_same_src_port_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["dst_host_same_src_port_rate"])
    dst_host_srv_diff_host_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["dst_host_srv_diff_host_rate"])
    dst_host_serror_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["dst_host_serror_rate"])
    dst_host_srv_serror_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["dst_host_srv_serror_rate"])
    dst_host_rerror_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["dst_host_rerror_rate"])
    dst_host_srv_rerror_rate: float = Field(..., ge=0, description=FEATURE_DESCRIPTIONS["dst_host_srv_rerror_rate"])


class BatchRequest(BaseModel):
    records: list[dict[str, Any]] = Field(..., min_length=1)


class VoteDetail(BaseModel):
    label: int
    prediction: str
    confidence: float


class PredictionResult(BaseModel):
    index: int
    prediction: str
    label: int
    confidence: float
    confidence_type: str
    votes: dict[str, VoteDetail]
    model_version: str


class PredictResponse(PredictionResult):
    pass


class BatchResponse(BaseModel):
    count: int
    source: str
    results: list[PredictionResult]


class HealthResponse(BaseModel):
    status: str
    api: str
    version: str
    model_ready: bool
    model_version: str | None = None
    error: str | None = None
    timestamp: str
