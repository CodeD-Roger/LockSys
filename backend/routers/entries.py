import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request

from database import get_db
from middleware.rate_limit import limiter
from models.entry import EntryCreate, EntryResponse, EntryUpdate
from routers.auth import get_current_user_id
from services.audit_service import log_action

router = APIRouter(tags=["entries"])


def _require_vault_access(conn, vault_id: str, user_id: str, require_write: bool = False) -> None:
    """Raise 404 if vault is inaccessible; 403 if write needed but role is viewer."""
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


def _row_to_entry(row) -> EntryResponse:
    return EntryResponse(
        id=row["id"],
        vault_id=row["vault_id"],
        created_by=row["created_by"],
        encrypted_data=row["encrypted_data"],
        iv=row["iv"],
        entry_type=row["entry_type"],
        updated_at=row["updated_at"],
    )


@router.get("/vaults/{vault_id}/entries", response_model=List[EntryResponse])
async def list_entries(vault_id: str, user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        _require_vault_access(conn, vault_id, user_id)
        rows = conn.execute(
            "SELECT * FROM entries WHERE vault_id = ? ORDER BY updated_at DESC",
            (vault_id,),
        ).fetchall()
    return [_row_to_entry(r) for r in rows]


@router.post("/vaults/{vault_id}/entries", response_model=EntryResponse, status_code=201)
@limiter.limit("60/minute")
async def create_entry(
    request: Request,
    vault_id: str,
    body: EntryCreate,
    user_id: str = Depends(get_current_user_id),
):
    with get_db() as conn:
        _require_vault_access(conn, vault_id, user_id, require_write=True)

        entry_id = str(uuid.uuid4())
        conn.execute(
            """INSERT INTO entries (id, vault_id, created_by, encrypted_data, iv, entry_type)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (entry_id, vault_id, user_id, body.encrypted_data, body.iv, body.entry_type),
        )
        row = conn.execute("SELECT * FROM entries WHERE id = ?", (entry_id,)).fetchone()

    log_action(
        user_id, "entry_created", "entry", entry_id,
        request.client.host if request.client else None,
    )
    return _row_to_entry(row)


@router.get("/entries/{entry_id}", response_model=EntryResponse)
async def get_entry(entry_id: str, user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM entries WHERE id = ?", (entry_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Entry not found")
        _require_vault_access(conn, row["vault_id"], user_id)
    return _row_to_entry(row)


@router.put("/entries/{entry_id}", response_model=EntryResponse)
async def update_entry(
    entry_id: str,
    body: EntryUpdate,
    user_id: str = Depends(get_current_user_id),
):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM entries WHERE id = ?", (entry_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Entry not found")
        _require_vault_access(conn, row["vault_id"], user_id, require_write=True)

        if body.encrypted_data is not None:
            conn.execute(
                "UPDATE entries SET encrypted_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (body.encrypted_data, entry_id),
            )
        if body.iv is not None:
            conn.execute(
                "UPDATE entries SET iv = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (body.iv, entry_id),
            )
        if body.entry_type is not None:
            # FIX 9 : updated_at mis à jour sur tous les champs sans exception
            conn.execute(
                "UPDATE entries SET entry_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (body.entry_type, entry_id),
            )

        row = conn.execute("SELECT * FROM entries WHERE id = ?", (entry_id,)).fetchone()

    log_action(user_id, "entry_updated", "entry", entry_id)
    return _row_to_entry(row)


@router.delete("/entries/{entry_id}", status_code=204)
async def delete_entry(entry_id: str, user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM entries WHERE id = ?", (entry_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Entry not found")
        _require_vault_access(conn, row["vault_id"], user_id, require_write=True)
        conn.execute("DELETE FROM entries WHERE id = ?", (entry_id,))

    log_action(user_id, "entry_deleted", "entry", entry_id)
