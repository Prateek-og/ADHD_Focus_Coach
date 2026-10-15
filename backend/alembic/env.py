
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.core.config import settings
from app.core.database import Base

# Import every model so SQLAlchemy registers all tables.
from app.models.user import User
from app.models.child import Child
from app.models.task import Task
from app.models.task_step import TaskStep
from app.models.child_ai_context import ChildAIContext
from app.models.feedback import Feedback
from app.models.notification import Notification
from app.models.telemetry import TelemetryEvent
from app.models.device import Device
from app.models.progress import ProgressSnapshot


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata used by Alembic autogenerate.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without creating a database connection."""
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations using a live database connection."""
    connectable = create_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
        pool_pre_ping=True,
    )

    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
            )

            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
