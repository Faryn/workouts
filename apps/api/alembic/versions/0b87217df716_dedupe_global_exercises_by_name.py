"""dedupe global exercises by name

Revision ID: 0b87217df716
Revises: 5b74d21f0ab1
Create Date: 2026-03-15 21:40:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = '0b87217df716'
down_revision = '5b74d21f0ab1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.exec_driver_sql(
        """
        SELECT name
        FROM exercises
        GROUP BY name
        HAVING COUNT(*) > 1
        """
    ).fetchall()

    for (name,) in rows:
        ids = [r[0] for r in conn.exec_driver_sql(
            "SELECT id FROM exercises WHERE name = ? ORDER BY id ASC",
            (name,),
        ).fetchall()]
        if len(ids) < 2:
            continue
        canonical = ids[0]
        duplicates = ids[1:]
        for dup_id in duplicates:
            conn.exec_driver_sql(
                "UPDATE workout_template_exercises SET exercise_id = ? WHERE exercise_id = ?",
                (canonical, dup_id),
            )
            conn.exec_driver_sql(
                "UPDATE logged_exercises SET exercise_id = ? WHERE exercise_id = ?",
                (canonical, dup_id),
            )
            conn.exec_driver_sql(
                "DELETE FROM exercises WHERE id = ?",
                (dup_id,),
            )


def downgrade() -> None:
    pass
