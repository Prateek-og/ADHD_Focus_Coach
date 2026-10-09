import os
import json
import ssl
import certifi
import jwt

from dotenv import load_dotenv
from urllib.request import Request, urlopen

from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jwt import PyJWKClient
from jwt.exceptions import PyJWTError

load_dotenv()

JWKS_URL = os.getenv("CLERK_JWKS_URL")
if not JWKS_URL:
    raise RuntimeError("CLERK_JWKS_URL missing from .env")

app = FastAPI(title="Clerk Test")
security = HTTPBearer()


# Fetch Clerk's public keys using certifi's CA bundle
def get_jwks():
    context = ssl.create_default_context(cafile=certifi.where())
    request = Request(JWKS_URL)

    with urlopen(request, context=context, timeout=10) as response:
        return json.loads(response.read())


# Simple JWKS client with certifi-compatible fetching
class ClerkJWKSClient(PyJWKClient):
    def fetch_data(self):
        return get_jwks()


jwks = ClerkJWKSClient(JWKS_URL)


@app.get("/test-clerk")
def test_clerk(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        key = jwks.get_signing_key_from_jwt(token).key

        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            options={"require": ["exp", "sub"]},
        )

        return {
            "authenticated": True,
            "clerk_user_id": payload["sub"],
            "message": "Clerk token verified successfully",
        }

    except Exception as exc:
        print("CLERK TEST ERROR:", repr(exc))
        raise HTTPException(
            status_code=401,
            detail=f"Token verification failed: {type(exc).__name__}",
        ) from exc