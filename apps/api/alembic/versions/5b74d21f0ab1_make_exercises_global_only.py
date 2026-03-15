"""make exercises global only

Revision ID: 5b74d21f0ab1
Revises: 7f6d1a2b9c40
Create Date: 2026-03-15 21:35:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = '5b74d21f0ab1'
down_revision = '7f6d1a2b9c40'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE exercises SET owner_scope = 'global', owner_id = NULL WHERE owner_scope != 'global' OR owner_id IS NOT NULL")


def downgrade() -> None:
    pass
