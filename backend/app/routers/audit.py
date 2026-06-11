from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models.audit import AuditLog
from app.models.user import User


router = APIRouter(prefix="/audit-logs", tags=["audit"])


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_id: int | None
    actor_email: str | None
    action: str
    entity_type: str | None
    entity_id: int | None
    details: str | None
    created_at: datetime


@router.get("/", response_model=list[AuditLogOut])
def list_audit_logs(
    action: str | None = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(min(limit, 500)).all()
