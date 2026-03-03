from pydantic import BaseModel


class TemplateCreate(BaseModel):
    name: str
    notes: str | None = None


class TemplatePatch(BaseModel):
    name: str | None = None
    notes: str | None = None


class TemplateOut(BaseModel):
    id: str
    name: str
    notes: str | None = None
    owner_id: str
