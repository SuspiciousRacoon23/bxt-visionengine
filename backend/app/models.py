import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON, Enum
from sqlalchemy.orm import relationship
from .database import Base

class UserRole(str, Enum):
    ADMIN = "admin"
    LABELER = "labeler"
    ENGINEER = "engineer"
    AUDITOR = "auditor"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="labeler", nullable=False) # admin, labeler, engineer, auditor
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")
    models = relationship("Model", back_populates="project", cascade="all, delete-orphan")

class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    version = Column(String, default="1.0.0", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="datasets")
    images = relationship("Image", back_populates="dataset", cascade="all, delete-orphan")

class Image(Base):
    __tablename__ = "images"
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    status = Column(String, default="unlabelled") # unlabelled, labelled, review
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="images")
    annotations = relationship("Annotation", back_populates="image", cascade="all, delete-orphan")

class Annotation(Base):
    __tablename__ = "annotations"
    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id"), nullable=False)
    label = Column(String, nullable=False)
    bbox = Column(JSON, nullable=True) # [x, y, w, h] normalized
    polygon = Column(JSON, nullable=True) # [[x1,y1], [x2,y2], ...] normalized
    created_by = Column(String, nullable=False) # username / email of annotator
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    image = relationship("Image", back_populates="annotations")

class Model(Base):
    __tablename__ = "models"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    version = Column(String, default="1.0.0", nullable=False)
    framework = Column(String, default="yolov8") # yolov8, yolov11, ocr, sam
    status = Column(String, default="queued") # queued, training, completed, failed
    map_50 = Column(Float, default=0.0)
    map_50_95 = Column(Float, default=0.0)
    weights_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="models")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False)
    role = Column(String, nullable=False)
    action = Column(String, nullable=False) # e.g. "CREATE_PROJECT", "DELETE_ANNOTATION"
    target = Column(String, nullable=False) # e.g. "Project: WagonDamage"
    details = Column(String, nullable=True)  # custom payload / changes
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
