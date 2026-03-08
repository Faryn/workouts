from pydantic import BaseModel, EmailStr, Field


class AdminUserOut(BaseModel):
    id: str
    email: EmailStr
    name: str | None = None
    role: str
    active: bool


class AdminUserCreate(BaseModel):
    email: EmailStr
    name: str | None = Field(default=None, max_length=120)
    role: str = Field(pattern='^(athlete|trainer|admin)$')
    password: str = Field(min_length=8)
    active: bool = True


class AdminUserPatch(BaseModel):
    email: EmailStr | None = None
    name: str | None = Field(default=None, max_length=120)
    role: str | None = Field(default=None, pattern='^(athlete|trainer|admin)$')
    active: bool | None = None


class AdminPasswordReset(BaseModel):
    password: str = Field(min_length=8)
