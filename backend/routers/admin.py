import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status

from database import get_db
from middleware.rate_limit import limiter
from models.user import (
    AdminCreateUserDirect,
    AdminUpdateUser,
    AdminUserResponse,
    InviteTokenCreate,
    InviteTokenResponse,
)
from routers.auth import get_current_user_id
from services.audit_service import log_action
from services.crypto import generate_kdf_salt, hash_master_password

router = APIRouter(prefix="/admin", tags=["admin"])


# ─── Dépendance admin ─────────────────────────────────────────────────────────

def get_current_admin_id(user_id: str = Depends(get_current_user_id)) -> str:
    with get_db() as conn:
        row = conn.execute(
            "SELECT is_admin FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if not row or not bool(row["is_admin"]):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_id


# ─── Utilisateurs ─────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[AdminUserResponse])
async def list_users(admin_id: str = Depends(get_current_admin_id)):
    with get_db() as conn:
        rows = conn.execute(
            """SELECT id, username, is_admin, is_active, created_at, last_login
               FROM users ORDER BY created_at ASC"""
        ).fetchall()
    return [
        AdminUserResponse(
            id=r["id"],
            username=r["username"],
            is_admin=bool(r["is_admin"]),
            is_active=bool(r["is_active"]),
            created_at=r["created_at"],
            last_login=r["last_login"],
        )
        for r in rows
    ]


@router.post("/users", response_model=AdminUserResponse, status_code=201)
@limiter.limit("20/hour")
async def create_user_direct(
    request: Request,
    body: AdminCreateUserDirect,
    admin_id: str = Depends(get_current_admin_id),
):
    """Option A : création directe avec mot de passe temporaire."""
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (body.username,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Username already taken")

        user_id = str(uuid.uuid4())
        kdf_salt = generate_kdf_salt()
        password_hash = hash_master_password(body.password)
        now = datetime.now(timezone.utc)

        conn.execute(
            """INSERT INTO users (id, username, master_password_hash, kdf_salt,
                                  is_admin, is_active, created_at)
               VALUES (?, ?, ?, ?, FALSE, TRUE, ?)""",
            (user_id, body.username, password_hash, kdf_salt, now),
        )

    log_action(admin_id, "admin_create_user", resource_type="user", resource_id=user_id)

    return AdminUserResponse(
        id=user_id,
        username=body.username,
        is_admin=False,
        is_active=True,
        created_at=now,
    )


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: str,
    body: AdminUpdateUser,
    admin_id: str = Depends(get_current_admin_id),
):
    if not body.username and not body.password:
        raise HTTPException(status_code=422, detail="Nothing to update")

    with get_db() as conn:
        row = conn.execute(
            "SELECT id, username, is_admin, is_active, created_at, last_login FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        if body.username and body.username != row["username"]:
            conflict = conn.execute(
                "SELECT id FROM users WHERE username = ? AND id != ?",
                (body.username, user_id),
            ).fetchone()
            if conflict:
                raise HTTPException(status_code=409, detail="Username already taken")

        # FIX 7 : si reset du mot de passe, vérifier que l'admin a confirmé la
        # perte de données (les entrées chiffrées deviendront inaccessibles)
        if body.password:
            entry_count = conn.execute(
                """SELECT COUNT(*) FROM entries e
                   JOIN vaults v ON e.vault_id = v.id
                   WHERE v.owner_id = ?""",
                (user_id,),
            ).fetchone()[0]
            if entry_count > 0 and not body.confirm_data_loss:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"This user has {entry_count} encrypted "
                        f"{'entry' if entry_count == 1 else 'entries'}. "
                        "Resetting their password will make all vault entries permanently "
                        "inaccessible. Set confirm_data_loss=true to proceed."
                    ),
                )

        updates: list = []
        params: list = []

        if body.username:
            updates.append("username = ?")
            params.append(body.username)

        if body.password:
            updates.append("master_password_hash = ?")
            params.append(hash_master_password(body.password))
            updates.append("kdf_salt = ?")
            params.append(generate_kdf_salt())

        params.append(user_id)
        conn.execute(
            f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params
        )

        updated = conn.execute(
            "SELECT id, username, is_admin, is_active, created_at, last_login FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    log_action(admin_id, "admin_update_user", resource_type="user", resource_id=user_id)

    return AdminUserResponse(
        id=updated["id"],
        username=updated["username"],
        is_admin=bool(updated["is_admin"]),
        is_active=bool(updated["is_active"]),
        created_at=updated["created_at"],
        last_login=updated["last_login"],
    )


@router.post("/users/{user_id}/deactivate", response_model=AdminUserResponse)
async def deactivate_user(
    user_id: str,
    admin_id: str = Depends(get_current_admin_id),
):
    if user_id == admin_id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    with get_db() as conn:
        row = conn.execute(
            "SELECT id, username, is_admin, is_active, created_at, last_login FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        conn.execute("UPDATE users SET is_active = FALSE WHERE id = ?", (user_id,))

    log_action(admin_id, "admin_deactivate_user", resource_type="user", resource_id=user_id)

    return AdminUserResponse(
        id=row["id"],
        username=row["username"],
        is_admin=bool(row["is_admin"]),
        is_active=False,
        created_at=row["created_at"],
        last_login=row["last_login"],
    )


@router.post("/users/{user_id}/activate", response_model=AdminUserResponse)
async def activate_user(
    user_id: str,
    admin_id: str = Depends(get_current_admin_id),
):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, username, is_admin, is_active, created_at, last_login FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        conn.execute("UPDATE users SET is_active = TRUE WHERE id = ?", (user_id,))

    log_action(admin_id, "admin_activate_user", resource_type="user", resource_id=user_id)

    return AdminUserResponse(
        id=row["id"],
        username=row["username"],
        is_admin=bool(row["is_admin"]),
        is_active=True,
        created_at=row["created_at"],
        last_login=row["last_login"],
    )


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    admin_id: str = Depends(get_current_admin_id),
):
    if user_id == admin_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    with get_db() as conn:
        row = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        # ON DELETE CASCADE supprime vaults + entries + invite_tokens
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))

    log_action(admin_id, "admin_delete_user", resource_type="user", resource_id=user_id)


# ─── Tokens d'invitation ──────────────────────────────────────────────────────

@router.post("/invites", response_model=InviteTokenResponse, status_code=201)
async def create_invite(
    body: InviteTokenCreate,
    admin_id: str = Depends(get_current_admin_id),
):
    """Option B : génère un token d'invitation à usage unique."""
    if body.expires_in_days < 1 or body.expires_in_days > 30:
        raise HTTPException(status_code=422, detail="expires_in_days must be between 1 and 30")

    token = secrets.token_hex(32)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=body.expires_in_days)

    with get_db() as conn:
        conn.execute(
            "INSERT INTO invite_tokens (token, created_by, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token, admin_id, now, expires_at),
        )

    log_action(admin_id, "admin_create_invite")

    return InviteTokenResponse(
        token=token,
        created_at=now,
        expires_at=expires_at,
    )


@router.get("/invites", response_model=List[InviteTokenResponse])
async def list_invites(admin_id: str = Depends(get_current_admin_id)):
    """Liste les invitations non utilisées et non expirées."""
    now = datetime.now(timezone.utc)
    with get_db() as conn:
        rows = conn.execute(
            """SELECT it.token, it.created_at, it.expires_at, it.used_at, u.username as used_by_username
               FROM invite_tokens it
               LEFT JOIN users u ON u.id = it.used_by
               WHERE it.used_at IS NULL AND it.expires_at > ?
               ORDER BY it.created_at DESC""",
            (now,),
        ).fetchall()

    return [
        InviteTokenResponse(
            token=r["token"],
            created_at=r["created_at"],
            expires_at=r["expires_at"],
            used_at=r["used_at"],
            used_by_username=r["used_by_username"],
        )
        for r in rows
    ]


@router.delete("/invites/{token}", status_code=204)
async def revoke_invite(
    token: str,
    admin_id: str = Depends(get_current_admin_id),
):
    with get_db() as conn:
        row = conn.execute(
            "SELECT token FROM invite_tokens WHERE token = ? AND used_at IS NULL",
            (token,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Invite token not found or already used")
        conn.execute("DELETE FROM invite_tokens WHERE token = ?", (token,))

    log_action(admin_id, "admin_revoke_invite")
