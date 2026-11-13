
"""
ProgressService: handles progress calculations, snapshots,
streaks, and summaries.

Progress is recalculated on demand whenever a GET /progress
endpoint is called. No background worker is required.
"""

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.progress import ProgressSnapshot
from app.models.task import Task, TaskStatus
from app.models.task_step import TaskStep, TaskStepStatus
from app.algorithms.streak import calculate_streak
from app.schemas.progress import (
    ProgressResponse,
    ProgressSummaryResponse,
    StreakResponse,
)

logger = logging.getLogger(__name__)


class ProgressService:

    @staticmethod
    def get_or_create_snapshot(
        db: Session,
        child_id: int,
    ) -> ProgressSnapshot:
        """Return the child's snapshot or create an empty one."""

        snapshot = db.execute(
            select(ProgressSnapshot).where(
                ProgressSnapshot.child_id == child_id
            )
        ).scalar_one_or_none()

        if snapshot is None:
            snapshot = ProgressSnapshot(
                child_id=child_id,
                tasks_completed=0,
                tasks_total=0,
                steps_completed=0,
                current_streak=0,
                longest_streak=0,
                average_completion_minutes=0.0,
                recent_summary="No recent activity recorded.",
            )
            db.add(snapshot)
            db.flush()

        return snapshot

    @staticmethod
    def get_progress(
        db: Session,
        child_id: int,
    ) -> ProgressResponse:
        """GET /progress: calculate and return current progress."""

        snapshot = ProgressService.compute_and_update_snapshot(
            db, child_id
        )
        return ProgressResponse.model_validate(snapshot)

    @staticmethod
    def get_progress_summary(
        db: Session,
        child_id: int,
    ) -> ProgressSummaryResponse:
        """GET /progress/summary: return current progress summary."""

        snapshot = ProgressService.compute_and_update_snapshot(
            db, child_id
        )

        rate = (
            snapshot.tasks_completed / snapshot.tasks_total
            if snapshot.tasks_total > 0
            else 0.0
        )

        return ProgressSummaryResponse(
            child_id=child_id,
            tasks_completed=snapshot.tasks_completed,
            tasks_total=snapshot.tasks_total,
            steps_completed=snapshot.steps_completed,
            current_streak=snapshot.current_streak,
            longest_streak=snapshot.longest_streak,
            completion_rate=round(rate, 2),
            recent_summary=snapshot.recent_summary,
        )

    @staticmethod
    def get_streak(
        db: Session,
        child_id: int,
    ) -> StreakResponse:
        """GET /progress/streak: return current streak information."""

        snapshot = ProgressService.compute_and_update_snapshot(
            db, child_id
        )

        return StreakResponse(
            child_id=child_id,
            current_streak=snapshot.current_streak,
            longest_streak=snapshot.longest_streak,
        )

    @staticmethod
    def compute_and_update_snapshot(
        db: Session,
        child_id: int,
    ) -> ProgressSnapshot:
        """
        Recalculate progress using non-deleted tasks and update
        the child's ProgressSnapshot.

        Average completion time is calculated as:
            last_activity_at - created_at

        This is elapsed time from task creation to its last activity,
        not measured active focus time.
        """

        # Fetch only non-deleted tasks belonging to this child.
        tasks = db.execute(
            select(Task).where(
                Task.child_id == child_id,
                Task.is_deleted.is_(False),
            )
        ).scalars().all()

        tasks_total = len(tasks)

        completed_tasks = [
            task
            for task in tasks
            if task.status == TaskStatus.COMPLETED
        ]

        tasks_completed = len(completed_tasks)

        # Calculate streak using completion dates.
        completion_dates = [
            task.last_activity_at
            for task in completed_tasks
            if task.last_activity_at is not None
        ]

        current_streak, longest_streak = calculate_streak(
            completion_dates
        )

        # Count completed steps belonging to non-deleted tasks.
        task_ids = [task.id for task in tasks]

        steps_completed = 0

        if task_ids:
            steps_completed = db.execute(
                select(TaskStep).where(
                    TaskStep.task_id.in_(task_ids),
                    TaskStep.status == TaskStepStatus.COMPLETED,
                )
            ).scalars().all()

            steps_completed = len(steps_completed)

        # Calculate average elapsed completion time in minutes.
        completion_durations = []

        for task in completed_tasks:
            if task.created_at and task.last_activity_at:
                duration = (
                    task.last_activity_at - task.created_at
                ).total_seconds() / 60

                # Ignore invalid negative durations.
                if duration >= 0:
                    completion_durations.append(duration)

        average_completion_minutes = (
            sum(completion_durations) / len(completion_durations)
            if completion_durations
            else 0.0
        )

        # Create or update the snapshot.
        snapshot = ProgressService.get_or_create_snapshot(
            db, child_id
        )

        snapshot.tasks_total = tasks_total
        snapshot.tasks_completed = tasks_completed
        snapshot.steps_completed = steps_completed
        snapshot.current_streak = current_streak
        snapshot.longest_streak = longest_streak
        snapshot.average_completion_minutes = round(
            average_completion_minutes, 2
        )
        snapshot.recent_summary = (
            f"Completed {tasks_completed} of {tasks_total} tasks."
        )

        db.commit()
        db.refresh(snapshot)

        return snapshot
