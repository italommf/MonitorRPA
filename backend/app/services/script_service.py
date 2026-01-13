import json
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models import Script, Execution, Responsible
from app.schemas import (
    ScriptCreate, ScriptUpdate, ScriptResponse, 
    WebhookPayload, ResponsibleCreate, ResponsibleResponse
)
from app.core.notifications import notification_manager


class ResponsibleService:
    """Service layer for responsible operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        
    async def get_all(self) -> list[Responsible]:
        """Get all responsibles."""
        query = select(Responsible).order_by(Responsible.name)
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_by_id(self, responsible_id: int) -> Optional[Responsible]:
        """Get a responsible by ID."""
        query = select(Responsible).where(Responsible.id == responsible_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
        
    async def create(self, data: ResponsibleCreate) -> Responsible:
        """Create a new responsible."""
        responsible = Responsible(name=data.name)
        self.db.add(responsible)
        await self.db.commit()
        await self.db.refresh(responsible)
        return responsible
    
    async def delete(self, responsible_id: int) -> bool:
        """Delete a responsible by ID."""
        query = select(Responsible).where(Responsible.id == responsible_id)
        result = await self.db.execute(query)
        responsible = result.scalar_one_or_none()
        
        if not responsible:
            return False
        
        await self.db.delete(responsible)
        await self.db.commit()
        return True


class ScriptService:
    """Service layer for script operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    @staticmethod
    def _get_now_local() -> datetime:
        """Helper to get current time in Natal, RN (UTC-3)."""
        return datetime.utcnow() - timedelta(hours=3)

    @staticmethod
    def _is_script_delayed(script: Script, last_exec: Optional[Execution], now_utc: datetime) -> bool:
        """Helper to determine if a script is delayed based on its frequency."""
        if not script.is_active:
            return False
            
        # Get local time and local start of day (Natal - RN: UTC-3)
        now_local = now_utc - timedelta(hours=3)
        last_exec_at_local = last_exec.executed_at - timedelta(hours=3) if last_exec else None
        
        freq = (script.frequency or "").strip().lower()

        # Frequency-based rules
        if freq == "daily":
            # Must have run today in local time
            today_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
            res = not last_exec_at_local or last_exec_at_local < today_start_local
            return res
            
        if freq == "weekly":
            # Must have run this week (starting Monday) in local time
            days_since_monday = now_local.weekday()
            week_start_local = (now_local - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
            return not last_exec_at_local or last_exec_at_local < week_start_local
            
        if freq == "monthly":
            # Must have run this month in local time
            month_start_local = now_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            return not last_exec_at_local or last_exec_at_local < month_start_local
            
        if freq == "biweekly":
            # Must have run in current fortnight (1-15 or 16-end) in local time
            if now_local.day <= 15:
                fortnight_start_local = now_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                fortnight_start_local = now_local.replace(day=16, hour=0, minute=0, second=0, microsecond=0)
            return not last_exec_at_local or last_exec_at_local < fortnight_start_local
            
        if freq == "custom":
            # Use expected_interval (minutes)
            if not script.expected_interval:
                return False
            # Interval is relative, so we can use UTC or local consistently
            if not last_exec:
                return True
            expected_time = last_exec.executed_at + timedelta(minutes=script.expected_interval)
            return now_utc > expected_time
            
        if freq == "scheduled":
            if not script.scheduled_times:
                return False
            
            # Parse times like "09:00,14:00"
            times = [t.strip() for t in script.scheduled_times.split(",")]
            # Boundary must be local today
            today_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Find the latest scheduled time that should have passed today local
            passed_schedules_local = []
            for t_str in times:
                try:
                    h, m = map(int, t_str.split(":"))
                    sched_time_local = today_start_local.replace(hour=h, minute=m)
                    if sched_time_local <= now_local:
                        passed_schedules_local.append(sched_time_local)
                except:
                    continue
            
            if not passed_schedules_local:
                return False # No schedule for today local has passed yet
                
            latest_sched_local = max(passed_schedules_local)
            return not last_exec_at_local or last_exec_at_local < latest_sched_local

        # Default fallback for old records or unspecified frequency
        if script.expected_interval:
            if not last_exec:
                return True
            expected_time = last_exec.executed_at + timedelta(minutes=script.expected_interval)
            res = now_utc > expected_time
            # print(f"DEBUG_SVC:   Interval fallback: res={res}")
            return res
            
        return False

    @staticmethod
    def _get_effective_status(script: Script, last_exec: Optional[Execution], now: datetime) -> str:
        """Helper to determine the current tag for the script."""
        if not script.is_active:
            return "default"
            
        last_exec_at = last_exec.executed_at if last_exec else None
        
        # If the last real execution was an error, keep it as error until it succeeds
        if last_exec and last_exec.status == "error":
            return "error"
            
        # Check if delayed/missed cycle
        is_delayed = ScriptService._is_script_delayed(script, last_exec, now)
        
        freq = (script.frequency or "").strip().lower()
        
        if not is_delayed:
            return "success" # Label: Executado
            
        # If it should have run by now
        if freq in ["daily", "weekly", "monthly", "biweekly"]:
            # If it's a "missed" entry in history, it would be 'missed'
            if last_exec and last_exec.status == "missed":
                return "missed"
            return "pending" # Label: Ainda não rodou
            
        if freq == "custom" or script.expected_interval:
            return "delayed" # Label: Atrasado
            
        return "pending"

    async def get_all(
        self, 
        search: Optional[str] = None,
        filter_type: Optional[str] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> tuple[list[ScriptResponse], int]:
        """Get all scripts with optional search and filters."""
        
        # Base query
        query = select(Script).options(
            selectinload(Script.executions),
            joinedload(Script.responsible)
        )
        count_query = select(func.count(Script.id))
        
        # Search filter
        if search:
            search_filter = Script.name.ilike(f"%{search}%")
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)
        
        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Execute main query
        query = query.order_by(desc(Script.updated_at)).offset(skip).limit(limit)
        result = await self.db.execute(query)
        scripts = result.scalars().all()
        
        # Build response with computed fields
        now = datetime.utcnow()
        response_items = []
        
        for script in scripts:
            # Sort executions here to be extra safe about the order
            sorted_execs = sorted(script.executions, key=lambda x: x.executed_at, reverse=True)
            last_exec = sorted_execs[0] if sorted_execs else None
            
            # Check if delayed using helper
            is_delayed = self._is_script_delayed(script, last_exec, now)
            
            # Apply filter
            if filter_type:
                if filter_type == "never_ran" and last_exec:
                    continue
                elif filter_type == "ran_today" and (not last_exec or last_exec.executed_at.date() != now.date()):
                    continue
                elif filter_type == "with_error" and (not last_exec or last_exec.status != "error"):
                    continue
                elif filter_type == "delayed" and not is_delayed:
                    continue
            
            response_items.append(ScriptResponse(
                id=script.id,
                name=script.name,
                description=script.description,
                webhook_token=script.webhook_token,
                expected_interval=script.expected_interval,
                is_active=script.is_active,
                responsible_id=script.responsible_id,
                frequency=script.frequency,
                scheduled_times=script.scheduled_times,
                calculate_average_time=script.calculate_average_time,
                created_at=script.created_at,
                updated_at=script.updated_at,
                last_execution=last_exec.executed_at if last_exec else None,
                last_status=self._get_effective_status(script, last_exec, now),
                is_delayed=is_delayed,
                execution_count=len(script.executions),
                responsible=ResponsibleResponse.model_validate(script.responsible) if script.responsible else None
            ))
        
        return response_items, len(response_items) if filter_type else total
    
    async def get_by_id(self, script_id: int) -> Optional[ScriptResponse]:
        """Get a script by ID."""
        query = select(Script).options(
            selectinload(Script.executions),
            joinedload(Script.responsible)
        ).where(Script.id == script_id)
        result = await self.db.execute(query)
        script = result.scalar_one_or_none()
        
        if not script:
            return None
        
        # Build response
        now = datetime.utcnow()
        sorted_execs = sorted(script.executions, key=lambda x: x.executed_at, reverse=True)
        last_exec = sorted_execs[0] if sorted_execs else None
        is_delayed = self._is_script_delayed(script, last_exec, now)
        
        return ScriptResponse(
            id=script.id,
            name=script.name,
            description=script.description,
            webhook_token=script.webhook_token,
            expected_interval=script.expected_interval,
            is_active=script.is_active,
            responsible_id=script.responsible_id,
            frequency=script.frequency,
            scheduled_times=script.scheduled_times,
            calculate_average_time=script.calculate_average_time,
            created_at=script.created_at,
            updated_at=script.updated_at,
            last_execution=last_exec.executed_at if last_exec else None,
            last_status=self._get_effective_status(script, last_exec, now),
            is_delayed=is_delayed,
            execution_count=len(script.executions),
            responsible=ResponsibleResponse.model_validate(script.responsible) if script.responsible else None
        )
    
    async def get_by_token(self, token: str) -> Optional[Script]:
        """Get a script by webhook token."""
        query = select(Script).where(Script.webhook_token == token)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def create(self, data: ScriptCreate) -> Script:
        """Create a new script."""
        script = Script(
            name=data.name,
            description=data.description,
            expected_interval=data.expected_interval,
            responsible_id=data.responsible_id,
            frequency=data.frequency,
            scheduled_times=data.scheduled_times,
            calculate_average_time=data.calculate_average_time
        )
        self.db.add(script)
        await self.db.commit()
        await self.db.refresh(script)
        return script
    
    async def update(self, script_id: int, data: ScriptUpdate) -> Optional[Script]:
        """Update an existing script."""
        query = select(Script).where(Script.id == script_id)
        result = await self.db.execute(query)
        script = result.scalar_one_or_none()
        
        if not script:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(script, field, value)
        
        script.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(script)
        return script
    
    async def delete(self, script_id: int) -> bool:
        """Delete a script."""
        query = select(Script).where(Script.id == script_id)
        result = await self.db.execute(query)
        script = result.scalar_one_or_none()
        
        if not script:
            return False
        
        await self.db.delete(script)
        await self.db.commit()
        return True
    
    async def regenerate_token(self, script_id: int) -> Optional[Script]:
        """Regenerate webhook token for a script."""
        import uuid
        
        query = select(Script).where(Script.id == script_id)
        result = await self.db.execute(query)
        script = result.scalar_one_or_none()
        
        if not script:
            return None
        
        script.webhook_token = str(uuid.uuid4())
        script.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(script)
        return script


class ExecutionService:
    """Service layer for execution operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_script(
        self,
        script_id: int,
        skip: int = 0,
        limit: int = 50
    ) -> tuple[list[Execution], int]:
        """Get executions for a script."""
        # Count
        count_query = select(func.count(Execution.id)).where(Execution.script_id == script_id)
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Get executions
        query = (
            select(Execution)
            .where(Execution.script_id == script_id)
            .order_by(desc(Execution.executed_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)
        executions = result.scalars().all()
        
        return list(executions), total
    
    async def get_by_id(self, execution_id: int) -> Optional[Execution]:
        """Get execution by ID."""
        query = select(Execution).where(Execution.id == execution_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def create_from_webhook(self, script: Script, payload: WebhookPayload) -> Execution:
        """Create execution from webhook payload."""
        # Calculate duration if start_time is provided
        duration_ms = payload.duration_ms
        if payload.start_time and not duration_ms:
            now = datetime.utcnow()
            # Ensure start_time is aware or both are naive
            start = payload.start_time.replace(tzinfo=None)
            diff = now - start
            duration_ms = int(diff.total_seconds() * 1000)

        # Serialize full payload to JSON
        payload_json = json.dumps(payload.model_dump(), default=str)
        
        execution = Execution(
            script_id=script.id,
            status=payload.status or "success",
            payload=payload_json,
            duration_ms=duration_ms,
            error_message=payload.error_message,
        )
        
        self.db.add(execution)
        
        # Update script timestamp
        script.updated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(execution)
        
        # Notify subscribers about the new execution
        await notification_manager.broadcast("webhook_received", {
            "script_id": script.id,
            "script_name": script.name,
            "execution_id": execution.id,
            "status": execution.status
        })

        return execution
