from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Any

# ============ Responsible Schemas ============

class ResponsibleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["João Silva"])

class ResponsibleCreate(ResponsibleBase):
    pass

class ResponsibleResponse(ResponsibleBase):
    id: int
    created_at: datetime
    
    model_config = {"from_attributes": True}


# ============ Script Schemas ============

class ScriptCreate(BaseModel):
    """Schema for creating a new script."""
    name: str = Field(..., min_length=1, max_length=255, examples=["Daily Backup Script"])
    description: Optional[str] = Field(None, examples=["Runs backup every night at 2am"])
    expected_interval: Optional[int] = Field(None, ge=1, examples=[60], description="Expected interval in minutes")
    responsible_id: Optional[int] = Field(None, examples=[1])
    frequency: Optional[str] = Field(None, examples=["daily"], description="daily, weekly, biweekly, monthly, custom, scheduled")
    scheduled_times: Optional[str] = Field(None, examples=["09:00,14:00,18:00"], description="Comma-separated times")
    calculate_average_time: bool = Field(False, examples=[True])


class ScriptUpdate(BaseModel):
    """Schema for updating an existing script."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    expected_interval: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None
    responsible_id: Optional[int] = None
    frequency: Optional[str] = None
    scheduled_times: Optional[str] = None
    calculate_average_time: Optional[bool] = None


class ScriptResponse(BaseModel):
    """Schema for script response with computed fields."""
    id: int
    name: str
    description: Optional[str]
    webhook_token: str
    expected_interval: Optional[int]
    is_active: bool
    responsible_id: Optional[int]
    frequency: Optional[str]
    scheduled_times: Optional[str] = None
    calculate_average_time: bool
    created_at: datetime
    updated_at: datetime
    last_execution: Optional[datetime] = None
    last_status: Optional[str] = None
    is_delayed: bool = False
    execution_count: int = 0
    
    # Nested responsible if joined
    responsible: Optional[ResponsibleResponse] = None
    
    model_config = {"from_attributes": True}


class ScriptListResponse(BaseModel):
    """Schema for listing scripts with pagination."""
    items: list[ScriptResponse]
    total: int


# ============ Execution Schemas ============

class ExecutionCreate(BaseModel):
    """Schema for internal execution creation."""
    script_id: int
    status: str = "success"
    payload: Optional[str] = None
    duration_ms: Optional[int] = None
    error_message: Optional[str] = None


class ExecutionResponse(BaseModel):
    """Schema for execution response."""
    id: int
    script_id: int
    executed_at: datetime
    status: str
    payload: Optional[str]
    duration_ms: Optional[int]
    error_message: Optional[str]
    
    model_config = {"from_attributes": True}


class ExecutionListResponse(BaseModel):
    """Schema for listing executions with pagination."""
    items: list[ExecutionResponse]
    total: int


# ============ Webhook Schemas ============

class WebhookPayload(BaseModel):
    """Flexible schema for webhook payload from scripts."""
    status: Optional[str] = Field("success", examples=["success", "error", "warning"])
    duration_ms: Optional[int] = Field(None, ge=0, examples=[1500])
    start_time: Optional[datetime] = Field(None, description="ISO format start time for duration calculation")
    error_message: Optional[str] = Field(None, examples=["Connection timeout"])
    data: Optional[Any] = Field(None, description="Any additional JSON data")
    
    model_config = {"extra": "allow"}  # Allow any extra fields


class WebhookResponse(BaseModel):
    """Response after webhook is processed."""
    success: bool
    message: str
    execution_id: int
