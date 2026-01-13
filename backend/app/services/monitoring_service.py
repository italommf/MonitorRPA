import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Script, Execution
from app.database import async_session
from app.services.script_service import ScriptService
import logging

logger = logging.getLogger(__name__)

async def check_missed_executions():
    """
    Background task to check all scripts and record 'missed' executions 
    if they passed their expected period without running.
    """
    while True:
        try:
            async with async_session() as db:
                # 1. Get all active scripts
                query = select(Script).where(Script.is_active == True)
                result = await db.execute(query)
                scripts = result.scalars().all()
                
                now_utc = datetime.utcnow()
                now_local = now_utc - timedelta(hours=3)
                
                for script in scripts:
                    # 2. Get last execution (including missed ones)
                    exec_query = select(Execution).where(Execution.script_id == script.id).order_by(desc(Execution.executed_at)).limit(1)
                    exec_result = await db.execute(exec_query)
                    last_exec = exec_result.scalar_one_or_none()
                    
                    # Store everything in local time for logic
                    last_exec_at_utc = last_exec.executed_at if last_exec else script.created_at
                    last_exec_at_local = last_exec_at_utc - timedelta(hours=3)
                    
                    # 3. Calculate missing periods based on frequency
                    missed_periods_local = []
                    
                    if script.frequency == "daily":
                        # Check missed days between last_exec_at and today (in local time)
                        current_check_local = last_exec_at_local.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
                        today_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
                        
                        while current_check_local < today_start_local:
                            missed_periods_local.append(current_check_local.replace(hour=23, minute=59, second=59))
                            current_check_local += timedelta(days=1)
                            
                    elif script.frequency == "weekly":
                        # Monday start (local)
                        days_since_monday = last_exec_at_local.weekday()
                        current_week_start_local = (last_exec_at_local - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
                        next_week_start_local = current_week_start_local + timedelta(weeks=1)
                        
                        this_week_start_local = (now_local - timedelta(days=now_local.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
                        
                        while next_week_start_local < this_week_start_local:
                            missed_periods_local.append(next_week_start_local - timedelta(seconds=1))
                            next_week_start_local += timedelta(weeks=1)
                            
                    elif script.frequency == "monthly":
                        # Monthly (local)
                        current_month_start_local = last_exec_at_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                        next_month_start_local = (current_month_start_local + timedelta(days=32)).replace(day=1)
                        
                        this_month_start_local = now_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                        
                        while next_month_start_local < this_month_start_local:
                            missed_periods_local.append(next_month_start_local - timedelta(seconds=1))
                            next_month_start_local = (next_month_start_local + timedelta(days=32)).replace(day=1)

                    elif script.frequency == "biweekly":
                        # Biweekly 1-15 or 16-end (local)
                        if last_exec_at_local.day <= 15:
                            current_fortnight_start_local = last_exec_at_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                            next_fortnight_start_local = current_fortnight_start_local.replace(day=16)
                        else:
                            current_fortnight_start_local = last_exec_at_local.replace(day=16, hour=0, minute=0, second=0, microsecond=0)
                            next_fortnight_start_local = (current_fortnight_start_local + timedelta(days=20)).replace(day=1)

                        if now_local.day <= 15:
                            this_fortnight_start_local = now_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                        else:
                            this_fortnight_start_local = now_local.replace(day=16, hour=0, minute=0, second=0, microsecond=0)

                        while next_fortnight_start_local < this_fortnight_start_local:
                            missed_periods_local.append(next_fortnight_start_local - timedelta(seconds=1))
                            if next_fortnight_start_local.day == 1:
                                next_fortnight_start_local = next_fortnight_start_local.replace(day=16)
                            else:
                                next_fortnight_start_local = (next_fortnight_start_local + timedelta(days=20)).replace(day=1)
                            
                    elif script.frequency == "scheduled" and script.scheduled_times:
                        # Scheduled times (local)
                        times = [t.strip() for t in script.scheduled_times.split(",")]
                        start_date_local = last_exec_at_local.date()
                        end_date_local = now_local.date()
                        
                        curr_date_local = start_date_local
                        while curr_date_local <= end_date_local:
                            for t_str in times:
                                try:
                                    h, m = map(int, t_str.split(":"))
                                    sched_dt_local = datetime.combine(curr_date_local, datetime.min.time().replace(hour=h, minute=m))
                                    
                                    if sched_dt_local < now_local and sched_dt_local > last_exec_at_local:
                                        missed_periods_local.append(sched_dt_local)
                                except:
                                    continue
                            curr_date_local += timedelta(days=1)
                            
                    # 4. Create missed executions (convert back to UTC)
                    for period_end_local in missed_periods_local:
                        period_end_utc = period_end_local + timedelta(hours=3)
                        # Check if we already recorded a missed execution for near this time to avoid duplicates
                        # (A simple check for performance: is there ANY execution in that calendar day/week?)
                        # Actually, since we are moving forward from last_exec_at, it should be fine.
                        
                        missed_exec = Execution(
                            script_id=script.id,
                            status="missed",
                            executed_at=period_end_utc,
                            error_message="Período encerrado sem execução detectada."
                        )
                        db.add(missed_exec)
                        logger.info(f"Recorded MISSED execution for script {script.id} ({script.name}) at {period_end_utc}")

                await db.commit()
                
        except Exception as e:
            logger.error(f"Error in background monitor check: {e}")
            
        # Run every 10 minutes (or shorter for testing)
        await asyncio.sleep(600)

def start_monitor():
    """Start the background monitor task."""
    asyncio.create_task(check_missed_executions())
