
"""
Redis client for caching, rate limiting, and idempotency support.

Redis is NOT the source of truth — PostgreSQL is.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import certifi
import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None

IDEMPOTENCY_TTL_SECONDS = 86400  # 24 hours
TELEMETRY_DEDUP_TTL = 86400  # 24 hours


def get_redis() -> redis.Redis | None:
    """Return the shared Redis client, or None if unavailable."""
    global _redis_client

    if _redis_client is not None:
        return _redis_client

    try:
        url = settings.REDIS_URL

        if not url or url == "your_redis_url":
            logger.warning(
                "REDIS_URL is not configured — Redis features disabled"
            )
            return None

        _redis_client = redis.Redis.from_url(
            url,
            decode_responses=True,
            ssl_ca_certs=certifi.where(),
            socket_connect_timeout=5,
            socket_timeout=5,
            health_check_interval=30,
        )

        _redis_client.ping()
        logger.info("Redis connected")
        return _redis_client

    except Exception:
        logger.warning(
            "Redis unavailable — features degraded",
            exc_info=True,
        )

        if _redis_client is not None:
            try:
                _redis_client.close()
            except Exception:
                pass

        _redis_client = None
        return None


# ---------------------------------------------------------------------------
# Idempotency helpers
# ---------------------------------------------------------------------------

def get_idempotent_result(key: str) -> dict | None:
    """Return a previously stored idempotent result, or None."""
    client = get_redis()

    if client is None:
        return None

    try:
        raw = client.get(f"idempotency:{key}")
        if raw is not None:
            return json.loads(raw)
    except Exception:
        logger.warning("Redis idempotency read failed", exc_info=True)

    return None


def store_idempotent_result(
    key: str,
    result: dict,
    ttl: int = IDEMPOTENCY_TTL_SECONDS,
) -> None:
    """Store an idempotent result in Redis."""
    client = get_redis()

    if client is None:
        return

    try:
        client.setex(
            f"idempotency:{key}",
            ttl,
            json.dumps(result),
        )
    except Exception:
        logger.warning("Redis idempotency write failed", exc_info=True)


# ---------------------------------------------------------------------------
# Rate limiting helpers
# ---------------------------------------------------------------------------

def check_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: int,
) -> bool:
    """Return True if within the limit, otherwise False."""
    client = get_redis()

    if client is None:
        # Fail open if Redis is unavailable.
        return True

    try:
        full_key = f"ratelimit:{key}"

        # Atomic increment with expiry on the first request.
        # Lua prevents concurrent requests from exceeding the limit.
        script = """
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
            redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        return current
        """

        current = int(
            client.eval(script, 1, full_key, window_seconds)
        )

        return current <= max_requests

    except Exception:
        logger.warning("Redis rate limit check failed", exc_info=True)
        return True


# ---------------------------------------------------------------------------
# Telemetry deduplication helpers
# ---------------------------------------------------------------------------

def is_event_duplicate(event_id: str) -> bool:
    """Check whether an event has already been recorded."""
    client = get_redis()

    if client is None:
        return False

    try:
        return client.exists(f"telemetry_event:{event_id}") > 0
    except Exception:
        logger.warning("Redis telemetry lookup failed", exc_info=True)
        return False


def mark_event_recorded(event_id: str) -> None:
    """Mark an event as recorded for the deduplication window."""
    client = get_redis()

    if client is None:
        return

    try:
        client.setex(
            f"telemetry_event:{event_id}",
            TELEMETRY_DEDUP_TTL,
            "1",
        )
    except Exception:
        logger.warning("Redis telemetry write failed", exc_info=True)
