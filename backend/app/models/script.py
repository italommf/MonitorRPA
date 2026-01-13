from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Responsible(Base):
    """Model representing a person responsible for a script."""
    
    __tablename__ = "responsibles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    scripts = relationship("Script", back_populates="responsible")
    
    def __repr__(self):
        return f"<Responsible(id={self.id}, name='{self.name}')>"


class Script(Base):
    """Model representing a monitored script/robot."""
    
    __tablename__ = "scripts"
    
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
    expected_interval = Column(Integer, nullable=True)  # minutes between executions
    is_active = Column(Boolean, default=True)
    
    # New fields
    responsible_id = Column(Integer, ForeignKey("responsibles.id", ondelete="SET NULL"), nullable=True)
    frequency = Column(String(50), nullable=True)  # daily, weekly, biweekly, monthly, custom, scheduled
    scheduled_times = Column(Text, nullable=True)  # Comma-separated times "HH:MM,HH:MM"
    calculate_average_time = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    executions = relationship(
        "Execution", 
        back_populates="script",
        cascade="all, delete-orphan",
        order_by="desc(Execution.executed_at)"
    )
    responsible = relationship("Responsible", back_populates="scripts")
    
    def __repr__(self):
        return f"<Script(id={self.id}, name='{self.name}')>"


class Execution(Base):
    """Model representing a single script execution."""
    
    __tablename__ = "executions"
    
    id = Column(Integer, primary_key=True, index=True)
    script_id = Column(Integer, ForeignKey("scripts.id", ondelete="CASCADE"), nullable=False)
    executed_at = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String(50), default="success", index=True)  # success, error, warning
    payload = Column(Text, nullable=True)  # JSON string
    duration_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Relationship
    script = relationship("Script", back_populates="executions")
    
    def __repr__(self):
        return f"<Execution(id={self.id}, script_id={self.script_id}, status='{self.status}')>"
