"""add last_saved_at to workout_sessions

Revision ID: 9d5f7d4cf24a
Revises: 1b219e79bbcf
Create Date: 2026-03-04 10:50:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9d5f7d4cf24a'
down_revision = '1b219e79bbcf'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'workout_sessions',
        sa.Column('last_saved_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    )


def downgrade() -> None:
    op.drop_column('workout_sessions', 'last_saved_at')
