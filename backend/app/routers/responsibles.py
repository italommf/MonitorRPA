from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.schemas import ResponsibleCreate, ResponsibleResponse
from app.services.script_service import ResponsibleService

router = APIRouter(tags=["responsibles"])


@router.get("/responsibles", response_model=list[ResponsibleResponse])
async def get_responsibles(db: AsyncSession = Depends(get_db)):
    """Get all responsibles."""
    service = ResponsibleService(db)
    responsibles = await service.get_all()
    return responsibles


@router.post("/responsibles", response_model=ResponsibleResponse)
async def create_responsible(
    data: ResponsibleCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new responsible person."""
    service = ResponsibleService(db)
    try:
        return await service.create(data)
    except Exception as e:
        if "UNIQUE constraint failed" in str(e) or "already exists" in str(e).lower():
            raise HTTPException(status_code=400, detail="Responsible already exists")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/responsibles/{responsible_id}")
async def delete_responsible(
    responsible_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a responsible person."""
    service = ResponsibleService(db)
    deleted = await service.delete(responsible_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Responsible not found")
    return {"success": True, "message": "Responsible deleted"}
