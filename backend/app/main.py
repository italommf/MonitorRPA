from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import (
    scripts_router,
    webhook_router,
    executions_router,
    responsibles_router,
    events_router,
    systems_router,
    system_webhook_router,
    dashboard_router,
)
from app.services.monitoring_service import start_monitor
from app.services.system_monitor import start_system_monitor

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: Initialize database
    await init_db()
    # Start background monitors
    start_monitor()
    start_system_monitor()
    yield
    # Shutdown: Cleanup if needed


app = FastAPI(
    title="MonitorRPA API",
    description="API para monitoramento de execução de scripts e robôs via webhooks",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scripts_router, prefix=settings.API_PREFIX)
app.include_router(executions_router, prefix=settings.API_PREFIX)
app.include_router(responsibles_router, prefix=settings.API_PREFIX)
app.include_router(events_router, prefix=settings.API_PREFIX)
app.include_router(systems_router, prefix=settings.API_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_PREFIX)
app.include_router(webhook_router)  # Script webhook at root level
app.include_router(system_webhook_router)  # System webhook at root level


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "MonitorRPA API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "ok",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
