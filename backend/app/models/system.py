from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class System(Base):
    """Model representing a monitored system with heartbeat/ping monitoring."""
    
    __tablename__ = "systems"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    webhook_token = Column(
        String(36), 
        unique=True, 
        nullable=False,
        default=lambda: str(uuid.uuid4()),
        index=True
    )
    timeout_interval = Column(Integer, nullable=False, default=5)  # minutes before status resets
    is_active = Column(Boolean, default=False)  # Default to stopped/inactive
    last_ping = Column(DateTime, nullable=True)  # Last time a ping was received
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    pings = relationship(
        "SystemPing", 
        back_populates="system",
        cascade="all, delete-orphan",
        order_by="desc(SystemPing.timestamp)"
    )
    
    def __repr__(self):
        return f"<System(id={self.id}, name='{self.name}', is_active={self.is_active})>"


class SystemPing(Base):
    """Model representing a single heartbeat ping from a system."""
    
    __tablename__ = "system_pings"
    
    id = Column(Integer, primary_key=True, index=True)
    system_id = Column(Integer, ForeignKey("systems.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(Boolean, default=True)  # True for active/up, False for stopped/down
    client_info = Column(Text, nullable=True)  # Optional UI/IP/etc
    
    # Relationship
    system = relationship("System", back_populates="pings")
    
    def __repr__(self):
        return f"<SystemPing(id={self.id}, system_id={self.system_id}, timestamp='{self.timestamp}')>"
