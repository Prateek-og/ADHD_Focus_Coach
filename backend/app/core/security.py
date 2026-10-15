
from __future__ import annotations

import json
import logging
import ssl
import time
from typing import Annotated
from urllib.request import Request, urlopen
from urllib.parse import urlparse

import certifi
import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientConnectionError, PyJWKClientError, PyJWTError

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.child import Child
from app.models.task import Task
from app.models.user import User, UserRole


# ---------------------------------------------------------------------------
# Clerk token verification
# ---------------------------------------------------------------------------

JWKS_URL = settings.CLERK_JWKS_URL 

parsed_jwks_url = urlparse(JWKS_URL)

if (
    parsed_jwks_url.scheme != "https"
    or not parsed_jwks_url.hostname
    or parsed_jwks_url.path.rstrip("/") != "/.well-known/jwks.json"
):
    raise RuntimeError("Invalid CLERK_JWKS_URL")

CLERK_ISSUER = f"{parsed_jwks_url.scheme}://{parsed_jwks_url.netloc}"

bearer_scheme = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


class CertifiPyJWKClient(PyJWKClient):
    """Fetch Clerk signing keys with TLS verification using certifi."""

    def fetch_data(self) -> dict:
        context = ssl.create_default_context(cafile=certifi.where())
        request = Request(
            self.uri,
            headers={"User-Agent": "ADHD-Focus-Coach"},
        )

        try:
            with urlopen(request, context=context, timeout=10) as response:
                return json.loads(response.read())
        except Exception as exc:
            raise PyJWKClientConnectionError(
                "Unable to retrieve Clerk JWKS"
            ) from exc


jwks_client = CertifiPyJWKClient(
    JWKS_URL,
    cache_keys=True,
    timeout=10,
)


def _unauthorized(detail: str = "Invalid or expired Clerk session token"):
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _decode_clerk_token(token: str) -> dict:
    """Verify the token signature, expiration, subject, and issuer."""

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            options={
                "require": ["exp", "sub", "iss"],
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_iss": True,
            },
        )

        if not isinstance(claims.get("sub"), str) or not claims["sub"]:
            raise _unauthorized("Token has no valid subject")

        return claims

    except HTTPException:
        raise
    except PyJWKClientConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clerk verification service is unavailable",
        ) from exc
    except (PyJWTError, PyJWKClientError, ValueError, TypeError) as exc:
        # Log timing metadata only. Never log the token itself or its signature.
        # This helps distinguish a genuinely expired JWT from other validation errors.
        if isinstance(exc, jwt.ExpiredSignatureError):
            try:
                unverified_claims = jwt.decode(
                    token,
                    options={
                        "verify_signature": False,
                        "verify_exp": False,
                        "verify_nbf": False,
                        "verify_iss": False,
                        "verify_aud": False,
                    },
                    algorithms=["RS256"],
                )
                exp = unverified_claims.get("exp")
                iat = unverified_claims.get("iat")
                now = int(time.time())
                logger.warning(
                    "Clerk JWT expired: now=%s exp=%s seconds_past_exp=%s iat=%s",
                    now,
                    exp,
                    (now - int(exp)) if exp is not None else None,
                    iat,
                )
            except Exception:
                logger.warning("Clerk JWT expired; could not inspect timing claims")
        else:
            logger.warning("Clerk token verification failed: %s", type(exc).__name__)
        raise _unauthorized() from exc


def get_clerk_identity(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> str:
    """
    Authenticate the request and return the verified Clerk user ID.

    Does not require an application User row. Used during onboarding.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Missing bearer token")

    claims = _decode_clerk_token(credentials.credentials)
    return claims["sub"]


# ---------------------------------------------------------------------------
# Application user resolution
# ---------------------------------------------------------------------------

def get_current_user(
    clerk_user_id: Annotated[str, Depends(get_clerk_identity)],
    db: Session = Depends(get_db),
) -> User:
    """Authenticate through Clerk and resolve the registered app user."""

    user = db.execute(
        select(User).where(User.clerk_user_id == clerk_user_id)
    ).scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has not completed application onboarding",
        )

    return user

# ---------------------------------------------------------------------------
# Role-based authorization
# ---------------------------------------------------------------------------

def require_caregiver(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Allow access only to caregiver accounts."""
    if current_user.role != UserRole.CAREGIVER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Caregiver access required",
        )
    return current_user


def require_child_role(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Allow access only to child accounts."""
    if current_user.role != UserRole.CHILD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Child access required",
        )
    return current_user


# ---------------------------------------------------------------------------
# Child ownership and access
# ---------------------------------------------------------------------------

def get_child_for_user(
    child_id: int,
    current_user: User,
    db: Session,
) -> Child:
    """Allow the owning caregiver or the child themselves."""
    child = db.get(Child, child_id)

    if child is None or child.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found",
        )

    if current_user.role == UserRole.CAREGIVER:
        allowed = child.caregiver_id == current_user.id
    elif current_user.role == UserRole.CHILD:
        allowed = child.user_id == current_user.id
    else:
        allowed = False

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found",
        )

    return child


def verify_child_ownership(
    child_id: int,
    current_user: User,
    db: Session,
) -> Child:
    """Require the caregiver who owns the child profile."""
    if current_user.role != UserRole.CAREGIVER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Caregiver access required",
        )

    child = db.get(Child, child_id)

    if (
        child is None
        or child.is_deleted
        or child.caregiver_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child not found",
        )

    return child


def verify_child_access(
    child_id: int,
    current_user: User,
    db: Session,
) -> Child:
    """Allow the owning caregiver or the child themselves."""
    return get_child_for_user(child_id, current_user, db)



# ---------------------------------------------------------------------------
# Task access
# ---------------------------------------------------------------------------

def verify_task_access(
    db: Session,
    task_id: int,
    current_user: User,
) -> Task:
    """Allow access only when the task belongs to an accessible child."""
    task = db.get(Task, task_id)

    if task is None or getattr(task, "is_deleted", False):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    get_child_for_user(task.child_id, current_user, db)
    return task


def verify_task_child_only(
    db: Session,
    task_id: int,
    current_user: User,
) -> Task:
    """Require a child account and verify that the task belongs to them."""
    if current_user.role != UserRole.CHILD:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Child access required",
        )

    return verify_task_access(db, task_id, current_user)


# ---------------------------------------------------------------------------
# Authorized child IDs
# ---------------------------------------------------------------------------


def get_authorized_child_ids(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> list[int]:
    """Return child profile IDs accessible to the current user."""

    if current_user.role == UserRole.CHILD:
        child_ids = db.execute(
            select(Child.id).where(
                Child.user_id == current_user.id,
                Child.is_deleted.is_(False),
            )
        ).scalars().all()

        return list(child_ids)

    if current_user.role == UserRole.CAREGIVER:
        child_ids = db.execute(
            select(Child.id).where(
                Child.caregiver_id == current_user.id,
                Child.is_deleted.is_(False),
            )
        ).scalars().all()

        return list(child_ids)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied",
    )
