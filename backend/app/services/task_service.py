"""
TaskService: handles Task and TaskStep CRUD operations, task retrieval with authorization checks,
and notification hooks.
"""

import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.task import Task, TaskStatus, FocusState
from app.models.task_step import TaskStep, TaskStepStatus
from app.models.child import Child
from app.models.user import User, UserRole
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.notification_service import NotificationService
from app.core.security import verify_child_ownership

logger = logging.getLogger(__name__)


class TaskService:
    @staticmethod
    def create_task(db: Session, data: TaskCreate, caregiver: User) -> Task:
        """
        Caregiver creates a task for a specified child.
        Creates PENDING notification if scheduled_at is present.
        """
        if data.child_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="child_id is required",
            )

        child = verify_child_ownership(data.child_id, caregiver, db)

        task = Task(
            child_id=child.id,
            title=data.title,
            description=data.description,
            scheduled_at=data.scheduled_at,
            priority=data.priority,
            status=TaskStatus.PENDING,
            focus_state=FocusState.INITIATED,
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # Hook: Create scheduled notification if scheduled_at is set
        if task.scheduled_at:
            NotificationService.create_task_reminder(db, task, child)

        return task

    @staticmethod
    def get_tasks_for_user(
        db: Session,
        user: User,
        child_id: int | None = None
    ) -> list[Task]:

        """
        Caregiver sees tasks belonging to their children.
        Child sees only their own tasks.
        """

        if user.role == UserRole.CAREGIVER:

            children_query = select(Child.id).where(
                Child.caregiver_id == user.id,
                Child.is_deleted.is_(False)
            )

            if child_id is not None:
                children_query = children_query.where(
                    Child.id == child_id
                )

            owned_child_ids = list(
                db.execute(children_query).scalars().all()
            )

            if not owned_child_ids:
                return []

            return list(
                db.execute(
                    select(Task)
                    .where(
                        Task.child_id.in_(owned_child_ids),
                        Task.is_deleted.is_(False)
                    )
                    .order_by(Task.priority.desc(), Task.id.asc())
                ).scalars().all()
            )

        elif user.role == UserRole.CHILD:

            child = db.execute(
                select(Child).where(
                    Child.user_id == user.id,
                    Child.is_deleted.is_(False)
                )
            ).scalar_one_or_none()

            if not child:
                return []

            return list(
                db.execute(
                    select(Task)
                    .where(
                        Task.child_id == child.id,
                        Task.is_deleted.is_(False)
                    )
                    .order_by(Task.priority.desc(), Task.id.asc())
                ).scalars().all()
            )

        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User role is not authorized to view tasks"
            )
    @staticmethod
    def get_task_steps(db: Session, task_id: int) -> list[TaskStep]:
        """Fetch all TaskSteps for a task ordered by position."""
        return list(
            db.execute(
                select(TaskStep)
                .join(Task, Task.id == TaskStep.task_id)
                .where(
                    TaskStep.task_id == task_id,
                    Task.is_deleted.is_(False),
                )
                .order_by(TaskStep.position.asc())
            ).scalars().all()
        )

    @staticmethod
    def update_task(db: Session, task: Task, data: TaskUpdate) -> Task:
        """
        Update task fields (Caregiver only).
        Updates/cancels pending notification if scheduled_at changes.
        """

        scheduled_changed = False

        if data.title is not None:
            task.title = data.title

        if "description" in data.model_fields_set:
            task.description = data.description

        if data.priority is not None:
            task.priority = data.priority

        if data.status is not None:
            task.status = data.status

        if "scheduled_at" in data.model_fields_set:
            if task.scheduled_at != data.scheduled_at:
                task.scheduled_at = data.scheduled_at
                scheduled_changed = True

        db.commit()
        db.refresh(task)

        # Update reminder if scheduled_at changed
        if scheduled_changed:

            child = db.execute(
                select(Child).where(Child.id == task.child_id)
            ).scalar_one_or_none()

            if child:
                NotificationService.update_task_reminder(db, task, child)

        return task

    @staticmethod
    def delete_task(db: Session, task: Task) -> None:
        """
        Soft-delete a task (Caregiver only).
        Cancels related pending notifications and keeps the task
        and its TaskSteps in the database.
        """
        NotificationService.cancel_task_reminder(db, task.id)

        task.is_deleted = True 
        task.deleted_at = datetime.now(timezone.utc)

        db.commit()
