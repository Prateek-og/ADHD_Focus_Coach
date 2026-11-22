"""add task metadata fields

Revision ID: b7f1c2d3e4a5
Revises: 2c3005eb9202
Create Date: 2026-11-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7f1c2d3e4a5'
down_revision: Union[str, Sequence[str], None] = '2c3005eb9202'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add optional task metadata used by the caregiver UI."""
    op.add_column('tasks', sa.Column('estimated_minutes', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('recurrence', sa.String(length=50), nullable=True))
    op.add_column('tasks', sa.Column('reward_points', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Remove the optional task metadata columns."""
    op.drop_column('tasks', 'reward_points')
    op.drop_column('tasks', 'recurrence')
    op.drop_column('tasks', 'estimated_minutes')
