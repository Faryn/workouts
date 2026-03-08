"""add user name

Revision ID: f2a1b6d9c4e7
Revises: c7b6c3b1d2e4
Create Date: 2026-03-08 20:47:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f2a1b6d9c4e7'
down_revision = 'c7b6c3b1d2e4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('name', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'name')
