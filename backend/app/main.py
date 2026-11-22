"""FastAPI service exposing the original KDD Cup 1999 IDS ensemble."""

from __future__ import annotations

import io
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config
from .ml.features import FEATURES, TARGET_COLUMN
from .ml.pipeline import ArtifactError, IDSPipeline, ValidationError
from .schemas import (
    BatchResponse,
    HealthResponse,
    PredictResponse,
    TrafficRecord,
)

logging.basicConfig(level=config.LOG_LEVEL)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.pipeline = IDSPipeline.load(config.MODEL_DIR)
        app.state.startup_error = None
        logger.info("Model artifacts loaded from %s", config.MODEL_DIR)
    except Exception as exc:
        app.state.pipeline = None
        app.state.startup_error = str(exc)
        logger.error("Model artifacts could not be loaded: %s", exc)
    yield


app = FastAPI(
    title=config.APP_NAME,
    version=config.APP_VERSION,
    description=(
        "Prediction API for the Gaussian NB + Decision Tree + XGBoost majority-vote "
        "intrusion detector from the original IDS.ipynb notebook."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {
                    "field": ".".join(str(part) for part in error["loc"][1:]),
                    "message": error["msg"],
                    "type": error["type"],
                }
                for error in exc.errors()
            ]
        },
    )


def _pipeline(request: Request) -> IDSPipeline:
    pipeline: IDSPipeline | None = getattr(request.app.state, "pipeline", None)
    if pipeline is None:
        detail = getattr(request.app.state, "startup_error", "Model artifacts are not loaded.")
        raise HTTPException(status_code=503, detail=detail)
    return pipeline


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/", include_in_schema=False)
def root() -> dict[str, Any]:
    return {
        "name": config.APP_NAME,
        "version": config.APP_VERSION,
        "endpoints": ["/health", "/model-info", "/predict", "/predict-batch"],
        "docs": "/docs",
    }


@app.get("/health", response_model=HealthResponse)
def health(request: Request) -> dict[str, Any]:
    pipeline: IDSPipeline | None = getattr(request.app.state, "pipeline", None)
    error: str | None = getattr(request.app.state, "startup_error", None)
    ready = pipeline is not None
    return {
        "status": "ok" if ready else "unavailable",
        "api": config.APP_NAME,
        "version": config.APP_VERSION,
        "model_ready": ready,
        "model_version": pipeline.version if pipeline else None,
        "error": error,
        "timestamp": _timestamp(),
    }


@app.get("/model-info")
def model_info(request: Request) -> dict[str, Any]:
    pipeline = _pipeline(request)
    info = pipeline.get_model_info()
    info["max_batch_rows"] = config.MAX_BATCH_ROWS
    return info


@app.post("/predict", response_model=PredictResponse)
def predict(request: Request, record: TrafficRecord) -> dict[str, Any]:
    pipeline = _pipeline(request)
    try:
        return pipeline.predict_records([record.model_dump()])[0]
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ArtifactError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Single prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


async def _parse_batch(request: Request) -> tuple[list[dict[str, Any]], str]:
    content_type = request.headers.get("content-type", "").lower()

    if "multipart/form-data" in content_type:
        form = await request.form()
        upload = form.get("file")
        if upload is None or not hasattr(upload, "read"):
            raise HTTPException(status_code=422, detail="Upload a CSV file using the 'file' form field.")
        content = await upload.read()
        if not content:
            raise HTTPException(status_code=422, detail="The uploaded file is empty.")
        if len(content) > config.MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"CSV exceeds the {config.MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit.",
            )
        try:
            frame = pd.read_csv(io.BytesIO(content))
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"Could not parse CSV: {exc}") from exc

        frame.columns = [str(column).strip() for column in frame.columns]
        columns = list(frame.columns)
        missing = [feature for feature in FEATURES if feature not in columns]
        unexpected = [column for column in columns if column not in FEATURES and column != TARGET_COLUMN]
        if missing or unexpected:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "CSV columns do not match the model's feature contract.",
                    "missing_columns": missing,
                    "unexpected_columns": unexpected,
                    "required_columns": FEATURES,
                },
            )
        if frame.empty:
            raise HTTPException(status_code=422, detail="The CSV contains no data rows.")
        if len(frame) > config.MAX_BATCH_ROWS:
            raise HTTPException(
                status_code=413,
                detail=f"Too many rows ({len(frame)}). Maximum is {config.MAX_BATCH_ROWS}.",
            )
        records = frame.drop(columns=[TARGET_COLUMN], errors="ignore").to_dict(orient="records")
        filename = getattr(upload, "filename", None) or "upload.csv"
        return records, f"csv:{filename}"

    try:
        body = await request.json()
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail="Send either multipart/form-data with a 'file' field or JSON with a 'records' array.",
        ) from exc
    if not isinstance(body, dict) or "records" not in body:
        raise HTTPException(status_code=422, detail="JSON body must contain a 'records' array.")
    records = body["records"]
    if not isinstance(records, list) or not records:
        raise HTTPException(status_code=422, detail="'records' must be a non-empty array.")
    if len(records) > config.MAX_BATCH_ROWS:
        raise HTTPException(
            status_code=413,
            detail=f"Too many records ({len(records)}). Maximum is {config.MAX_BATCH_ROWS}.",
        )
    cleaned: list[dict[str, Any]] = []
    for record in records:
        if not isinstance(record, dict):
            raise HTTPException(status_code=422, detail="Every record must be a JSON object.")
        cleaned.append({key: value for key, value in record.items() if key != TARGET_COLUMN})
    return cleaned, "json"


@app.post("/predict-batch", response_model=BatchResponse)
async def predict_batch(request: Request) -> dict[str, Any]:
    pipeline = _pipeline(request)
    records, source = await _parse_batch(request)
    try:
        results = pipeline.predict_records(records)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ArtifactError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Batch prediction failed")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {exc}") from exc
    return {"count": len(results), "source": source, "results": results}
