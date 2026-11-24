"""align schema with models (Supabase drift)

Adds the AI quota table to the migration chain, the device lookup indexes
declared on the model, and aligns the feedback option column with the
seven-question feedback contract.

Revision ID: c4f5a6b7d8e9
Revises: b7f1c2d3e4a5
Create Date: 2026-11-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4f5a6b7d8e9'
down_revision: Union[str, Sequence[str], None] = 'b7f1c2d3e4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _index_names(table: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {index['name'] for index in inspector.get_indexes(table)}


def upgrade() -> None:
    """Apply additive, idempotent schema fixes."""
    inspector = sa.inspect(op.get_bind())

    # The AI quota service uses this table, but it was never part of the
    # migration chain. Supabase already has it; fresh databases do not.
    if 'ai_usage_daily' not in inspector.get_table_names():
        op.create_table(
            'ai_usage_daily',
            sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column('caregiver_id', sa.Integer(), nullable=False),
            sa.Column('usage_date', sa.Date(), nullable=False),
            sa.Column(
                'breakdown_count',
                sa.Integer(),
                server_default=sa.text('0'),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(['caregiver_id'], ['users.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint(
                'caregiver_id',
                'usage_date',
                name='uq_ai_usage_daily_caregiver_date',
            ),
        )

    # Indexes were added to the Device model after the initial migration.
    device_indexes = _index_names('devices')
    if 'ix_devices_user_active' not in device_indexes:
        op.create_index(
            'ix_devices_user_active',
            'devices',
            ['user_id', 'is_active'],
            unique=False,
        )
    if 'uq_devices_user_expo_push_token' not in device_indexes:
        op.create_index(
            'uq_devices_user_expo_push_token',
            'devices',
            ['user_id', 'expo_push_token'],
            unique=True,
        )

    # Seven-question feedback stores short option IDs, not legacy prose.
    op.alter_column(
        'feedback',
        'helped_by',
        existing_type=sa.String(length=100),
        type_=sa.String(length=40),
        existing_nullable=True,
    )


def downgrade() -> None:
    """Revert the feedback column width and device indexes.

    ``ai_usage_daily`` is intentionally left in place: it predates this
    migration on Supabase and is required by the AI quota service.
    """
    op.alter_column(
        'feedback',
        'helped_by',
        existing_type=sa.String(length=40),
        type_=sa.String(length=100),
        existing_nullable=True,
    )

    device_indexes = _index_names('devices')
    if 'uq_devices_user_expo_push_token' in device_indexes:
        op.drop_index('uq_devices_user_expo_push_token', table_name='devices')
    if 'ix_devices_user_active' in device_indexes:
        op.drop_index('ix_devices_user_active', table_name='devices')
