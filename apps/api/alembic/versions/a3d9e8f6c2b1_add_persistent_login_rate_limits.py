"""add persistent login rate limits

Revision ID: a3d9e8f6c2b1
Revises: f2a1b6d9c4e7
Create Date: 2026-07-21 21:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "a3d9e8f6c2b1"
down_revision = "f2a1b6d9c4e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "login_rate_limits",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("attempts_json", sa.Text(), nullable=False),
        sa.Column("locked_until", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("login_rate_limits")
