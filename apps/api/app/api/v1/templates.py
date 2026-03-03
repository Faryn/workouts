from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models.user import User
from app.schemas.template import TemplateCreate, TemplateOut, TemplatePatch
from app.services import template_service

router = APIRouter()


@router.get('/', response_model=list[TemplateOut])
def list_templates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = template_service.list_templates(db, current_user)
    return [TemplateOut(id=t.id, name=t.name, notes=t.notes, owner_id=t.owner_id) for t in rows]


@router.post('/', response_model=TemplateOut)
def create_template(payload: TemplateCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = template_service.create_template(db, current_user, payload.name, payload.notes)
    return TemplateOut(id=t.id, name=t.name, notes=t.notes, owner_id=t.owner_id)


@router.patch('/{template_id}', response_model=TemplateOut)
def patch_template(template_id: str, payload: TemplatePatch, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = template_service.patch_template(db, current_user, template_id, payload.name, payload.notes)
    if not t:
        raise HTTPException(status_code=404, detail='Template not found')
    return TemplateOut(id=t.id, name=t.name, notes=t.notes, owner_id=t.owner_id)


@router.delete('/{template_id}')
def delete_template(template_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ok = template_service.delete_template(db, current_user, template_id)
    if not ok:
        raise HTTPException(status_code=404, detail='Template not found')
    return {'ok': True}
