
import json

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.redis import is_event_duplicate, mark_event_recorded
from app.models.telemetry import TelemetryEvent
from app.models.user import User
from app.schemas.telemetry import TelemetryBatchRequest


class TelemetryService:
    @staticmethod
    def record_events(
        db: Session,
        user: User,
        data: TelemetryBatchRequest,
    ) -> dict:
        candidates = []
        event_ids = []

        for item in data.events:
            # Redis is only a fast-path. PostgreSQL unique(event_id) is authoritative.
            if is_event_duplicate(item.event_id):
                continue

            candidates.append({
                "event_id": item.event_id,
                "user_id": user.id,
                "child_id": item.child_id,
                "task_id": item.task_id,
                "task_step_id": item.task_step_id,
                "event_type": item.event_type,
                "occurred_at": item.occurred_at,
                "metadata_json": (
                    json.dumps(item.metadata, ensure_ascii=False)
                    if item.metadata is not None else None
                ),
            })
            event_ids.append(item.event_id)

        if not candidates:
            return {
                "status": "success",
                "recorded": 0,
                "ignored_duplicates": len(data.events),
            }

        stmt = (
            pg_insert(TelemetryEvent)
            .values(candidates)
            .on_conflict_do_nothing(index_elements=[TelemetryEvent.event_id])
        )
        result = db.execute(stmt)
        db.commit()

        # Mark only after the durable DB commit.
        for event_id in event_ids:
            mark_event_recorded(event_id)

        recorded = result.rowcount or 0
        return {
            "status": "success",
            "recorded": recorded,
            "ignored_duplicates": len(data.events) - recorded,
        }
