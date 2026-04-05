import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request

from database import get_db
from middleware.rate_limit import limiter
from models.vault import VaultCreate, VaultResponse, VaultUpdate
from routers.auth import get_current_user_id
from services.audit_service import log_action

router = APIRouter(prefix="/vaults", tags=["vaults"])


def _row_to_vault(row) -> VaultResponse:
    keys = row.keys()
    return VaultResponse(
        id=row["id"],
        owner_id=row["owner_id"],
        name=row["name"],
        description=row["description"],
        is_shared=bool(row["is_shared"]),
        created_at=row["created_at"],
        entry_count=row["entry_count"] if "entry_count" in keys else 0,
    )


def _require_vault_access(conn, vault_id: str, user_id: str, require_write: bool = False) -> None:
    """Raise 404 if vault is inaccessible; 403 if write is required but role is viewer."""
    row = conn.execute(
        """SELECT v.owner_id,
                  (SELECT role FROM vault_members
                   WHERE vault_id = v.id AND user_id = ?) AS member_role
           FROM vaults v WHERE v.id = ?""",
        (user_id, vault_id),
    ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Vault not found")

    is_owner = (row["owner_id"] == user_id)
    member_role = row["member_role"]

    if not is_owner and member_role is None:
        raise HTTPException(status_code=404, detail="Vault not found")

    if require_write and not is_owner and member_role == "viewer":
        raise HTTPException(status_code=403, detail="Insufficient permissions")


@router.get("", response_model=List[VaultResponse])
async def list_vaults(user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        rows = conn.execute(
            """SELECT v.*, COUNT(e.id) AS entry_count
               FROM vaults v
               LEFT JOIN entries e ON e.vault_id = v.id
               WHERE v.owner_id = ?
                 OR v.id IN (SELECT vault_id FROM vault_members WHERE user_id = ?)
               GROUP BY v.id
               ORDER BY v.created_at DESC""",
            (user_id, user_id),
        ).fetchall()
    return [_row_to_vault(r) for r in rows]


@router.post("", response_model=VaultResponse, status_code=201)
@limiter.limit("60/minute")
async def create_vault(
    request: Request,
    body: VaultCreate,
    user_id: str = Depends(get_current_user_id),
):
    vault_id = str(uuid.uuid4())
    with get_db() as conn:
        conn.execute(
            "INSERT INTO vaults (id, owner_id, name, description) VALUES (?, ?, ?, ?)",
            (vault_id, user_id, body.name, body.description),
        )
        row = conn.execute(
            "SELECT *, 0 AS entry_count FROM vaults WHERE id = ?", (vault_id,)
        ).fetchone()

    log_action(
        user_id, "vault_created", "vault", vault_id,
        request.client.host if request.client else None,
    )
    return _row_to_vault(row)


@router.get("/{vault_id}", response_model=VaultResponse)
async def get_vault(vault_id: str, user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        _require_vault_access(conn, vault_id, user_id)
        row = conn.execute(
            """SELECT v.*, COUNT(e.id) AS entry_count
               FROM vaults v LEFT JOIN entries e ON e.vault_id = v.id
               WHERE v.id = ? GROUP BY v.id""",
            (vault_id,),
        ).fetchone()
    return _row_to_vault(row)


@router.put("/{vault_id}", response_model=VaultResponse)
async def update_vault(
    vault_id: str,
    body: VaultUpdate,
    user_id: str = Depends(get_current_user_id),
):
    with get_db() as conn:
        # Only the owner can rename/describe a vault
        owner = conn.execute(
            "SELECT id FROM vaults WHERE id = ? AND owner_id = ?", (vault_id, user_id)
        ).fetchone()
        if owner is None:
            raise HTTPException(status_code=404, detail="Vault not found")

        if body.name is not None:
            conn.execute(
                "UPDATE vaults SET name = ? WHERE id = ?", (body.name, vault_id)
            )
        if body.description is not None:
            conn.execute(
                "UPDATE vaults SET description = ? WHERE id = ?", (body.description, vault_id)
            )

        row = conn.execute(
            """SELECT v.*, COUNT(e.id) AS entry_count
               FROM vaults v LEFT JOIN entries e ON e.vault_id = v.id
               WHERE v.id = ? GROUP BY v.id""",
            (vault_id,),
        ).fetchone()

    log_action(user_id, "vault_updated", "vault", vault_id)
    return _row_to_vault(row)


@router.delete("/{vault_id}", status_code=204)
async def delete_vault(vault_id: str, user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        owner = conn.execute(
            "SELECT id FROM vaults WHERE id = ? AND owner_id = ?", (vault_id, user_id)
        ).fetchone()
        if owner is None:
            raise HTTPException(status_code=404, detail="Vault not found")
        conn.execute("DELETE FROM vaults WHERE id = ?", (vault_id,))

    log_action(user_id, "vault_deleted", "vault", vault_id)
