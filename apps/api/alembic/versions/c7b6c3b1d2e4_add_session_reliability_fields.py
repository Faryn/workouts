"""add session reliability fields

Revision ID: c7b6c3b1d2e4
Revises: 9d5f7d4cf24a
Create Date: 2026-03-08 13:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c7b6c3b1d2e4'
down_revision = '9d5f7d4cf24a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('workout_sessions', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False))
    op.add_column('workout_sessions', sa.Column('version', sa.Integer(), server_default='1', nullable=False))

    op.create_index('ix_workout_sessions_athlete_status_started_at', 'workout_sessions', ['athlete_id', 'status', 'started_at'], unique=False)
    op.create_index('ix_logged_sets_logged_exercise_set_number', 'logged_sets', ['logged_exercise_id', 'set_number'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_logged_sets_logged_exercise_set_number', table_name='logged_sets')
    op.drop_index('ix_workout_sessions_athlete_status_started_at', table_name='workout_sessions')
    op.drop_column('workout_sessions', 'version')
    op.drop_column('workout_sessions', 'updated_at')
