import certifi
import redis
from datetime import datetime

from rq import Queue
from rq.registry import ScheduledJobRegistry

from app.core.config import settings


redis_conn = redis.Redis.from_url(
    settings.REDIS_URL,
    decode_responses=False,
    ssl_ca_certs=certifi.where(),
    socket_connect_timeout=5,
    socket_timeout=5,
    health_check_interval=30,
)

notification_queue = Queue(
    "notifications",
    connection=redis_conn,
)


def schedule_notification(notification_id: int, scheduled_at: datetime) -> None:
    """Schedule one notification using a stable job ID."""
    job_id = f"notification-{notification_id}"

    # Remove any previous scheduled job with this ID.
    cancel_notification_job(notification_id)

    notification_queue.enqueue_at(
        scheduled_at,
        "app.workers.notification_worker.send_task_reminder",
        notification_id,
        job_id=job_id,
    )


def cancel_notification_job(notification_id: int) -> None:
    """Remove a scheduled notification job if it exists."""
    job_id = f"notification-{notification_id}"

    registry = ScheduledJobRegistry(
        queue=notification_queue,
    )

    try:
        registry.remove(job_id, delete_job=True)
    except Exception:
        # A job may not have reached the scheduled registry yet.
        pass

    try:
        job = notification_queue.fetch_job(job_id)
        if job is not None:
            job.cancel()
            job.delete()
    except Exception:
        pass