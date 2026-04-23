import base64
import os
from io import BytesIO
from typing import Any
import logging

import torch.serialization
from fastapi import FastAPI, HTTPException
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from ultralytics import YOLO
from ultralytics.nn.tasks import DetectionModel
import torch
import torch.nn

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.getenv("MODEL_PATH", "models/best.pt")
if not os.path.isabs(MODEL_PATH):
    MODEL_PATH = os.path.join(BASE_DIR, MODEL_PATH)
# Increased default confidence from 0.25 to 0.45 for better accuracy
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.45"))
# Minimum confidence to return a result (filter weak detections)
MIN_CONFIDENCE = float(os.getenv("MIN_CONFIDENCE", "0.50"))

app = FastAPI(title="HEALTHSIGN AI Service", version="1.0.0")


class DetectRequest(BaseModel):
    frame: str


class SignDetector:
    def __init__(self, model_path: str) -> None:
        self.model_path = model_path
        self.model: YOLO | None = None
        self.model_load_error: str | None = None
        self._load_model()

    def _load_model(self) -> None:
        try:
            torch.serialization.add_safe_globals([DetectionModel, torch.nn.modules.container.Sequential])
            self.model = YOLO(self.model_path)
            self.model_load_error = None

        except Exception as exc:
            if "weights_only" in str(exc):
                # Fallback: load with weights_only=False
                original_load = torch.load
                torch.load = lambda *args, **kwargs: original_load(*args, weights_only=False, **kwargs)
                try:
                    self.model = YOLO(self.model_path)
                    self.model_load_error = None
                finally:
                    torch.load = original_load
            else:
                self.model = None
                self.model_load_error = str(exc)

    def decode_frame(self, frame_data: str) -> Image.Image:
        payload = frame_data
        if "," in frame_data:
            payload = frame_data.split(",", 1)[1]

        image_bytes = base64.b64decode(payload, validate=True)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        return image

    def detect_one_alphabet(self, image: Image.Image) -> str | None:
        if self.model is None:
            logger.error("Model is not loaded")
            return None

        try:
            results = self.model.predict(source=image, conf=CONFIDENCE_THRESHOLD, verbose=False)
            if not results:
                logger.debug("No detection results")
                return None

            best_label: str | None = None
            best_conf: float = 0.0
            detections_found = []

            for result in results:
                boxes = result.boxes
                names = result.names
                if boxes is None or len(boxes) == 0:
                    continue

                for box in boxes:
                    conf = float(box.conf[0].item())
                    cls_idx = int(box.cls[0].item())
                    label = str(names.get(cls_idx, cls_idx)) if isinstance(names, dict) else str(cls_idx)
                    
                    detections_found.append({"label": label, "conf": conf})

                    # Only consider detections above MIN_CONFIDENCE
                    if conf >= MIN_CONFIDENCE and conf > best_conf:
                        best_conf = conf
                        best_label = label

            # Log all detections for debugging
            if detections_found:
                logger.debug(f"All detections: {detections_found}")
            
            if best_label is None:
                logger.debug(f"No detections with confidence >= {MIN_CONFIDENCE}")
                return None

            logger.info(f"Detected: {best_label} (confidence: {best_conf:.3f})")
            return best_label
            
        except Exception as exc:
            logger.error(f"Error during detection: {exc}")
            return None


detector = SignDetector(MODEL_PATH)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_path": MODEL_PATH,
        "model_loaded": detector.model is not None,
        "model_error": detector.model_load_error,
    }


@app.post("/detect")
def detect(payload: DetectRequest) -> dict[str, str | None]:
    if detector.model is None:
        raise HTTPException(status_code=503, detail=f"Model failed to load: {detector.model_load_error}")

    try:
        image = detector.decode_frame(payload.frame)
    except (ValueError, UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail=f"Failed to decode frame: {exc}") from exc

    alphabet = detector.detect_one_alphabet(image)
    return {"alphabet": alphabet}


@app.post("/detect-debug")
def detect_debug(payload: DetectRequest) -> dict[str, Any]:
    """Debug endpoint that returns all detections with details"""
    if detector.model is None:
        raise HTTPException(status_code=503, detail=f"Model failed to load: {detector.model_load_error}")

    try:
        image = detector.decode_frame(payload.frame)
    except (ValueError, UnidentifiedImageError, OSError) as exc:
        raise HTTPException(status_code=400, detail=f"Failed to decode frame: {exc}") from exc

    try:
        results = detector.model.predict(source=image, conf=CONFIDENCE_THRESHOLD, verbose=False)
        all_detections = []
        
        for result in results:
            boxes = result.boxes
            names = result.names
            if boxes is None or len(boxes) == 0:
                continue

            for box in boxes:
                conf = float(box.conf[0].item())
                cls_idx = int(box.cls[0].item())
                label = str(names.get(cls_idx, cls_idx)) if isinstance(names, dict) else str(cls_idx)
                
                # Get bounding box coordinates
                x1, y1, x2, y2 = [float(x) for x in box.xyxy[0].tolist()]
                
                all_detections.append({
                    "label": label,
                    "confidence": round(conf, 4),
                    "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    "passes_min_threshold": conf >= MIN_CONFIDENCE
                })
        
        # Sort by confidence
        all_detections.sort(key=lambda x: x["confidence"], reverse=True)
        
        best_detection = next((d for d in all_detections if d["passes_min_threshold"]), None)
        
        return {
            "best_detection": best_detection,
            "all_detections": all_detections,
            "detection_count": len(all_detections),
            "confidence_threshold": CONFIDENCE_THRESHOLD,
            "min_confidence": MIN_CONFIDENCE
        }
    except Exception as exc:
        logger.error(f"Error in debug detection: {exc}")
        raise HTTPException(status_code=500, detail=f"Detection error: {exc}")
