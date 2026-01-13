import asyncio
from typing import List

class NotificationManager:
    """Manages SSE connections for real-time updates."""
    def __init__(self):
        self.active_connections: List[asyncio.Queue] = []

    async def subscribe(self) -> asyncio.Queue:
        """Subscribe to notifications."""
        queue = asyncio.Queue()
        self.active_connections.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        """Unsubscribe from notifications."""
        if queue in self.active_connections:
            self.active_connections.remove(queue)

    async def broadcast(self, event_type: str, data: dict = None):
        """Broadcast an event to all subscribers."""
        message = {
            "type": event_type,
            "data": data or {}
        }
        import json
        payload = f"data: {json.dumps(message)}\n\n"
        
        # We use a copy of the list to avoid issues if a subscriber disconnects during broadcast
        for queue in list(self.active_connections):
            try:
                await queue.put(payload)
            except Exception:
                self.unsubscribe(queue)

# Global instances
notification_manager = NotificationManager()
