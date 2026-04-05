from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


# ─── Validators réutilisables ─────────────────────────────────────────────────

def _validate_username(v: str) -> str:
    v = v.strip().lower()
    if len(v) < 3 or len(v) > 64:
        raise ValueError("Username must be 3–64 characters")
    if not all(c.isalnum() or c in "-_." for c in v):
        raise ValueError("Username may only contain letters, digits, hyphens, underscores, and dots")
    return v


def _validate_password(v: str) -> str:
    if len(v) < 12:
        raise ValueError("Master password must be at least 12 characters")
    if len(v) > 512:
        raise ValueError("Master password too long")

    # FIX 12 : enforce character diversity — at least 3 of 4 categories
    has_upper = any(c.isupper() for c in v)
    has_lower = any(c.islower() for c in v)
    has_digit = any(c.isdigit() for c in v)
    has_special = any(not c.isalnum() for c in v)

    if sum([has_upper, has_lower, has_digit, has_special]) < 3:
        raise ValueError(
            "Master password must contain at least 3 of the following: "
            "uppercase letters, lowercase letters, digits, special characters"
        )

    return v


# ─── Auth publique ────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str
    invite_token: Optional[str] = None

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        return _validate_username(v)

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        return _validate_password(v)


class UserLogin(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_strip(cls, v: str) -> str:
        return v.strip().lower()


# ─── Réponses ─────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: str
    username: str
    is_admin: bool = False
    is_active: bool = True
    created_at: datetime
    last_login: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    kdf_salt: str


# ─── Admin ───────────────────────────────────────────────────────────────────

class AdminCreateUserDirect(BaseModel):
    """Option A : l'admin crée directement un compte avec un mot de passe."""
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        return _validate_username(v)

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        return _validate_password(v)


class AdminUpdateUser(BaseModel):
    """Édition d'un compte par l'admin (username et/ou reset mot de passe)."""
    username: Optional[str] = None
    password: Optional[str] = None
    # FIX 7 : doit être True si password est fourni ET que l'user a des entrées
    confirm_data_loss: bool = False

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validate_username(v)

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validate_password(v)


class AdminUserResponse(UserResponse):
    pass


class InviteTokenCreate(BaseModel):
    expires_in_days: int = 7


class InviteTokenResponse(BaseModel):
    token: str
    created_at: datetime
    expires_at: datetime
    used_at: Optional[datetime] = None
    used_by_username: Optional[str] = None
