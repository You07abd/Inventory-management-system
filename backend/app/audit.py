"""Helper for writing append-only audit entries.

Call `record_audit(...)` before `db.commit()` so the audit row commits atomically
with the action it describes.
"""

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User


def record_audit(
    db: Session,
    actor: User | None,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    details: str | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor.id if actor else None,
            actor_email=actor.email if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
        )
    )
