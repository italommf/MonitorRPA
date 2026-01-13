from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db
from app.models import System
from app.schemas import SystemPingPayload
from app.core.notifications import notification_manager

router = APIRouter(prefix="/system", tags=["system-webhook"])


@router.post("/{token}")
async def receive_ping(
    token: str,
    payload: SystemPingPayload = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Receive a heartbeat ping from a system.
    
    If status is True (default), marks the system as active and updates last_ping.
    The system will automatically be marked as stopped if no ping is received
    within the timeout_interval.
    """
    # Find system by token
    result = await db.execute(select(System).where(System.webhook_token == token))
    system = result.scalar_one_or_none()
    
    if not system:
        raise HTTPException(status_code=404, detail="System not found")
    
    # Default payload if none provided
    if payload is None:
        payload = SystemPingPayload(status=True)
    
    # Determine if status is changing
    status_changed = system.is_active != payload.status
    
    # Record the ping in history
    from app.models import SystemPing
    ping_record = SystemPing(
        system_id=system.id,
        status=payload.status,
        client_info=payload.client_info
    )
    db.add(ping_record)
    
    # Update system status
    system.is_active = payload.status
    if payload.status:
        system.last_ping = datetime.utcnow()
    
    system.updated_at = datetime.utcnow()
    await db.commit()
    
    # Broadcast SSE event for real-time updates
    await notification_manager.broadcast("system_ping", {
        "system_id": system.id,
        "system_name": system.name,
        "is_active": system.is_active,
        "status_changed": status_changed
    })
    
    return {
        "success": True,
        "system_id": system.id,
        "system_name": system.name,
        "is_active": system.is_active,
        "last_ping": system.last_ping.isoformat() if system.last_ping else None,
    }
