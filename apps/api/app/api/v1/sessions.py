from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.session import LogSetPayload, LoggedSetOut, SessionOut, SessionStartPayload
from app.services import session_service

router = APIRouter()


@router.post('/start', response_model=SessionOut)
def start_session(payload: SessionStartPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = session_service.start_session(db, current_user, payload.scheduled_workout_id, payload.template_id)
    return data


@router.post('/{session_id}/sets', response_model=LoggedSetOut)
def upsert_set(session_id: str, payload: LogSetPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = session_service.upsert_set(
        db,
        current_user,
        session_id=session_id,
        logged_exercise_id=payload.logged_exercise_id,
        set_number=payload.set_number,
        actual_weight=payload.actual_weight,
        actual_reps=payload.actual_reps,
        status=payload.status,
        notes=payload.notes,
    )
    return data


@router.post('/{session_id}/finish')
def finish_session(session_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return session_service.finish_session(db, current_user, session_id)
