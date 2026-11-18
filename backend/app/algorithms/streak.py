"""
Sliding-window streak calculation.

An active day is a calendar date on which the child completed
at least one task.

Returns:
(current_streak, longest_streak)
"""

from datetime import date, datetime, timedelta
from typing import Iterable


def calculate_streak(
    completion_dates: Iterable[date | datetime],
    today: date | None = None,
) -> tuple[int, int]:
    """
    Calculate current and longest consecutive active-day streaks.

    Multiple completions on one date count as one active day.

    Current streak remains active if the latest completion was
    today or yesterday.
    """

    if today is None:
        today = date.today()

    # Normalize timestamps to unique calendar dates.
    active_days = sorted({
        value.date() if isinstance(value, datetime) else value
        for value in completion_dates
    })

    if not active_days:
        return 0, 0

    # Sliding window: find the longest consecutive sequence.
    left = 0
    longest_streak = 1

    for right in range(1, len(active_days)):
        if active_days[right] - active_days[right - 1] != timedelta(days=1):
            left = right

        longest_streak = max(
            longest_streak,
            right - left + 1,
        )

    # A streak is current only if the latest active day
    # is today or yesterday.
    last_active_day = active_days[-1]

    if last_active_day not in (
        today,
        today - timedelta(days=1),
    ):
        return 0, longest_streak

    # Count backwards from the latest active day.
    current_streak = 1

    for index in range(len(active_days) - 1, 0, -1):
        if (
            active_days[index] - active_days[index - 1]
            == timedelta(days=1)
        ):
            current_streak += 1
        else:
            break

    return current_streak, longest_streak