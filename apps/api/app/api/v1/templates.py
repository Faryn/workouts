from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.template import TemplateCreate, TemplateOut, TemplatePatch
from app.services import template_service

router = APIRouter()


@router.get('/', response_model=list[TemplateOut])
def list_templates(
    athlete_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return template_service.list_templates(db, current_user, athlete_id=athlete_id)


@router.post('/', response_model=TemplateOut)
def create_template(payload: TemplateCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return template_service.create_template(
            db,
            current_user,
            payload.name,
            payload.notes,
            [e.model_dump() for e in payload.exercises],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch('/{template_id}', response_model=TemplateOut)
def patch_template(template_id: str, payload: TemplatePatch, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        t = template_service.patch_template(
            db,
            current_user,
            template_id,
            payload.name,
            payload.notes,
            [e.model_dump() for e in payload.exercises] if payload.exercises is not None else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not t:
        raise HTTPException(status_code=404, detail='Template not found')
    return t


@router.delete('/{template_id}')
def delete_template(template_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ok = template_service.delete_template(db, current_user, template_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Template not found')
    return {'ok': True}
