import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings
from database import get_db
from middleware.rate_limit import limiter
from models.user import TokenResponse, UserCreate, UserLogin, UserResponse
from services.audit_service import log_action
from services.crypto import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_kdf_salt,
    hash_master_password,
    verify_master_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)

# Origines autorisées — synchronisées avec la config CORS de main.py
_ALLOWED_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",   # Vite preview (production build)
    "http://127.0.0.1:4173",
}


def _check_origin(request: Request) -> None:
    """Vérifie l'en-tête Origin pour les requêtes state-changing (protection CSRF)."""
    origin = request.headers.get("origin")
    if origin and origin not in _ALLOWED_ORIGINS:
        raise HTTPException(status_code=403, detail="Origin not allowed")


def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload["sub"]


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        samesite="strict",
        # FIX 3 : secure activé hors développement
        secure=(settings.environment != "development"),
        max_age=7 * 24 * 3600,
        path="/",
    )


def _user_response_from_row(row) -> UserResponse:
    return UserResponse(
        id=row["id"],
        username=row["username"],
        is_admin=bool(row["is_admin"]),
        is_active=bool(row["is_active"]),
        created_at=row["created_at"],
        last_login=row.get("last_login"),
    )


# ─── Status public ─────────────────────────────────────────────────────────────

@router.get("/status", tags=["auth"])
async def auth_status():
    """Retourne si l'inscription publique est ouverte (aucun utilisateur en base)."""
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    return {"registration_open": count == 0}


# ─── Register ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("10/hour")
async def register(request: Request, response: Response, body: UserCreate):
    _check_origin(request)
    ip = request.client.host if request.client else None

    with get_db() as conn:
        # FIX 1 : BEGIN IMMEDIATE garantit qu'aucune autre transaction ne peut
        # lire ou écrire pendant notre vérification + insertion → élimine la
        # race condition sur la création du premier compte admin.
        conn.execute("BEGIN IMMEDIATE")

        user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        is_first_user = user_count == 0

        if not is_first_user:
            if not body.invite_token:
                raise HTTPException(
                    status_code=403,
                    detail="Registration is closed. An invitation is required.",
                )
            token_row = conn.execute(
                """SELECT token FROM invite_tokens
                   WHERE token = ? AND used_at IS NULL AND expires_at > ?""",
                (body.invite_token, datetime.now(timezone.utc)),
            ).fetchone()
            if not token_row:
                raise HTTPException(status_code=400, detail="Invalid or expired invitation token")

        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (body.username,)
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Username already taken")

        user_id = str(uuid.uuid4())
        kdf_salt = generate_kdf_salt()
        password_hash = hash_master_password(body.password)
        now = datetime.now(timezone.utc)
        is_admin = is_first_user

        conn.execute(
            """INSERT INTO users (id, username, master_password_hash, kdf_salt,
                                  is_admin, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, TRUE, ?)""",
            (user_id, body.username, password_hash, kdf_salt, is_admin, now),
        )

        if not is_first_user:
            conn.execute(
                "UPDATE invite_tokens SET used_at = ?, used_by = ? WHERE token = ?",
                (now, user_id, body.invite_token),
            )
        # get_db() appellera conn.commit() — valide la transaction IMMEDIATE

    log_action(user_id, "register", ip_address=ip)

    access_token = create_access_token(user_id, body.username)
    refresh_token = create_refresh_token(user_id)
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            username=body.username,
            is_admin=is_admin,
            is_active=True,
            created_at=now,
        ),
        kdf_salt=kdf_salt,
    )


# ─── Login ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, response: Response, body: UserLogin):
    _check_origin(request)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")

    with get_db() as conn:
        row = conn.execute(
            """SELECT id, username, master_password_hash, kdf_salt,
                      is_admin, is_active, created_at, last_login
               FROM users WHERE username = ?""",
            (body.username,),
        ).fetchone()

    if row is None or not verify_master_password(row["master_password_hash"], body.password):
        log_action(None, "login_failed", ip_address=ip, user_agent=ua, success=False)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bool(row["is_active"]):
        log_action(row["id"], "login_failed", ip_address=ip, user_agent=ua, success=False)
        raise HTTPException(status_code=403, detail="Account is disabled. Contact the administrator.")

    user_id = row["id"]
    now = datetime.now(timezone.utc)

    with get_db() as conn:
        conn.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user_id))

    log_action(user_id, "login", ip_address=ip, user_agent=ua)

    access_token = create_access_token(user_id, row["username"])
    refresh_token = create_refresh_token(user_id)
    _set_refresh_cookie(response, refresh_token)

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            username=row["username"],
            is_admin=bool(row["is_admin"]),
            is_active=True,
            created_at=row["created_at"],
            last_login=now,
        ),
        kdf_salt=row["kdf_salt"],
    )


# ─── Refresh ──────────────────────────────────────────────────────────────────

# FIX 4 : rate limiting sur le refresh pour éviter le maintien de session indéfini
@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh(
    request: Request,
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = payload["sub"]
    with get_db() as conn:
        row = conn.execute(
            """SELECT id, username, kdf_salt, is_admin, is_active, created_at, last_login
               FROM users WHERE id = ?""",
            (user_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=401, detail="User not found")

    if not bool(row["is_active"]):
        raise HTTPException(status_code=403, detail="Account is disabled.")

    access_token = create_access_token(user_id, row["username"])
    new_refresh = create_refresh_token(user_id)
    _set_refresh_cookie(response, new_refresh)

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            username=row["username"],
            is_admin=bool(row["is_admin"]),
            is_active=bool(row["is_active"]),
            created_at=row["created_at"],
            last_login=row["last_login"],
        ),
        kdf_salt=row["kdf_salt"],
    )


# ─── Logout ───────────────────────────────────────────────────────────────────

@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    user_id: str = Depends(get_current_user_id),
):
    _check_origin(request)
    response.delete_cookie(key="refresh_token", path="/")
    log_action(user_id, "logout")


# ─── Me ───────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def me(user_id: str = Depends(get_current_user_id)):
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, username, is_admin, is_active, created_at, last_login FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_response_from_row(row)
