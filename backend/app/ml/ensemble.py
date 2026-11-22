"""Majority-voting logic from notebook cell 58."""

from __future__ import annotations

from typing import Sequence

import numpy as np


def majority_vote(votes: Sequence[int]) -> int:
    """Same operation as ``np.bincount(tup).argmax()`` in the notebook."""
    array = np.asarray(votes, dtype=int)
    return int(np.bincount(array, minlength=2).argmax())


def vote_share(votes: Sequence[int]) -> float:
    """Meaningful confidence for a 3-model vote: fraction of winning votes.

    This is model agreement, *not* a calibrated probability.
    """
    array = np.asarray(votes, dtype=int)
    winner = majority_vote(array)
    return round(float(np.sum(array == winner) / len(array)), 4)
