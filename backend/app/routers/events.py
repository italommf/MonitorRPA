import asyncio
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from app.core.notifications import notification_manager

router = APIRouter(tags=["events"])

@router.get("/events")
async def events(request: Request):
    """
    SSE endpoint to receive real-time updates.
    The frontend should listen to this endpoint.
    """
    async def event_generator():
        queue = await notification_manager.subscribe()
        try:
            while True:
                # Check if client is still connected
                if await request.is_disconnected():
                    break
                
                try:
                    # Wait for a message from the manager
                    # Use a timeout so we can periodically check for disconnection
                    message = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield message
                except asyncio.TimeoutError:
                    # Send a heartbeat to keep connection alive
                    yield ": heartbeat\n\n"
                    
        finally:
            notification_manager.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        }
    )
