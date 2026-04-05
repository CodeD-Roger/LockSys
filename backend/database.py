import os
import threading
from contextlib import contextmanager
from typing import Generator

try:
    from sqlcipher3 import dbapi2 as sqlite3
    SQLCIPHER_AVAILABLE = True
except ImportError:
    import sqlite3  # type: ignore
    SQLCIPHER_AVAILABLE = False
    import warnings
    warnings.warn(
        "sqlcipher3 not available — falling back to unencrypted SQLite. "
        "Install sqlcipher3 for encrypted database at rest.",
        RuntimeWarning,
        stacklevel=2,
    )

from config import settings

_local = threading.local()


def _get_raw_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.db_path, check_same_thread=False)
    if SQLCIPHER_AVAILABLE:
        conn.execute(f"PRAGMA key='{settings.db_key}'")
        conn.execute("PRAGMA cipher_page_size = 4096")
        conn.execute("PRAGMA kdf_iter = 256000")
        conn.execute("PRAGMA cipher_hmac_algorithm = HMAC_SHA512")
        conn.execute("PRAGMA cipher_kdf_algorithm = PBKDF2_HMAC_SHA512")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = _get_raw_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    os.makedirs(os.path.dirname(os.path.abspath(settings.db_path)), exist_ok=True)
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                master_password_hash TEXT NOT NULL,
                kdf_salt TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS invite_tokens (
                token TEXT PRIMARY KEY,
                created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP,
                used_by TEXT REFERENCES users(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS vaults (
                id TEXT PRIMARY KEY,
                owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT,
                is_shared BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS vault_members (
                vault_id TEXT REFERENCES vaults(id) ON DELETE CASCADE,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                role TEXT CHECK(role IN ('viewer', 'editor', 'admin')),
                PRIMARY KEY (vault_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                vault_id TEXT NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
                created_by TEXT NOT NULL REFERENCES users(id),
                encrypted_data TEXT NOT NULL,
                iv TEXT NOT NULL,
                entry_type TEXT DEFAULT 'login' CHECK(entry_type IN ('login', 'note', 'card', 'identity')),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id),
                action TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                ip_address TEXT,
                user_agent TEXT,
                success BOOLEAN,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_vaults_owner ON vaults(owner_id);
            CREATE INDEX IF NOT EXISTS idx_entries_vault ON entries(vault_id);
            CREATE INDEX IF NOT EXISTS idx_entries_created_by ON entries(created_by);
            CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_invite_tokens_created_by ON invite_tokens(created_by);
        """)

        # Safe migration for databases created before is_admin/is_active columns existed
        for col, definition in [
            ("is_admin", "BOOLEAN DEFAULT FALSE"),
            ("is_active", "BOOLEAN DEFAULT TRUE"),
        ]:
            try:
                conn.execute(f"ALTER TABLE users ADD COLUMN {col} {definition}")
            except Exception:
                pass  # Column already exists
