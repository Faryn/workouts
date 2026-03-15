"""add pending set status

Revision ID: 7f6d1a2b9c40
Revises: f2a1b6d9c4e7
Create Date: 2026-03-15 20:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7f6d1a2b9c40'
down_revision = 'f2a1b6d9c4e7'
branch_labels = None
depends_on = None

old_set_status = sa.Enum('done', 'skipped', name='set_status')
new_set_status = sa.Enum('pending', 'done', 'skipped', name='set_status')


def upgrade() -> None:
    with op.batch_alter_table('logged_sets', recreate='always') as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=old_set_status,
            type_=new_set_status,
            existing_nullable=False,
            server_default='pending',
        )

    op.execute(
        """
        UPDATE logged_sets
        SET status = 'pending'
        WHERE status = 'done'
          AND actual_weight IS NULL
          AND actual_reps IS NULL
        """
    )


def downgrade() -> None:
    op.execute("UPDATE logged_sets SET status = 'done' WHERE status = 'pending'")

    with op.batch_alter_table('logged_sets', recreate='always') as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=new_set_status,
            type_=old_set_status,
            existing_nullable=False,
            server_default='done',
        )
