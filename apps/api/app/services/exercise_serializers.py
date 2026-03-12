from app.models.exercise import Exercise


def serialize_exercise(exercise: Exercise) -> dict:
    return {
        "id": exercise.id,
        "name": exercise.name,
        "type": exercise.type,
        "owner_scope": exercise.owner_scope,
        "owner_id": exercise.owner_id,
        "equipment": exercise.equipment,
        "notes": exercise.notes,
    }
