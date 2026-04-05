from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class VaultCreate(BaseModel):
    name: str
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 128:
            raise ValueError("Vault name must be 1–128 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 512:
            raise ValueError("Description must be ≤512 characters")
        return v


class VaultUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v or len(v) > 128:
                raise ValueError("Vault name must be 1–128 characters")
        return v


class VaultResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    description: Optional[str] = None
    is_shared: bool
    created_at: datetime
    entry_count: int = 0
