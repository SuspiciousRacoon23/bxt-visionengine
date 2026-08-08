# BxT VisionEngine (BVE)

An enterprise-grade, low-code/no-code Computer Vision (CV) and automated image recognition development platform designed for high-security environments (private enterprises and government/defense agencies).

## Technical Architecture

The platform separates the **Control Plane** (managing projects, team membership, annotations, and training parameters) from the **Data Plane** (which processes actual imagery and trains models) and the **Deployment Plane** (lightweight edge-containers running offline inference).

```
BxT-VisionEngine/
├── README.md               # Main project documentation
├── frontend/               # Next.js 14 Web UI & Annotation Tool
├── backend/                # FastAPI (Python) AutoML & SAM Orchestrator
└── inference/              # Dockerized edge-inference microservice (ONNX/TensorRT)
```

## Getting Started

### 1. Prerequisites
- Docker & Docker Compose
- Python 3.10+ (for backend)
- Node.js 18+ (for frontend)
- NVIDIA GPU with CUDA installed (optional, for accelerated training)

### 2. Development Setup

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### Running Edge Inference (Mock/Demo)
```bash
cd inference
docker build -t bxt-vision-edge .
docker run -p 8080:8080 bxt-vision-edge
```
