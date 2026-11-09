"""
Deque for ordered TaskStep execution.

The deque is an in-memory view of the remaining steps.
PostgreSQL remains the source of truth.
"""

from collections import deque
from typing import Deque, Generic, Iterable, TypeVar

T = TypeVar("T")


class TaskStepDeque(Generic[T]):

    def __init__(self, steps: Iterable[T] | None = None) -> None:
        self._deque: Deque[T] = deque(steps or [])

    def peek_current(self) -> T | None:
        """Return the active step without removing it."""
        return self._deque[0] if self._deque else None

    def peek_next(self) -> T | None:
        """Return the step after the active one."""
        return self._deque[1] if len(self._deque) > 1 else None

    def advance(self) -> T | None:
        """Remove the completed current step and return the next step."""
        if self._deque:
            self._deque.popleft()

        return self.peek_current()

    def replace_current(self, new_step: T) -> None:
        """Replace the current step with its refined version."""
        if not self._deque:
            raise IndexError("Cannot refine an empty step deque")

        self._deque[0] = new_step

    def decompose_current(self, new_steps: Iterable[T]) -> None:
        """
        Replace the current step with smaller steps.

        The supplied order is preserved.
        Example: [A, B, C] -> decompose A into [A1, A2]
                 Result: [A1, A2, B, C]
        """
        new_steps = list(new_steps)

        if not self._deque:
            raise IndexError("Cannot decompose an empty step deque")

        if not new_steps:
            raise ValueError("Decomposition must contain at least one step")

        self._deque.popleft()

        for step in reversed(new_steps):
            self._deque.appendleft(step)

    def is_empty(self) -> bool:
        return not self._deque

    def __len__(self) -> int:
        return len(self._deque)

    def to_list(self) -> list[T]:
        """Return a snapshot of the remaining execution order."""
        return list(self._deque)