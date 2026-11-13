"""
ADHD Focus Coach FastAPI Application
Mounts all modular route routers following the authoritative API contract.
"""

from fastapi import FastAPI

from app.api.auth_routes import router as auth_router
from app.api.child_routes import router as child_router
from app.api.task_routes import router as task_router
from app.api.feedback_routes import router as feedback_router
from app.api.notification_routes import router as notification_router
from app.api.progress_routes import router as progress_router
from app.api.device_routes import router as device_router
from app.api.telemetry_routes import router as telemetry_router

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="ADHD Focus Coach API",
    version="1.1",
    description="Authoritative API route layer for ADHD Focus Coach modular monolith.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Include API routers
app.include_router(auth_router)
app.include_router(child_router)
# app.include_router(task_router)
# app.include_router(feedback_router)
# app.include_router(notification_router)
# app.include_router(progress_router)
# app.include_router(device_router)
# app.include_router(telemetry_router)


@app.get("/")
def root():
    return {"message": "ADHD Focus Coach API is running"}
