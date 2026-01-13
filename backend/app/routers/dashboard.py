from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta

from app.database import get_db
from app.models import Script, Execution, System

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Get dashboard statistics."""
    
    # Scripts stats
    total_scripts = await db.execute(select(func.count(Script.id)))
    total_scripts_count = total_scripts.scalar() or 0
    
    active_scripts = await db.execute(
        select(func.count(Script.id)).where(Script.is_active == True)
    )
    active_scripts_count = active_scripts.scalar() or 0
    
    # Systems stats
    total_systems = await db.execute(select(func.count(System.id)))
    total_systems_count = total_systems.scalar() or 0
    
    active_systems = await db.execute(
        select(func.count(System.id)).where(System.is_active == True)
    )
    active_systems_count = active_systems.scalar() or 0
    
    # Executions today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    executions_today = await db.execute(
        select(func.count(Execution.id)).where(Execution.executed_at >= today_start)
    )
    executions_today_count = executions_today.scalar() or 0
    
    # === DETAILED METRICS ===
    
    # Most executed script (by total execution count)
    most_executed_result = await db.execute(
        select(Script.id, Script.name, func.count(Execution.id).label('exec_count'))
        .join(Execution, Script.id == Execution.script_id)
        .group_by(Script.id, Script.name)
        .order_by(desc('exec_count'))
        .limit(1)
    )
    most_executed = most_executed_result.first()
    most_executed_script = None
    if most_executed:
        most_executed_script = {
            "id": most_executed[0],
            "name": most_executed[1],
            "count": most_executed[2],
        }
    
    # Last executed script
    last_execution_result = await db.execute(
        select(Script.id, Script.name, Execution.executed_at)
        .join(Execution, Script.id == Execution.script_id)
        .order_by(desc(Execution.executed_at))
        .limit(1)
    )
    last_exec = last_execution_result.first()
    last_executed_script = None
    if last_exec:
        last_executed_script = {
            "id": last_exec[0],
            "name": last_exec[1],
            "executed_at": last_exec[2].isoformat() if last_exec[2] else None,
        }
    
    # System stopped for longest time - return all stopped systems
    stopped_systems_result = await db.execute(
        select(System)
        .where(System.is_active == False)
        .order_by(System.last_ping.asc().nullsfirst())
    )
    stopped_systems_list = stopped_systems_result.scalars().all()
    stopped_systems = []
    for sys in stopped_systems_list:
        stopped_systems.append({
            "id": sys.id,
            "name": sys.name,
            "last_ping": sys.last_ping.isoformat() if sys.last_ping else None,
        })
    
    # Script delayed for shortest time (most recent delay)
    scripts_result = await db.execute(
        select(Script).where(Script.is_active == True)
    )
    scripts = scripts_result.scalars().all()
    
    alerts_count = 0
    delayed_scripts = []
    
    now = datetime.utcnow()
    for script in scripts:
        latest_exec = await db.execute(
            select(Execution)
            .where(Execution.script_id == script.id)
            .order_by(Execution.executed_at.desc())
            .limit(1)
        )
        latest = latest_exec.scalar_one_or_none()
        
        if latest and latest.status == 'missed':
            alerts_count += 1
            delayed_scripts.append({
                "id": script.id,
                "name": script.name,
                "delay_seconds": None,
                "status": "missed",
                "last_execution": latest.executed_at.isoformat(),
            })
        elif script.expected_interval and latest:
            expected_next = latest.executed_at + timedelta(minutes=script.expected_interval)
            if now > expected_next:
                alerts_count += 1
                delay_time = now - expected_next
                delayed_scripts.append({
                    "id": script.id,
                    "name": script.name,
                    "delay_seconds": delay_time.total_seconds(),
                    "status": "delayed",
                    "last_execution": latest.executed_at.isoformat(),
                })
        elif script.expected_interval and not latest:
            alerts_count += 1
            delayed_scripts.append({
                "id": script.id,
                "name": script.name,
                "delay_seconds": None,
                "status": "never_ran",
                "last_execution": None,
            })
    
    # Sort delayed scripts by delay (shortest first, None values at end)
    delayed_scripts.sort(key=lambda x: x["delay_seconds"] if x["delay_seconds"] is not None else float('inf'))
    
    # Count stopped systems as alerts
    stopped_systems_count = total_systems_count - active_systems_count
    alerts_count += stopped_systems_count
    
    return {
        "scripts": {
            "active": active_scripts_count,
            "total": total_scripts_count,
        },
        "systems": {
            "active": active_systems_count,
            "total": total_systems_count,
        },
        "executions_today": executions_today_count,
        "alerts": alerts_count,
        "details": {
            "most_executed_script": most_executed_script,
            "last_executed_script": last_executed_script,
            "stopped_systems": stopped_systems,
            "delayed_scripts": delayed_scripts,
        }
    }
