"""
Deterministic feedback retention and preference derivation.

Rules:
- Retain only the latest 10 feedback submissions per child.
- Derive preferences only from the structured `helped_by` answer.
- An option must occur at least twice in the retained window.
- Rank by frequency, then most recent occurrence; keep at most 3.
- No LLM call or predictive inference is used.
"""

from collections import defaultdict
import logging

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.feedback import Feedback
from app.models.child_ai_context import ChildAIContext
from app.models.task import Task
from app.models.child import Child
from app.schemas.feedback import FeedbackCreate

logger = logging.getLogger(__name__)

MAX_FEEDBACK_ROWS = 10
MIN_PATTERN_OCCURRENCES = 2
MAX_PREFERENCES = 3

# Keys are normalized with strip().casefold() before lookup.
HELPED_BY_PREFERENCES = {
    "small steps": "Prefers tasks broken into small steps.",
    "encouragement": "Benefits from encouragement during tasks.",
    "timer": "Benefits from timer-based focus sessions.",
    # "Something else" is intentionally omitted: it does not identify
    # which alternative support was useful.
}


def derive_preferences(feedback_rows: list[Feedback]) -> list[str]:
    """
    Derive up to three preference rules from newest-first feedback rows.

    The function is deterministic: for the same ordered rows it always
    returns the same preferences.
    """
    counts: dict[str, int] = defaultdict(int)
    latest_position: dict[str, int] = {}

    for position, row in enumerate(feedback_rows):
        answer = (row.helped_by or "").strip().casefold()
        if answer not in HELPED_BY_PREFERENCES:
            continue

        counts[answer] += 1
        # Rows are newest-first, so the first occurrence is the most recent.
        latest_position.setdefault(answer, position)

    eligible = [
        answer
        for answer, count in counts.items()
        if count >= MIN_PATTERN_OCCURRENCES
    ]

    eligible.sort(
        key=lambda answer: (
            -counts[answer],
            latest_position[answer],
        )
    )

    return [
        HELPED_BY_PREFERENCES[answer]
        for answer in eligible[:MAX_PREFERENCES]
    ]


class FeedbackService:
    @staticmethod
    def submit_feedback(
        db: Session,
        task: Task,
        child: Child,
        data: FeedbackCreate,
    ) -> Feedback:
        """
        Save feedback, prune history to the latest 10 rows, and recalculate
        the child's current preferences in one database transaction.
        """
        if task.child_id != child.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Task does not belong to child",
            )

        try:
            # Serialize feedback submissions for this child. This prevents
            # concurrent requests from racing during pruning/recalculation.
            locked_child = db.execute(
                select(Child)
                .where(Child.id == child.id)
                .with_for_update()
            ).scalar_one_or_none()

            if locked_child is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Child not found",
                )

            feedback = Feedback(
                child_id=child.id,
                task_id=task.id,
                task_step_id=data.task_step_id,
                feeling=data.feeling,
                helped_by=data.helped_by,
                difficulty=data.difficulty,
            )
            db.add(feedback)
            db.flush()  # Assign ID and make the new row visible to this transaction.

            latest_feedback = list(
                db.execute(
                    select(Feedback)
                    .where(Feedback.child_id == child.id)
                    .order_by(
                        Feedback.created_at.desc(),
                        Feedback.id.desc(),
                    )
                    .limit(MAX_FEEDBACK_ROWS)
                ).scalars().all()
            )

            retained_ids = [row.id for row in latest_feedback]

            # Delete all older feedback rows outside the rolling window.
            db.execute(
                delete(Feedback).where(
                    Feedback.child_id == child.id,
                    Feedback.id.not_in(retained_ids),
                )
            )

            preferences = derive_preferences(latest_feedback)

            context = db.execute(
                select(ChildAIContext)
                .where(ChildAIContext.child_id == child.id)
                .with_for_update()
            ).scalar_one_or_none()

            preference_text = "; ".join(preferences)

            if context is None:
                context = ChildAIContext(
                    child_id=child.id,
                    preferences=preference_text,
                )
                db.add(context)
            else:
                # Replace derived preferences; never append stale rules.
                context.preferences = preference_text

            db.commit()
            db.refresh(feedback)
            return feedback

        except Exception:
            db.rollback()
            raise

    @staticmethod
    def get_feedback_for_child(
        db: Session,
        child_id: int,
    ) -> list[Feedback]:
        """
        Return the retained feedback history (at most 10 rows).
        Older rows are pruned during each successful submission.
        """
        return list(
            db.execute(
                select(Feedback)
                .where(Feedback.child_id == child_id)
                .order_by(
                    Feedback.created_at.desc(),
                    Feedback.id.desc(),
                )
                .limit(MAX_FEEDBACK_ROWS)
            ).scalars().all()
        )
