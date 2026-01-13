from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import ScriptCreate, ScriptUpdate, ScriptResponse, ScriptListResponse
from app.services import ScriptService

router = APIRouter(prefix="/scripts", tags=["scripts"])


@router.get("", response_model=ScriptListResponse)
async def list_scripts(
    search: Optional[str] = Query(None, description="Search by name"),
    filter_type: Optional[str] = Query(
        None, 
        description="Filter type",
        enum=["never_ran", "ran_today", "with_error", "delayed"]
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all monitored scripts with optional filters."""
    service = ScriptService(db)
    items, total = await service.get_all(search=search, filter_type=filter_type, skip=skip, limit=limit)
    return ScriptListResponse(items=items, total=total)


@router.get("/{script_id}", response_model=ScriptResponse)
async def get_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific script by ID."""
    service = ScriptService(db)
    script = await service.get_by_id(script_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return script


@router.post("", response_model=ScriptResponse, status_code=201)
async def create_script(
    data: ScriptCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new monitored script."""
    service = ScriptService(db)
    script = await service.create(data)
    return await service.get_by_id(script.id)


@router.put("/{script_id}", response_model=ScriptResponse)
async def update_script(
    script_id: int,
    data: ScriptUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing script."""
    service = ScriptService(db)
    script = await service.update(script_id, data)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return await service.get_by_id(script.id)


@router.delete("/{script_id}", status_code=204)
async def delete_script(
    script_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a script and all its executions."""
    service = ScriptService(db)
    deleted = await service.delete(script_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Script not found")


@router.post("/{script_id}/regenerate-token", response_model=ScriptResponse)
async def regenerate_token(
    script_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Regenerate the webhook token for a script."""
    service = ScriptService(db)
    script = await service.regenerate_token(script_id)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    return await service.get_by_id(script.id)
