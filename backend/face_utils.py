"""
face_utils.py — Helper utilities for face encoding, averaging, and 1:N identification.
All functions are pure (no I/O), making them testable independently.
"""

import base64
import io
import logging
import os
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Environment check: FAIL in production if dlib / face_recognition is missing
ENV = os.getenv("ENVIRONMENT", "development").lower()

try:
    import face_recognition
    HAS_FR = True
    logger.info("face_recognition (dlib) loaded successfully — running in REAL mode.")
except ImportError:
    HAS_FR = False
    if ENV == "production":
        logger.critical("FATAL: face_recognition (dlib) NOT installed in PRODUCTION environment. Refusing to run in silent mock mode.")
        # In production, raise exception to prevent silent fallback
        raise RuntimeError("face_recognition (dlib) dependency missing in production environment.")
    else:
        logger.warning("face_recognition (dlib) NOT installed — running in MOCK mode. Responses will include 'mock_mode: true'.")


# ─── Image Decoding ───────────────────────────────────────────────────────────

def decode_base64_image(b64_string: str) -> np.ndarray:
    """
    Decodes a base64 image string (with or without data URI prefix) into an RGB numpy array.
    """
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]

    try:
        img_bytes = base64.b64decode(b64_string)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        return np.array(img)
    except Exception as exc:
        raise ValueError(f"Failed to decode base64 image: {exc}") from exc


# ─── Encoding Extraction ──────────────────────────────────────────────────────

def extract_encoding(image_array: np.ndarray) -> list[float]:
    """
    Extracts a single 128-d face encoding from an RGB numpy array.
    """
    if not HAS_FR:
        raise RuntimeError("face_recognition (dlib) is unavailable (running in mock mode).")

    encodings = face_recognition.face_encodings(image_array)

    if len(encodings) == 0:
        raise ValueError("No face detected. Please ensure your face is clearly visible and well-lit.")
    if len(encodings) > 1:
        raise ValueError("Multiple faces detected. Only one person should be in the frame.")

    return encodings[0].tolist()


# ─── Averaging ────────────────────────────────────────────────────────────────

def average_encodings(encodings: list[list[float]]) -> list[float]:
    """
    Averages multiple 128-d face encodings into a single stable master vector.
    """
    if not encodings:
        return []
    arr = np.array(encodings)
    return arr.mean(axis=0).tolist()


# ─── 1:N Identification ───────────────────────────────────────────────────────

def identify_face(
    candidate_encoding: list[float],
    employees: list[dict],
    tolerance: float = 0.55,
) -> tuple[bool, str | None, float, float]:
    """
    Identifies WHO the candidate is by comparing against ALL employee encodings.
    Returns (matched, employee_id, confidence, best_distance).
    """
    if not employees:
        return False, None, 0.0, 1.0

    if not HAS_FR:
        raise RuntimeError("face_recognition (dlib) is unavailable (running in mock mode).")

    candidate_np = np.array(candidate_encoding)
    best_id = None
    best_distance = float("inf")

    for emp in employees:
        try:
            emp_np = np.array(emp["encoding"])
            distance = face_recognition.face_distance([emp_np], candidate_np)[0]
            if distance < best_distance:
                best_distance = distance
                best_id = emp["employeeId"]
        except Exception as e:
            logger.error(f"Error processing employee {emp.get('employeeId', '?')}: {e}")
            continue

    matched = best_distance <= tolerance
    confidence = round(float(1.0 - best_distance), 3)
    confidence = max(0.0, min(1.0, confidence))

    logger.info(f"Best match: {best_id} | distance: {best_distance:.4f} | confidence: {confidence} | matched: {matched}")
    return matched, (best_id if matched else None), confidence, float(best_distance)
