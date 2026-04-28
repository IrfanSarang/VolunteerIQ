from pydantic import BaseModel, ConfigDict
from typing import Optional

class IncidentCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    description: str
    lat: float
    lng: float

class IncidentUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: str
    assigned_volunteer_id: Optional[str] = None

class ScoreRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    incident_id: str
    description: str

class ScoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    incident_id: str
    urgency_score: int
    category: str

class TaskUpdateCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    incident_id: str
    action: str

class VolunteerStatusUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    is_online: bool