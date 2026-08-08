import os
import time
import random
import logging
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VisionEdge")

app = FastAPI(
    title="BxT VisionEngine Edge Inference Node",
    description="Offline-first High-throughput Computer Vision Edge Runner",
    version="1.0.0"
)

# Simulated loaded models config
LOADED_MODELS = {
    "wagon_damage_yolov8": {"status": "active", "type": "detection", "latency_ms": 12.5},
    "wagon_number_ocr": {"status": "active", "type": "ocr", "latency_ms": 22.0}
}

class EdgeConfig(BaseModel):
    rtsp_url: str
    alert_endpoint: Optional[str] = None
    confidence_threshold: float = 0.5

active_streams = {}

def process_rtsp_stream_loop(stream_id: str, rtsp_url: str, alert_endpoint: Optional[str]):
    """
    Simulation of an async worker processing camera frames.
    Reads frames at 30 FPS, runs detection, and triggers webhooks on damage events.
    """
    logger.info(f"Starting thread for stream {stream_id} reading from {rtsp_url}")
    active_streams[stream_id] = True
    
    # Simulating damage categories and wagon OCR sequence
    damage_categories = ["bent_stanchion", "broken_door", "missing_handrail", "side_panel_hole"]
    wagon_number_pool = ["SECR120489", "ER450912", "ECR993847", "WR230489", "CR889311"]
    
    frame_count = 0
    while active_streams.get(stream_id, False):
        time.sleep(0.1) # Simulate real-time loop delay (10 frames/sec)
        frame_count += 1
        
        # Simulating random detection events every 50 frames (approx every 5 seconds)
        if frame_count % 50 == 0:
            detect_damage = random.choice([True, False])
            wagon_no = random.choice(wagon_number_pool)
            
            payload = {
                "timestamp": str(time.time()),
                "stream_id": stream_id,
                "wagon_number": wagon_no,
                "detections": []
            }
            
            if detect_damage:
                damage = random.choice(damage_categories)
                conf = round(random.uniform(0.68, 0.94), 2)
                payload["detections"].append({
                    "class": damage,
                    "confidence": conf,
                    "bbox": [round(random.random(), 3) for _ in range(4)]
                })
                logger.warning(f"[ALERT] Stream {stream_id} detected {damage} (conf: {conf}) on Wagon {wagon_no}!")
            else:
                logger.info(f"[PASS] Stream {stream_id} Wagon {wagon_no} passed examination with zero damage.")
                
            # If an alert webhook endpoint is configured, we would send this payload
            if alert_endpoint:
                logger.info(f"Posting alert to enterprise webhook: {alert_endpoint}")
                
    logger.info(f"Stopped stream thread {stream_id}")

@app.post("/api/edge/start")
def start_edge_stream(config: EdgeConfig, background_tasks: BackgroundTasks):
    stream_id = f"cam_{int(time.time())}"
    background_tasks.add_task(process_rtsp_stream_loop, stream_id, config.rtsp_url, config.alert_endpoint)
    return {"status": "stream_started", "stream_id": stream_id, "models": list(LOADED_MODELS.keys())}

@app.post("/api/edge/stop/{stream_id}")
def stop_edge_stream(stream_id: str):
    if stream_id in active_streams:
        active_streams[stream_id] = False
        return {"status": "stopping_stream", "stream_id": stream_id}
    raise HTTPException(status_code=404, detail="Stream ID not found")

@app.post("/api/edge/predict")
async def run_single_frame_inference(file: UploadFile = File(...)):
    """
    Immediate prediction endpoint for single test frames (e.g. manual inspections).
    Returns class bbox coordinates and OCR characters.
    """
    # Simulate inference latency
    time.sleep(0.035) 
    
    # Mocking detection of wagon damage and wagon plate number reading
    detected = random.choice([True, False])
    results = {
        "filename": file.filename,
        "inference_time_ms": 34.5,
        "detections": []
    }
    
    if detected:
        results["detections"].append({
            "class": random.choice(["broken_door", "bent_stanchion", "hole_in_body"]),
            "confidence": round(random.uniform(0.72, 0.95), 2),
            "bbox": [124, 250, 480, 310]
        })
        results["ocr_payload"] = {
            "text": random.choice(["ECR190483", "SR220912", "NCR448921"]),
            "confidence": 0.92
        }
    
    return results

@app.get("/api/edge/status")
def get_edge_status():
    return {
        "status": "operational",
        "loaded_models": LOADED_MODELS,
        "active_streams_count": len([k for k, v in active_streams.items() if v])
    }
