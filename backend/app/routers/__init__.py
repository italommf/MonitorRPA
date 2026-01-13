from app.routers.scripts import router as scripts_router
from app.routers.webhook import router as webhook_router
from app.routers.executions import router as executions_router
from app.routers.responsibles import router as responsibles_router
from app.routers.events import router as events_router
from app.routers.systems import router as systems_router
from app.routers.system_webhook import router as system_webhook_router
from app.routers.dashboard import router as dashboard_router

__all__ = [
    "scripts_router",
    "webhook_router",
    "executions_router",
    "responsibles_router",
    "events_router",
    "systems_router",
    "system_webhook_router",
    "dashboard_router",
]
