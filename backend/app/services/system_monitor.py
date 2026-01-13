"""
System Monitor Service

Background service that periodically checks systems and marks them as stopped
if they haven't received a ping within their timeout_interval.
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select

from app.database import async_session
from app.models import System


async def check_system_timeouts():
    """Check all systems and mark as stopped if timeout exceeded."""
    async with async_session() as db:
        try:
            result = await db.execute(
                select(System).where(System.is_active == True)
            )
            systems = result.scalars().all()
            
            now = datetime.utcnow()
            
            for system in systems:
                if system.last_ping:
                    timeout_threshold = system.last_ping + timedelta(minutes=system.timeout_interval)
                    if now > timeout_threshold:
                        system.is_active = False
                        system.updated_at = now
                        
                        # Record 'stopped' event in history
                        from app.models import SystemPing
                        ping_record = SystemPing(
                            system_id=system.id,
                            status=False,
                            client_info="System timeout detector"
                        )
                        db.add(ping_record)
                        
                        from app.core.notifications import notification_manager
                        asyncio.create_task(notification_manager.broadcast("system_ping", {
                            "system_id": system.id,
                            "system_name": system.name,
                            "is_active": False,
                            "status_changed": True
                        }))
                        
                        print(f"[SystemMonitor] System '{system.name}' marked as stopped (timeout)")
                else:
                    # No ping received yet, mark as stopped
                    system.is_active = False
                    system.updated_at = now
            
            await db.commit()
        except Exception as e:
            print(f"[SystemMonitor] Error checking system timeouts: {e}")
            await db.rollback()


async def system_monitor_loop():
    """Main monitoring loop."""
    print("[SystemMonitor] Starting system monitor...")
    while True:
        try:
            await check_system_timeouts()
        except Exception as e:
            print(f"[SystemMonitor] Unexpected error in loop: {e}")
        await asyncio.sleep(30)  # Check every 30 seconds


def start_system_monitor():
    """Start the system monitor background task."""
    # Run in the main event loop
    asyncio.create_task(system_monitor_loop())
    print("[SystemMonitor] System monitor task scheduled")
