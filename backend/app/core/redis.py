"""
Redis client for caching, rate limiting, and idempotency support.
Redis is NOT the source of truth — PostgreSQL is.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis | None:
    """Return the shared Redis client, or None if unavailable."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        url = settings.REDIS_URL
        if not url or url == "your_redis_url":
            logger.warning("REDIS_URL is not configured — Redis features disabled")
            return None
        _redis_client = redis.from_url(url, decode_responses=True)
        _redis_client.ping()
        logger.info("Redis connected")
        return _redis_client
    except Exception:
        logger.warning("Redis unavailable — features degraded", exc_info=True)
        _redis_client = None
        return None


# ---------------------------------------------------------------------------
# Idempotency helpers
# ---------------------------------------------------------------------------

IDEMPOTENCY_TTL_SECONDS = 86400  # 24 h


def get_idempotent_result(key: str) -> dict | None:
    """Return a previously stored idempotent result, or None."""
    r = get_redis()
    if r is None:
        return None
    try:
        raw = r.get(f"idempotency:{key}")
        if raw is not None:
            return json.loads(raw)
    except Exception:
        logger.warning("Redis idempotency read failed", exc_info=True)
    return None


def store_idempotent_result(key: str, result: dict, ttl: int = IDEMPOTENCY_TTL_SECONDS) -> None:
    """Store an idempotent result in Redis."""
    r = get_redis()
    if r is None:
        return
    try:
        r.setex(f"idempotency:{key}", ttl, json.dumps(result))
    except Exception:
        logger.warning("Redis idempotency write failed", exc_info=True)


# ---------------------------------------------------------------------------
# Rate limiting helpers
# ---------------------------------------------------------------------------


def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    """Atomic fixed-window rate limit. Fails open if Redis is unavailable."""
    r = get_redis()
    if r is None:
        return True
    try:
        script = """
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
            redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        return current
        """
        current = int(r.eval(script, 1, f"ratelimit:{key}", window_seconds))
        return current <= max_requests
    except Exception:
        logger.warning("Redis rate limit check failed", exc_info=True)
        return True



# ---------------------------------------------------------------------------
# Telemetry deduplication and AI response cache
# ---------------------------------------------------------------------------

TELEMETRY_DEDUP_TTL = 86400
AI_RESPONSE_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60


def is_event_duplicate(event_id: str) -> bool:
    r = get_redis()
    if r is None:
        return False
    try:
        return bool(r.exists(f"telemetry_event:{event_id}"))
    except Exception:
        logger.warning("Redis telemetry lookup failed", exc_info=True)
        return False


def mark_event_recorded(event_id: str) -> None:
    """Mark only after PostgreSQL commit; SET NX makes the operation atomic."""
    r = get_redis()
    if r is None:
        return
    try:
        r.set(
            f"telemetry_event:{event_id}",
            "1",
            ex=TELEMETRY_DEDUP_TTL,
            nx=True,
        )
    except Exception:
        logger.warning("Redis telemetry mark failed", exc_info=True)


def get_ai_response_cache(cache_key: str) -> dict | None:
    r = get_redis()
    if r is None:
        return None
    try:
        raw = r.get(f"ai_response:{cache_key}")
        return json.loads(raw) if raw else None
    except Exception:
        logger.warning("AI response cache read failed", exc_info=True)
        return None


def store_ai_response_cache(
    cache_key: str,
    response: dict,
    ttl: int = AI_RESPONSE_CACHE_TTL_SECONDS,
) -> None:
    r = get_redis()
    if r is None:
        return
    try:
        r.setex(f"ai_response:{cache_key}", ttl, json.dumps(response))
    except Exception:
        logger.warning("AI response cache write failed", exc_info=True)
