import sys
import uuid
from typing import Optional

from database import get_db


def log_action(
    user_id: Optional[str],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    success: bool = True,
) -> None:
    """Write an audit log entry. Never raises — audit failures must not crash request handling."""
    try:
        with get_db() as conn:
            conn.execute(
                """INSERT INTO audit_logs
                   (id, user_id, action, resource_type, resource_id,
                    ip_address, user_agent, success)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    str(uuid.uuid4()),
                    user_id,
                    action,
                    resource_type,
                    resource_id,
                    ip_address,
                    user_agent,
                    success,
                ),
            )
    except Exception as exc:
        # FIX 14 : log to stderr instead of silently swallowing failures
        print(f"[audit] WARNING: failed to write audit log (action={action}): {exc}", file=sys.stderr)
