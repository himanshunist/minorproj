"""Direct ports of the custom learners defined in the original ``IDS.ipynb``.

Nothing here is a replacement model: the Gaussian Naive Bayes formulas, Gini
split search, tree structure and leaf voting are the notebook implementations.
The only additions are persistence helpers and a numerically stable log-space
version of the GNB product used by the API (identical argmax, no underflow).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

_EPSILON = 1e-12


class GaussianNBFromNotebook:
    """Gaussian Naive Bayes as implemented in notebook cell 42."""

    def __init__(
        self,
        prior: float | None = None,
        n_class: int | None = None,
        mean: np.ndarray | None = None,
        variance: np.ndarray | None = None,
        classes: np.ndarray | None = None,
    ) -> None:
        self.prior = prior
        self.n_class = n_class
        self.mean = mean
        self.variance = variance
        self.classes = classes

    def fit(self, x: pd.DataFrame, y: pd.Series) -> "GaussianNBFromNotebook":
        self.mean = np.array(x.groupby(by=y).mean())
        self.variance = np.array(x.groupby(by=y).var())
        self.n_class = len(np.unique(y))
        self.classes = np.unique(y)
        self.prior = 1 / self.n_class
        return self

    # -- helpers kept for fidelity with the notebook -------------------------
    def calc_mean_var(self) -> list[list[list[float]]]:
        mean = np.asarray(self.mean)
        variance = np.asarray(self.variance)
        mean_var: list[list[list[float]]] = []
        for class_index in range(len(mean)):
            mean_row = mean[class_index]
            var_row = variance[class_index]
            for feature_index, class_mean in enumerate(mean_row):
                mean_var.append([[class_mean, var_row[feature_index]]])
        return mean_var

    def split(self) -> np.ndarray:
        return np.vsplit(np.asarray(self.calc_mean_var()), self.n_class)

    @staticmethod
    def gnb_base(x_val: float, x_mean: float, x_var: float) -> float:
        var = x_var if x_var > _EPSILON else _EPSILON
        equation_1 = 1 / (np.sqrt(2 * np.pi * var))
        numerator = (x_val - x_mean) ** 2
        expo = np.exp(-(numerator / (2 * var)))
        return equation_1 * expo

    def predict(self, X: np.ndarray) -> int:
        """Notebook prediction: argmax of the per-class Gaussian product.

        The product is evaluated in log space.  ``argmax(log(p)) == argmax(p)``,
        so the decision is the same as notebook cell 42, but very small
        densities no longer underflow to zero for every class.
        """
        log_probs = self.predict_log_proba(np.asarray(X, dtype=float))
        return int(self.classes[int(np.argmax(log_probs))])

    def predict_log_proba(self, X: np.ndarray) -> np.ndarray:
        X = np.asarray(X, dtype=float)
        mean = np.asarray(self.mean, dtype=float)
        variance = np.asarray(self.variance, dtype=float)
        safe_variance = np.where(variance > _EPSILON, variance, _EPSILON)
        log_prior = np.log(float(self.prior))
        log_probs = []
        for class_index in range(self.n_class):
            log_density = -0.5 * np.log(2 * np.pi * safe_variance[class_index])
            log_density -= ((X - mean[class_index]) ** 2) / (2 * safe_variance[class_index])
            log_probs.append(float(np.sum(log_density) + log_prior))
        return np.asarray(log_probs, dtype=float)

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        log_probs = self.predict_log_proba(X)
        shifted = log_probs - np.max(log_probs)
        exponentials = np.exp(shifted)
        return exponentials / np.sum(exponentials)

    def probability_for_label(self, X: np.ndarray, label: int) -> float:
        index = list(self.classes).index(int(label))
        return float(self.predict_proba(X)[index])

    def save(self, path: str | Path) -> None:
        np.savez(
            path,
            mean=np.asarray(self.mean),
            variance=np.asarray(self.variance),
            classes=np.asarray(self.classes),
            prior=np.asarray(self.prior),
            n_class=np.asarray(self.n_class),
        )

    @classmethod
    def load(cls, path: str | Path) -> "GaussianNBFromNotebook":
        with np.load(path, allow_pickle=False) as data:
            return cls(
                prior=float(data["prior"]),
                n_class=int(data["n_class"]),
                mean=data["mean"],
                variance=data["variance"],
                classes=data["classes"],
            )


# -- Decision tree from notebook cell 45 -------------------------------------

def is_numeric(value: Any) -> bool:
    return isinstance(value, int) or isinstance(value, float)


class Question:
    def __init__(self, column: int, value: Any) -> None:
        self.column = column
        self.value = value

    def match(self, example: list[Any]) -> bool:
        val = example[self.column]
        if is_numeric(val):
            return val >= self.value
        return val == self.value

    def __repr__(self) -> str:
        condition = ">=" if is_numeric(self.value) else "=="
        return f"col {self.column} {condition} {self.value}"


def partition(rows: list[list[Any]], question: Question) -> tuple[list, list]:
    true_rows, false_rows = [], []
    for row in rows:
        (true_rows if question.match(row) else false_rows).append(row)
    return true_rows, false_rows


def class_counts(rows: list[list[Any]]) -> dict[int, int]:
    counts: dict[int, int] = {}
    for row in rows:
        label = row[-1]
        counts[label] = counts.get(label, 0) + 1
    return counts


def gini(rows: list[list[Any]]) -> float:
    counts = class_counts(rows)
    impurity = 1.0
    for label in counts:
        probability = counts[label] / float(len(rows))
        impurity -= probability**2
    return impurity


def info_gain(left: list, right: list, current_uncertainty: float) -> float:
    p = float(len(left)) / (len(left) + len(right))
    return current_uncertainty - p * gini(left) - (1 - p) * gini(right)


def find_best_split(rows: list[list[Any]]) -> tuple[float, Question | None]:
    best_gain = 0.0
    best_question = None
    current_uncertainty = gini(rows)
    n_features = len(rows[0]) - 1

    for col in range(n_features):
        values = {row[col] for row in rows}
        for val in values:
            question = Question(col, val)
            true_rows, false_rows = partition(rows, question)
            if not true_rows or not false_rows:
                continue
            gain = info_gain(true_rows, false_rows, current_uncertainty)
            if gain >= best_gain:  # notebook tie-breaking: later value wins
                best_gain, best_question = gain, question
    return best_gain, best_question


class Leaf:
    def __init__(self, rows: list[list[Any]]) -> None:
        self.predictions = class_counts(rows)


class Decision_Node:  # noqa: N801 - name preserved from the notebook
    def __init__(self, question: Question, true_branch: Any, false_branch: Any) -> None:
        self.question = question
        self.true_branch = true_branch
        self.false_branch = false_branch


def build_tree(rows: list[list[Any]]) -> Any:
    gain, question = find_best_split(rows)
    if gain == 0 or question is None:
        return Leaf(rows)
    true_rows, false_rows = partition(rows, question)
    return Decision_Node(
        question,
        build_tree(true_rows),
        build_tree(false_rows),
    )


def classify(row: list[Any], node: Any) -> dict[int, int]:
    if isinstance(node, Leaf):
        return node.predictions
    if node.question.match(row):
        return classify(row, node.true_branch)
    return classify(row, node.false_branch)


def tree_predict_label(row: list[Any], tree: Any) -> int:
    counts = classify(row, tree)
    return int(sorted(counts.items(), key=lambda item: item[1], reverse=True)[0][0])


def tree_predict_proba(row: list[Any], tree: Any, label: int) -> float:
    counts = classify(row, tree)
    total = sum(counts.values())
    return float(counts.get(int(label), 0) / total) if total else 0.0


def tree_to_dict(node: Any) -> dict[str, Any]:
    """Store the notebook tree as plain JSON (no pickle import-path coupling)."""
    if isinstance(node, Leaf):
        return {
            "type": "leaf",
            "predictions": {str(key): int(value) for key, value in node.predictions.items()},
        }
    return {
        "type": "node",
        "column": int(node.question.column),
        "value": node.question.value,
        "true": tree_to_dict(node.true_branch),
        "false": tree_to_dict(node.false_branch),
    }


def tree_from_dict(data: dict[str, Any]) -> Any:
    if data["type"] == "leaf":
        leaf = Leaf([])
        leaf.predictions = {int(key): int(value) for key, value in data["predictions"].items()}
        return leaf
    question = Question(int(data["column"]), data["value"])
    return Decision_Node(
        question,
        tree_from_dict(data["true"]),
        tree_from_dict(data["false"]),
    )
