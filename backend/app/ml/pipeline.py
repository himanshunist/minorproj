"""Loads the exported artifacts once and runs the notebook inference pipeline."""

from __future__ import annotations

import json
import logging
import warnings
from pathlib import Path
from typing import Any

import joblib  # type: ignore
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import CountVectorizer
from xgboost import XGBClassifier

from .ensemble import majority_vote, vote_share
from .features import CATEGORICAL_FEATURES, FEATURES, LABEL_MAPPING, NUMERIC_FEATURES
from .legacy_models import (
    GaussianNBFromNotebook,
    classify,
    tree_from_dict,
    tree_predict_proba,
)

logger = logging.getLogger(__name__)

# The fitted vocabulary may contain values such as 'X11' exactly as in the
# notebook; CountVectorizer warns because it lowercases documents.
warnings.filterwarnings("ignore", message="Upper case characters found.*", category=UserWarning)

REQUIRED_ARTIFACTS = {
    "metadata": "metadata.json",
    "scaler": "scaler.joblib",
    "pca": "pca.joblib",
    "gnb": "gnb.npz",
    "decision_tree": "dt_tree.json",
    "xgb": "xgb_model.json",
}


class ArtifactError(RuntimeError):
    """Raised when required model artifacts are missing or corrupted."""


class ValidationError(ValueError):
    """Raised when an input record does not match the model's feature contract."""


class IDSPipeline:
    """In-memory, read-only inference pipeline."""

    def __init__(self, model_dir: Path) -> None:
        self.model_dir = model_dir
        self.metadata: dict[str, Any] = {}
        self.metrics: dict[str, Any] = {}
        self.scaler: Any = None
        self.pca: Any = None
        self.gnb: GaussianNBFromNotebook | None = None
        self.tree: Any = None
        self.xgb: XGBClassifier | None = None
        self.vectorizers: dict[str, CountVectorizer] = {}
        self.categorical_values: dict[str, list[str]] = {}
        self.version = "unknown"

    # -- construction --------------------------------------------------------
    @classmethod
    def load(cls, model_dir: str | Path) -> "IDSPipeline":
        directory = Path(model_dir)
        missing = [
            filename
            for filename in REQUIRED_ARTIFACTS.values()
            if not (directory / filename).is_file()
        ]
        if missing:
            raise ArtifactError(
                "Missing model artifacts: "
                + ", ".join(missing)
                + f". Train the model first (see README) or place artifacts in {directory}."
            )

        pipeline = cls(directory)
        try:
            pipeline.metadata = json.loads((directory / "metadata.json").read_text(encoding="utf-8"))
            metrics_path = directory / "metrics.json"
            pipeline.metrics = (
                json.loads(metrics_path.read_text(encoding="utf-8"))
                if metrics_path.is_file()
                else {}
            )
            pipeline.version = str(pipeline.metadata.get("version", "unknown"))
            pipeline.categorical_values = {
                key: [str(value) for value in values]
                for key, values in pipeline.metadata.get("categorical_values", {}).items()
            }
            pipeline.scaler = joblib.load(directory / "scaler.joblib")
            pipeline.pca = joblib.load(directory / "pca.joblib")
            pipeline.gnb = GaussianNBFromNotebook.load(directory / "gnb.npz")
            tree_payload = json.loads((directory / "dt_tree.json").read_text(encoding="utf-8"))
            pipeline.tree = tree_from_dict(tree_payload)
            pipeline.xgb = XGBClassifier()
            pipeline.xgb.load_model(directory / "xgb_model.json")

            for column in CATEGORICAL_FEATURES:
                vocab = pipeline.categorical_values.get(column)
                if not vocab:
                    raise ArtifactError(f"metadata.json is missing categorical_values.{column}")
                with warnings.catch_warnings():
                    warnings.filterwarnings(
                        "ignore", message="Upper case characters found.*", category=UserWarning
                    )
                    vectorizer = CountVectorizer(vocabulary=vocab, binary=True)
                    vectorizer.fit([])  # fixed vocabulary: no corpus needed
                pipeline.vectorizers[column] = vectorizer
        except ArtifactError:
            raise
        except Exception as exc:  # pragma: no cover - defensive startup guard
            raise ArtifactError(f"Could not load model artifacts: {exc}") from exc

        logger.info("Loaded IDS artifacts from %s (version %s)", directory, pipeline.version)
        return pipeline

    # -- validation ----------------------------------------------------------
    def validate_record(self, record: Any) -> dict[str, Any]:
        if not isinstance(record, dict):
            raise ValidationError("each record must be a JSON object")
        errors: list[str] = []
        ordered: dict[str, Any] = {}

        for feature in FEATURES:
            value = record.get(feature)
            if feature in CATEGORICAL_FEATURES:
                if not isinstance(value, str) or not value.strip():
                    errors.append(f"'{feature}' must be a non-empty string")
                    continue
                value = value.strip()
                allowed = self.categorical_values.get(feature, [])
                if allowed and value not in allowed:
                    preview = ", ".join(allowed[:8])
                    suffix = "..." if len(allowed) > 8 else ""
                    errors.append(
                        f"'{feature}' value '{value}' is not in the training vocabulary "
                        f"({preview}{suffix})"
                    )
                ordered[feature] = value
                continue

            try:
                number = float(value)  # type: ignore[arg-type]
            except (TypeError, ValueError):
                errors.append(f"'{feature}' must be a number")
                continue
            if not np.isfinite(number) or number < 0:
                errors.append(f"'{feature}' must be a finite, non-negative number")
                continue
            ordered[feature] = number

        if errors:
            raise ValidationError("; ".join(errors))
        return ordered

    def validate_records(self, records: list[Any]) -> list[dict[str, Any]]:
        validated: list[dict[str, Any]] = []
        errors: list[str] = []
        for index, record in enumerate(records, start=1):
            try:
                validated.append(self.validate_record(record))
            except ValidationError as exc:
                errors.append(f"row {index}: {exc}")
        if errors:
            detail = "; ".join(errors[:20])
            if len(errors) > 20:
                detail += f"; ... and {len(errors) - 20} more error(s)"
            raise ValidationError(detail)
        return validated

    # -- inference -----------------------------------------------------------
    def _preprocess(self, records: list[dict[str, Any]]) -> tuple[np.ndarray, pd.DataFrame, list[list[Any]]]:
        frame = pd.DataFrame(records, columns=FEATURES)
        # Keep the DataFrame column names: the scaler was fitted with them in
        # the training notebook, and sklearn then skips its feature-name warning.
        scaled = self.scaler.transform(frame[NUMERIC_FEATURES])
        pca_features = self.pca.transform(scaled)

        encoded_parts = [
            self.vectorizers[column].transform(frame[column].astype(str).values).toarray()
            for column in CATEGORICAL_FEATURES
        ]
        xgb_matrix = np.hstack((pca_features, *encoded_parts))
        # Same integer column labels as the notebook's DataFrame(hstack(...)).
        xgb_frame = pd.DataFrame(xgb_matrix)

        # .values on a mixed frame yields Python int/float/str scalars, which is
        # what the notebook's custom tree expects from is_numeric().
        tree_rows = frame.values.tolist()
        return np.asarray(pca_features), xgb_frame, tree_rows

    def predict_records(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if self.gnb is None or self.tree is None or self.xgb is None:
            raise ArtifactError("pipeline is not loaded")
        validated = self.validate_records(records)
        if not validated:
            return []
        pca_features, xgb_frame, tree_rows = self._preprocess(validated)

        gnb_labels = np.asarray([self.gnb.predict(row) for row in pca_features], dtype=int)
        dt_labels = np.asarray(
            [
                sorted(classify(row, self.tree).items(), key=lambda item: item[1], reverse=True)[0][0]
                for row in tree_rows
            ],
            dtype=int,
        )
        xgb_labels = np.asarray(self.xgb.predict(xgb_frame), dtype=int)
        xgb_probabilities = np.asarray(self.xgb.predict_proba(xgb_frame))

        results: list[dict[str, Any]] = []
        for index in range(len(validated)):
            votes = [int(gnb_labels[index]), int(dt_labels[index]), int(xgb_labels[index])]
            final_label = majority_vote(votes)
            xgb_classes = list(self.xgb.classes_)
            xgb_probability = float(xgb_probabilities[index, xgb_classes.index(xgb_labels[index])])
            result = {
                "index": index,
                "prediction": LABEL_MAPPING[final_label],
                "label": final_label,
                "confidence": vote_share(votes),
                "confidence_type": "ensemble_vote_share",
                "votes": {
                    "gaussian_naive_bayes": {
                        "label": votes[0],
                        "prediction": LABEL_MAPPING[votes[0]],
                        "confidence": round(
                            self.gnb.probability_for_label(pca_features[index], votes[0]), 6
                        ),
                    },
                    "decision_tree": {
                        "label": votes[1],
                        "prediction": LABEL_MAPPING[votes[1]],
                        "confidence": round(tree_predict_proba(tree_rows[index], self.tree, votes[1]), 6),
                    },
                    "xgboost": {
                        "label": votes[2],
                        "prediction": LABEL_MAPPING[votes[2]],
                        "confidence": round(xgb_probability, 6),
                    },
                },
                "model_version": self.version,
            }
            results.append(result)
        return results

    # -- metadata ------------------------------------------------------------
    def get_model_info(self) -> dict[str, Any]:
        info: dict[str, Any] = dict(self.metadata)
        info["status"] = "ready"
        info["features"] = FEATURES
        info["numeric_features"] = NUMERIC_FEATURES
        info["categorical_features"] = CATEGORICAL_FEATURES
        info["label_mapping"] = LABEL_MAPPING
        info["metrics"] = self.metrics.get("artifact_metrics") or None
        info["notebook_reference_metrics"] = self.metrics.get("notebook_reference_metrics") or None
        info["artifact_dir"] = str(self.model_dir)
        return info
