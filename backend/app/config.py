"""Environment-driven configuration for the API."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

APP_NAME = os.getenv("APP_NAME", "Intrusion Detection System API")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
MODEL_DIR = Path(os.getenv("MODEL_DIR", str(BACKEND_DIR / "models"))).resolve()

_DEFAULT_ORIGINS = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:4173,http://127.0.0.1:4173,"
    "http://localhost:3000,http://127.0.0.1:3000"
)
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",") if origin.strip()]
MAX_BATCH_ROWS = int(os.getenv("MAX_BATCH_ROWS", "5000"))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
