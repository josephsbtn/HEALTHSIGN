import base64
import os
from io import BytesIO
from typing import Any

from fastapi import FastAPI, HTTPException
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel
from ultralytics import YOLO


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.getenv("MODEL_PATH", "models/best.pt")
if not os.path.isabs(MODEL_PATH):
    MODEL_PATH = os.path.join(BASE_DIR, MODEL_PATH)
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.25"))

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
            self.model = YOLO(self.model_path)
            self.model_load_error = None
        except Exception as exc:  # noqa: BLE001
            self.model = None
            self.model_load_error = str(exc)

    def decode_frame(self, frame_data: str) -> Image.Image:
        payload = frame_data
        if "," in frame_data:
            # Support data URL format: data:image/jpeg;base64,<payload>
            payload = frame_data.split(",", 1)[1]

        image_bytes = base64.b64decode(payload, validate=True)
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        return image

    def detect_one_alphabet(self, image: Image.Image) -> str | None:
        if self.model is None:
            return None

        results = self.model.predict(source=image, conf=CONFIDENCE_THRESHOLD, verbose=False)
        if not results:
            return None

        best_label: str | None = None
        best_conf: float = 0.0

        for result in results:
            boxes = result.boxes
            names = result.names
            if boxes is None or len(boxes) == 0:
                continue

            for box in boxes:
                conf = float(box.conf[0].item())
                cls_idx = int(box.cls[0].item())
                label = str(names.get(cls_idx, cls_idx)) if isinstance(names, dict) else str(cls_idx)

                if conf > best_conf:
                    best_conf = conf
                    best_label = label

        if best_label is None:
            return None

        return best_label


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
