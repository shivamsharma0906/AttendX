"""
main.py — FastAPI backend for face registration and recognition.
Exposes two endpoints: POST /register-face and POST /recognize-face.
Frontend is responsible for fetching Firestore data; backend has no Firebase access.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from face_utils import decode_base64_image, extract_encoding, identify_face

app = FastAPI(title="Face Recognition Attendance API", version="2.0.0")

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    images: list[str]          # List of base64 image strings (up to 3)
    employeeId: str
    name: str


class EmployeeEncoding(BaseModel):
    """A single employee's stored face encoding."""
    employeeId: str
    encoding: list[float]      # 128-d face embedding averaged across captures


class RecognizeRequest(BaseModel):
    image: str                          # Single base64 image from live webcam
    employees: list[EmployeeEncoding]   # All employee encodings from Firestore


class RegisterResponse(BaseModel):
    success: bool
    embeddings: list[list[float]]       # One 128-d embedding per input image


class RecognizeResponse(BaseModel):
    matched: bool
    employeeId: Optional[str] = None
    confidence: float = 0.0             # 0.0–1.0, higher = more confident


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/register-face", response_model=RegisterResponse)
async def register_face(body: RegisterRequest):
    """
    Decode up to 3 base64 images, extract a 128-d face encoding from each,
    and return all embeddings to be averaged and saved in Firestore by the frontend.

    Returns HTTP 400 if any image contains no detectable face.
    """
    if len(body.images) == 0:
        raise HTTPException(status_code=400, detail="At least one image is required.")

    embeddings: list[list[float]] = []

    for idx, b64 in enumerate(body.images):
        try:
            img_array = decode_base64_image(b64)
            encoding = extract_encoding(img_array)
            embeddings.append(encoding)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Image {idx + 1}: {str(exc)}"
            ) from exc

    return RegisterResponse(success=True, embeddings=embeddings)


@app.post("/recognize-face", response_model=RecognizeResponse)
async def recognize_face(body: RecognizeRequest):
    """
    1:N face identification — compare a live camera frame against ALL stored
    employee encodings. The frontend must supply the employee encodings fetched
    from Firestore. Backend does not query Firebase.

    Returns { matched: true, employeeId, confidence } on a match,
    or { matched: false, confidence: 0 } if no face or no match found.
    """
    # Step 1: Extract encoding from the live frame
    try:
        img_array = decode_base64_image(body.image)
        candidate_encoding = extract_encoding(img_array)
    except ValueError:
        # No detectable face in frame — graceful no-match
        return RecognizeResponse(matched=False, employeeId=None, confidence=0.0)

    if not body.employees:
        return RecognizeResponse(matched=False, employeeId=None, confidence=0.0)

    # Step 2: Run 1:N identification against all employee encodings
    employees_list = [
        {"employeeId": emp.employeeId, "encoding": emp.encoding}
        for emp in body.employees
    ]

    matched, employee_id, confidence = identify_face(
        candidate_encoding=candidate_encoding,
        employees=employees_list,
        tolerance=0.55,
    )

    return RecognizeResponse(
        matched=matched,
        employeeId=employee_id if matched else None,
        confidence=confidence,
    )


@app.get("/health")
async def health():
    """Simple health-check endpoint."""
    return {"status": "ok", "version": "2.0.0"}
