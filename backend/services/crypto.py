import base64
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import argon2
from argon2 import PasswordHasher
from jose import JWTError, jwt

from config import settings

ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=1,
    hash_len=32,
    salt_len=16,
    encoding='utf-8',
)


def hash_master_password(password: str) -> str:
    return ph.hash(password)


def verify_master_password(stored_hash: str, password: str) -> bool:
    try:
        return ph.verify(stored_hash, password)
    except argon2.exceptions.VerifyMismatchError:
        return False
    except Exception:
        return False


def generate_kdf_salt() -> str:
    """Return a 32-byte random salt as base64 for client-side PBKDF2 key derivation."""
    return base64.b64encode(os.urandom(32)).decode('ascii')


def create_access_token(user_id: str, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {
        'sub': user_id,
        'username': username,
        'exp': expire,
        'type': 'access',
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )
    payload = {
        'sub': user_id,
        'exp': expire,
        'type': 'refresh',
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
    except JWTError:
        return None
