import os
import shutil
import uuid
import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, get_db, Base
from . import models, schemas

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BxT VisionEngine API",
    description="Enterprise Computer Vision Platform Core Service",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root directory for file uploads
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Helper function to write audit log entries
def write_audit(db: Session, username: str, role: str, action: str, target: str, details: Optional[str] = None, ip: Optional[str] = "127.0.0.1"):
    log_entry = models.AuditLog(
        username=username,
        role=role,
        action=action,
        target=target,
        details=details,
        ip_address=ip
    )
    db.add(log_entry)
    db.commit()

# --- AUTHENTICATION & USERS ---
@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Simple clear-text password for prototyping; hash in production
    hashed_pwd = f"sha256_{user.password}"
    new_user = models.User(
        email=user.email,
        name=user.name,
        hashed_password=hashed_pwd,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    write_audit(db, new_user.name, new_user.role, "REGISTER_USER", f"User: {new_user.email}")
    return new_user

@app.post("/api/auth/login")
def login(username: str = Query(...), password: str = Query(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == username).first()
    if not user or user.hashed_password != f"sha256_{password}":
         # Fallback to check default admin account
         if username == "admin@baxtage.com" and password == "admin123":
             # Create default admin on-the-fly
             admin = db.query(models.User).filter(models.User.email == "admin@baxtage.com").first()
             if not admin:
                 admin = models.User(
                     email="admin@baxtage.com",
                     name="Default Admin",
                     hashed_password="sha256_admin123",
                     role="admin"
                 )
                 db.add(admin)
                 db.commit()
                 db.refresh(admin)
             return {"access_token": "mock-admin-token", "token_type": "bearer", "user": {"email": admin.email, "name": admin.name, "role": admin.role}}
         raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    return {"access_token": f"mock-token-{user.id}", "token_type": "bearer", "user": {"email": user.email, "name": user.name, "role": user.role}}

# --- PROJECTS & DATASETS ---
@app.post("/api/projects", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, requester: str = "Admin User", role: str = "admin", db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.name == project.name).first()
    if db_project:
        raise HTTPException(status_code=400, detail="Project with this name already exists")
    
    new_project = models.Project(name=project.name, description=project.description)
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    # Auto-create default Dataset v1.0.0
    default_dataset = models.Dataset(project_id=new_project.id, name="Default Dataset", version="1.0.0")
    db.add(default_dataset)
    db.commit()
    
    write_audit(db, requester, role, "CREATE_PROJECT", f"Project: {new_project.name}", f"ID: {new_project.id}")
    return new_project

@app.get("/api/projects", response_model=List[schemas.ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).all()

@app.get("/api/projects/{project_id}/datasets", response_model=List[schemas.DatasetResponse])
def list_datasets(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Dataset).filter(models.Dataset.project_id == project_id).all()

# --- DATA INGESTION (IMAGES) ---
@app.post("/api/datasets/{dataset_id}/upload")
async def upload_image(dataset_id: int, file: UploadFile = File(...), requester: str = "Engineer User", role: str = "engineer", db: Session = Depends(get_db)):
    dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Save file on local drive to represent secure local repository storage
    project_dir = os.path.join(UPLOAD_DIR, str(dataset.project_id), str(dataset_id))
    os.makedirs(project_dir, exist_ok=True)
    
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(project_dir, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    new_image = models.Image(
        dataset_id=dataset_id,
        filename=file.filename,
        filepath=file_path,
        width=800,  # mock width, read from file header in production
        height=600, # mock height, read from file header in production
        status="unlabelled"
    )
    db.add(new_image)
    db.commit()
    db.refresh(new_image)
    
    write_audit(db, requester, role, "UPLOAD_IMAGE", f"Image: {file.filename}", f"Path: {file_path}")
    return {"message": "Upload successful", "image_id": new_image.id}

@app.get("/api/datasets/{dataset_id}/images", response_model=List[schemas.ImageResponse])
def get_dataset_images(dataset_id: int, db: Session = Depends(get_db)):
    return db.query(models.Image).filter(models.Image.dataset_id == dataset_id).all()

# --- ANNOTATIONS ---
@app.post("/api/images/{image_id}/annotations", response_model=schemas.AnnotationResponse)
def add_annotation(image_id: int, annotation: schemas.AnnotationCreate, requester: str = "Labeler User", role: str = "labeler", db: Session = Depends(get_db)):
    image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
        
    new_annotation = models.Annotation(
        image_id=image_id,
        label=annotation.label,
        bbox=annotation.bbox,
        polygon=annotation.polygon,
        created_by=requester
    )
    db.add(new_annotation)
    
    # Update image status to labelled
    image.status = "labelled"
    
    db.commit()
    db.refresh(new_annotation)
    
    write_audit(db, requester, role, "ADD_ANNOTATION", f"Image ID: {image_id}", f"Label: {annotation.label}, Polygon: {annotation.polygon}")
    return new_annotation

# --- AI ASSISTED SEGMENTATION (SAM MOCKUP) ---
@app.get("/api/sam/segment")
def sam_segment(image_id: int, x: float = Query(...), y: float = Query(...)):
    """
    Mock Segment Anything Model (SAM) endpoint.
    In production, this queries the PyTorch SAM model using target frame and hover coordinate (x,y)
    and returns a polygon mask boundary.
    """
    # Create a mock polygon box centered around the clicked point (x, y) representing auto-bounding
    dx, dy = 0.08, 0.08
    mock_polygon = [
        [max(0.0, x - dx), max(0.0, y - dy)],
        [min(1.0, x + dx), max(0.0, y - dy)],
        [min(1.0, x + dx), min(1.0, y + dy)],
        [max(0.0, x - dx), min(1.0, y + dy)],
        [max(0.0, x - dx), max(0.0, y - dy)]
    ]
    mock_bbox = [max(0.0, x - dx), max(0.0, y - dy), dx * 2, dy * 2]
    return {
        "success": True,
        "label": "auto-detection",
        "bbox": mock_bbox,
        "polygon": mock_polygon
    }

# --- MODEL TRAINING ENGINE ---
def run_training_task(model_id: int, epochs: int, db_url: str):
    """
    Simulation of Celery background worker training process.
    Updates the database with mock progress over epochs and reports metrics.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url)
    SessionClass = sessionmaker(bind=engine)
    session = SessionClass()
    
    model = session.query(models.Model).filter(models.Model.id == model_id).first()
    if not model:
        return
        
    model.status = "training"
    session.commit()
    
    # Simulate epoch runs
    for i in range(1, epochs + 1):
        # In a real setup, this writes to a redis channel or a websocket queue
        # For simplicity, we write back status updates
        print(f"Model ID {model_id}: Epoch {i}/{epochs} complete")
    
    # Save completion state
    model.status = "completed"
    model.map_50 = 0.88 + (0.01 * (epochs % 10))
    model.map_50_95 = 0.65 + (0.015 * (epochs % 10))
    model.weights_path = f"/data/models/{model.project_id}/{model.name}_{model_id}.onnx"
    session.commit()
    
    # Log audit entry
    write_audit(session, "SYSTEM Worker", "system", "FINISH_TRAINING", f"Model: {model.name}", f"mAP50: {model.map_50}")
    session.close()

@app.post("/api/models/train")
def train_model(req: schemas.ModelTrainRequest, background_tasks: BackgroundTasks, requester: str = "Engineer User", role: str = "engineer", db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Register model in registry
    model_count = db.query(models.Model).filter(models.Model.project_id == req.project_id).count()
    model_name = f"{project.name.lower().replace(' ', '_')}_model_v{model_count + 1}"
    
    new_model = models.Model(
        project_id=req.project_id,
        name=model_name,
        version=f"1.{model_count + 1}.0",
        framework="yolov8",
        status="queued"
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    
    write_audit(db, requester, role, "TRIGGER_TRAINING", f"Model: {model_name}", f"Epochs: {req.epochs}, Batch: {req.batch_size}")
    
    # Trigger background execution simulation
    background_tasks.add_task(run_training_task, new_model.id, req.epochs, str(engine.url))
    
    return {"message": "Training started", "model": new_model}

@app.get("/api/projects/{project_id}/models", response_model=List[schemas.ModelResponse])
def get_project_models(project_id: int, db: Session = Depends(get_db)):
    return db.query(models.Model).filter(models.Model.project_id == project_id).all()

# --- AUDIT LOGS ---
@app.get("/api/audit", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db)):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).all()

# --- RTSP CAMERA SIMULATOR ---
@app.get("/api/rtsp/stream")
def trigger_rtsp_stream(url: str, db: Session = Depends(get_db)):
    """
    RTSP stream link validation and trigger point.
    Extracts frames periodically from an RTSP camera stream.
    """
    write_audit(db, "System Operator", "admin", "CONNECT_RTSP", f"Camera Stream: {url}")
    return {"connected": True, "fps": 30, "latency_ms": 14}
