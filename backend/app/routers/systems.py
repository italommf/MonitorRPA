from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime
import uuid

from app.database import get_db
from app.models import System
from app.schemas import SystemCreate, SystemUpdate, SystemResponse, SystemListResponse, SystemPingListResponse

router = APIRouter(prefix="/systems", tags=["systems"])


@router.get("", response_model=SystemListResponse)
async def list_systems(
    search: Optional[str] = Query(None, description="Search by name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all systems with optional search."""
    query = select(System)
    count_query = select(func.count(System.id))
    
    if search:
        query = query.where(System.name.ilike(f"%{search}%"))
        count_query = count_query.where(System.name.ilike(f"%{search}%"))
    
    query = query.order_by(System.name).offset(skip).limit(limit)
    
    result = await db.execute(query)
    systems = result.scalars().all()
    
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    return SystemListResponse(items=systems, total=total)


@router.post("", response_model=SystemResponse, status_code=201)
async def create_system(
    system_data: SystemCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new system."""
    system = System(
        name=system_data.name,
        description=system_data.description,
        timeout_interval=system_data.timeout_interval,
        webhook_token=str(uuid.uuid4()),
        is_active=False,  # Default to stopped
    )
    
    db.add(system)
    await db.commit()
    await db.refresh(system)
    
    return system


@router.get("/{system_id}", response_model=SystemResponse)
async def get_system(
    system_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a system by ID."""
    result = await db.execute(select(System).where(System.id == system_id))
    system = result.scalar_one_or_none()
    
    if not system:
        raise HTTPException(status_code=404, detail="System not found")
    
    return system


@router.put("/{system_id}", response_model=SystemResponse)
async def update_system(
    system_id: int,
    system_data: SystemUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a system."""
    result = await db.execute(select(System).where(System.id == system_id))
    system = result.scalar_one_or_none()
    
    if not system:
        raise HTTPException(status_code=404, detail="System not found")
    
    update_data = system_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(system, field, value)
    
    system.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(system)
    
    return system


@router.delete("/{system_id}", status_code=204)
async def delete_system(
    system_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a system."""
    result = await db.execute(select(System).where(System.id == system_id))
    system = result.scalar_one_or_none()
    
    if not system:
        raise HTTPException(status_code=404, detail="System not found")
    
    await db.delete(system)
    await db.commit()


@router.post("/{system_id}/regenerate-token", response_model=SystemResponse)
async def regenerate_token(
    system_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Regenerate a system's webhook token."""
    result = await db.execute(select(System).where(System.id == system_id))
    system = result.scalar_one_or_none()
    
    if not system:
        raise HTTPException(status_code=404, detail="System not found")
    
    system.webhook_token = str(uuid.uuid4())
    system.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(system)
    
    return system


@router.get("/{system_id}/pings", response_model=SystemPingListResponse)
async def list_system_pings(
    system_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List ping history for a specific system."""
    from app.models import SystemPing
    
    # Check if system exists
    result = await db.execute(select(System).where(System.id == system_id))
    system = result.scalar_one_or_none()
    if not system:
        raise HTTPException(status_code=404, detail="System not found")
        
    query = select(SystemPing).where(SystemPing.system_id == system_id)
    count_query = select(func.count(SystemPing.id)).where(SystemPing.system_id == system_id)
    
    query = query.order_by(SystemPing.timestamp.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    pings = result.scalars().all()
    
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    return SystemPingListResponse(items=pings, total=total)
