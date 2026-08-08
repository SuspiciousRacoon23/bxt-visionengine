from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    class Config:
        orm_mode = True

class DatasetBase(BaseModel):
    name: str
    version: str = "1.0.0"

class DatasetCreate(DatasetBase):
    project_id: int

class DatasetResponse(DatasetBase):
    id: int
    project_id: int
    created_at: datetime
    class Config:
        orm_mode = True

class AnnotationBase(BaseModel):
    label: str
    bbox: Optional[List[float]] = None # [x, y, w, h] normalized
    polygon: Optional[List[List[float]]] = None # [[x1,y1], [x2,y2], ...] normalized

class AnnotationCreate(AnnotationBase):
    image_id: int

class AnnotationResponse(AnnotationBase):
    id: int
    image_id: int
    created_by: str
    created_at: datetime
    class Config:
        orm_mode = True

class ImageResponse(BaseModel):
    id: int
    dataset_id: int
    filename: str
    filepath: str
    width: Optional[int]
    height: Optional[int]
    status: str
    annotations: List[AnnotationResponse] = []
    created_at: datetime
    class Config:
        orm_mode = True

class ModelResponse(BaseModel):
    id: int
    project_id: int
    name: str
    version: str
    framework: str
    status: str
    map_50: float
    map_50_95: float
    weights_path: Optional[str]
    created_at: datetime
    class Config:
        orm_mode = True

class ModelTrainRequest(BaseModel):
    project_id: int
    dataset_id: int
    epochs: int = Field(default=50, ge=1, le=1000)
    batch_size: int = Field(default=16, ge=1, le=128)
    model_size: str = Field(default="nano", pattern="^(nano|small|medium|large|extra-large)$")

class AuditLogResponse(BaseModel):
    id: int
    username: str
    role: str
    action: str
    target: str
    details: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime
    class Config:
        orm_mode = True
