from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.exercise import Exercise
from app.models.user import User

router = APIRouter()


@router.get("/")
def list_exercises(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # v1 starter policy: return global + user-owned exercises
    rows = (
        db.query(Exercise)
        .filter(
            (Exercise.owner_scope == "global")
            | ((Exercise.owner_id == current_user.id) & (Exercise.owner_scope.in_(["trainer", "athlete"])))
        )
        .order_by(Exercise.name.asc())
        .all()
    )
    return [{"id": e.id, "name": e.name, "type": e.type, "owner_scope": e.owner_scope} for e in rows]
