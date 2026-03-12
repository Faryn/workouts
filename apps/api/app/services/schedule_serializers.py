from app.models.schedule import ScheduledWorkout


def serialize_scheduled(row: ScheduledWorkout) -> dict:
    return {
        "id": row.id,
        "athlete_id": row.athlete_id,
        "template_id": row.template_id,
        "date": row.date.isoformat(),
        "status": row.status,
        "source": row.source,
        "notes": row.notes,
    }
