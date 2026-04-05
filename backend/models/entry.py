import base64
from pydantic import BaseModel, field_validator
from typing import Literal, Optional
from datetime import datetime


def _validate_base64(v: str) -> str:
    """Vérifie que la valeur est du base64 valide et non vide (FIX 8)."""
    v = v.strip()
    if not v:
        raise ValueError("Field cannot be empty")
    try:
        base64.b64decode(v, validate=True)
    except Exception:
        raise ValueError("Invalid base64 encoding")
    return v


class EntryCreate(BaseModel):
    encrypted_data: str
    iv: str
    entry_type: Literal["login", "note", "card", "identity"] = "login"

    @field_validator("encrypted_data", "iv")
    @classmethod
    def valid_base64(cls, v: str) -> str:
        return _validate_base64(v)


class EntryUpdate(BaseModel):
    encrypted_data: Optional[str] = None
    iv: Optional[str] = None
    entry_type: Optional[Literal["login", "note", "card", "identity"]] = None

    @field_validator("encrypted_data", "iv")
    @classmethod
    def valid_base64(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return _validate_base64(v)


class EntryResponse(BaseModel):
    id: str
    vault_id: str
    created_by: str
    encrypted_data: str
    iv: str
    entry_type: str
    updated_at: datetime
