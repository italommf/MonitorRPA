from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import ExecutionResponse, ExecutionListResponse
from app.services import ScriptService, ExecutionService

router = APIRouter(prefix="/scripts", tags=["executions"])


@router.get("/{script_id}/executions", response_model=ExecutionListResponse)
async def list_executions(
    script_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List all executions for a specific script."""
    script_service = ScriptService(db)
    execution_service = ExecutionService(db)
    
    # Verify script exists
    script = await script_service.get_by_id(script_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    items, total = await execution_service.get_by_script(script_id, skip=skip, limit=limit)
    return ExecutionListResponse(
        items=[ExecutionResponse.model_validate(e) for e in items],
        total=total,
    )


@router.get("/executions/{execution_id}", response_model=ExecutionResponse)
async def get_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get details of a specific execution."""
    execution_service = ExecutionService(db)
    execution = await execution_service.get_by_id(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return ExecutionResponse.model_validate(execution)
