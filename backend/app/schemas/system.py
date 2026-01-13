from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SystemBase(BaseModel):
    """Base schema for System."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    timeout_interval: int = Field(default=5, ge=1, le=1440)  # 1 min to 24 hours


class SystemCreate(SystemBase):
    """Schema for creating a System."""
    pass


class SystemUpdate(BaseModel):
    """Schema for updating a System."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    timeout_interval: Optional[int] = Field(None, ge=1, le=1440)


class SystemResponse(SystemBase):
    """Schema for System response."""
    id: int
    webhook_token: str
    is_active: bool
    last_ping: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SystemListResponse(BaseModel):
    """Schema for paginated System list response."""
    items: list[SystemResponse]
    total: int


class SystemPingPayload(BaseModel):
    """Schema for system ping webhook payload."""
    status: Optional[bool] = True  # True = active ping
    client_info: Optional[str] = None


class SystemPingResponse(BaseModel):
    """Schema for system ping response history."""
    id: int
    system_id: int
    timestamp: datetime
    status: bool
    client_info: Optional[str] = None

    class Config:
        from_attributes = True


class SystemPingListResponse(BaseModel):
    items: list[SystemPingResponse]
    total: int
