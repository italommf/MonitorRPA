from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import WebhookPayload, WebhookResponse
from app.services import ScriptService, ExecutionService

router = APIRouter(tags=["webhook"])


@router.post("/webhook/{token}", response_model=WebhookResponse)
async def receive_webhook(
    token: str,
    payload: WebhookPayload = WebhookPayload(),
    db: AsyncSession = Depends(get_db),
):
    """
    Receive execution notification from a script.
    
    This is the single webhook endpoint that all scripts use.
    Each script has a unique token for identification.
    
    The payload is flexible and can contain:
    - status: "success", "error", or "warning" (default: "success")
    - duration_ms: execution duration in milliseconds
    - error_message: error details if status is "error"
    - data: any additional JSON data
    """
    script_service = ScriptService(db)
    execution_service = ExecutionService(db)
    
    # Validate token
    script = await script_service.get_by_token(token)
    if not script:
        raise HTTPException(status_code=404, detail="Invalid webhook token")
    
    if not script.is_active:
        raise HTTPException(status_code=403, detail="Script is inactive")
    
    # Create execution record
    execution = await execution_service.create_from_webhook(script, payload)
    
    return WebhookResponse(
        success=True,
        message=f"Execution recorded for script '{script.name}'",
        execution_id=execution.id,
    )
