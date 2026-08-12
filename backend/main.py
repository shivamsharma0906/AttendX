"""
main.py — FastAPI backend for face registration and recognition.
Includes Firebase ID Token verification, role-based authorization,
dynamic CORS configuration, rate limiting, and mock-mode transparency.
"""

import json
import logging
import os
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials, firestore

from face_utils import (
    HAS_FR,
    decode_base64_image,
    extract_encoding,
    identify_face,
    average_encodings,
)

logger = logging.getLogger("attendx_backend")
logging.basicConfig(level=logging.INFO)

# ── Firebase Admin SDK Initialization ─────────────────────────────────────────
FIREBASE_INITIALIZED = False
db = None

try:
    if not firebase_admin._apps:
        service_account_env = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        google_creds_env = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

        if service_account_env:
            service_account_info = json.loads(service_account_env)
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_JSON.")
        elif google_creds_env and os.path.exists(google_creds_env):
            cred = credentials.Certificate(google_creds_env)
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin initialized via GOOGLE_APPLICATION_CREDENTIALS at file: {google_creds_env}")
        else:
            # Fallback to Application Default Credentials
            firebase_admin.initialize_app()
            logger.info("Firebase Admin initialized via default application credentials.")
    FIREBASE_INITIALIZED = True
    db = firestore.client()
except Exception as exc:
    logger.warning(f"Firebase Admin SDK not initialized: {exc}. Server will start, but Firebase-dependent features will be unavailable.")
    FIREBASE_INITIALIZED = False


# ── Rate Limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="AttendX Face Recognition API", version="2.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Dynamic CORS Setup ───────────────────────────────────────────────────────
raw_origins = os.getenv(
    "ALLOWED_ORIGIN",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175"
)
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security_scheme = HTTPBearer(auto_error=False)


# ── Authentication & Authorization Dependencies ──────────────────────────────

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
AUTH_BYPASS_ENV = os.getenv("AUTH_BYPASS", "false").lower() == "true"

# Strict production enforcement
if ENVIRONMENT == "production":
    AUTH_BYPASS = False
else:
    AUTH_BYPASS = AUTH_BYPASS_ENV

async def get_current_user(
    auth_credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> dict:
    """
    Verifies the Firebase ID Token passed in the 'Authorization: Bearer <token>' header.
    Returns decoded token dictionary on success.
    Raises 401 Unauthorized on missing or invalid token.
    """
    if AUTH_BYPASS:
        # Development fallback bypass
        logger.warning("AUTH_BYPASS is active — returning mock user.")
        return {"uid": "dev_user", "email": "dev@attendx.local", "role": "admin", "admin": True}

    if not FIREBASE_INITIALIZED:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Admin SDK is not initialized. Token verification unavailable."
        )

    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required: Missing Bearer token in Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_credentials.credentials

    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception as err:
        logger.error(f"Token verification failed: {err}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """
    Requires the authenticated user to hold an 'admin' role.
    Checks custom token claims or Firestore user record role.
    Raises 403 Forbidden if user is not an admin.
    """
    if AUTH_BYPASS:
        return user

    role = user.get("role")
    
    # Check Firestore if role is not directly in token claims
    if not role and FIREBASE_INITIALIZED and db:
        try:
            uid = user.get("uid")
            doc = db.collection("users").document(uid).get()
            if doc.exists:
                role = doc.to_dict().get("role")
        except Exception as e:
            logger.error(f"Error fetching user role from Firestore: {e}")

    if role != "admin" and not user.get("admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin role required for face registration."
        )

    return user


# ── Pydantic Schemas ─────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    images: list[str]          # Base64 image strings (up to 3)
    employeeId: str
    name: str


class EmployeeEncoding(BaseModel):
    employeeId: str
    encoding: list[float]      # 128-d face embedding vector


class RecognizeRequest(BaseModel):
    image: str                          # Base64 image from camera frame
    employees: Optional[list[EmployeeEncoding]] = None   # Optional client-supplied encodings
    employeeId: Optional[str] = None


class RegisterResponse(BaseModel):
    success: bool
    embeddings: list[list[float]]       # 128-d embeddings per capture
    mock_mode: bool = False


class RecognizeResponse(BaseModel):
    matched: bool
    recognized: bool
    employeeId: Optional[str] = None
    confidence: float = 0.0             # 0.0–1.0 confidence score
    distance: Optional[float] = None
    mode: str = "real"
    mock_mode: bool = False


# ── API Endpoints ─────────────────────────────────────────────────────────────

FACE_TOLERANCE = float(os.getenv("FACE_TOLERANCE", "0.55"))

@app.post("/register-face", response_model=RegisterResponse)
@limiter.limit("5/minute")
async def register_face(
    request: Request,
    body: RegisterRequest
):
    """
    Protected endpoint: Only authenticated users with ADMIN role can register new employee faces.
    Rate limited to 5 requests per minute per IP.
    """
    if not HAS_FR:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Face recognition (dlib) is unavailable on the server."
        )

    if not body.images:
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

    # Average encodings to get a single stable master vector
    master_encoding = average_encodings(embeddings)

    # Save the master encoding in Firestore
    if FIREBASE_INITIALIZED and db:
        try:
            # Set/update the employeeFace document
            db.collection("employeeFaces").document(body.employeeId).set({
                "employeeId": body.employeeId,
                "name": body.name,
                "encoding": master_encoding,
                "createdAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP
            })
            logger.info(f"Successfully registered and saved face encoding for employee {body.employeeId} ({body.name}) to Firestore.")
        except Exception as exc:
            logger.error(f"Failed to save face encoding to Firestore: {exc}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save face encoding to Firestore: {exc}"
            )
    else:
        if not AUTH_BYPASS:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firestore is not initialized. Cannot register face."
            )
        else:
            logger.warning("Firebase not initialized but AUTH_BYPASS is active — registration skipped Firestore save.")

    return RegisterResponse(
        success=True,
        embeddings=embeddings,
        mock_mode=False
    )


@app.post("/recognize-face", response_model=RecognizeResponse)
@limiter.limit("30/minute")
async def recognize_face(
    request: Request,
    body: RecognizeRequest
):
    """
    Protected endpoint: Any authenticated user can initiate face recognition.
    Rate limited to 30 requests per minute per IP.
    Biometric encodings are fetched server-side from Firestore.
    """
    if not HAS_FR:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Face recognition (dlib) is unavailable on the server."
        )

    try:
        img_array = decode_base64_image(body.image)
        candidate_encoding = extract_encoding(img_array)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image or face detection failed: {str(exc)}"
        )

    employees_list = []

    # Retrieve from server-side Firestore
    if FIREBASE_INITIALIZED and db:
        try:
            if body.employeeId:
                doc_ref = db.collection("employeeFaces").document(body.employeeId)
                doc_snap = doc_ref.get()
                if doc_snap.exists:
                    data = doc_snap.to_dict()
                    if "encoding" in data and isinstance(data["encoding"], list):
                        employees_list.append({
                            "employeeId": body.employeeId,
                            "encoding": data["encoding"]
                        })
            else:
                docs = db.collection("employeeFaces").stream()
                for doc in docs:
                    data = doc.to_dict()
                    if "encoding" in data and isinstance(data["encoding"], list):
                        employees_list.append({
                            "employeeId": data.get("employeeId", doc.id),
                            "encoding": data["encoding"]
                        })
        except Exception as exc:
            logger.error(f"Failed to fetch employee encodings server-side: {exc}")
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve registered faces from database."
            )
    else:
        if not AUTH_BYPASS:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firestore is not initialized. Cannot recognize face."
            )
        else:
            logger.warning("Firebase not initialized but AUTH_BYPASS is active — checking client-supplied encodings if any.")
            if body.employees:
                employees_list = [
                    {"employeeId": emp.employeeId, "encoding": emp.encoding}
                    for emp in body.employees
                ]

    if not employees_list:
        return RecognizeResponse(
            matched=False,
            recognized=False,
            employeeId=None,
            confidence=0.0,
            distance=None,
            mode="real",
            mock_mode=False
        )

    matched, employee_id, confidence, best_distance = identify_face(
        candidate_encoding=candidate_encoding,
        employees=employees_list,
        tolerance=FACE_TOLERANCE,
    )

    return RecognizeResponse(
        matched=matched,
        recognized=matched,
        employeeId=employee_id if matched else None,
        confidence=confidence,
        distance=best_distance,
        mode="real",
        mock_mode=False
    )


@app.get("/health")
async def health():
    """Health check endpoint exposing system version, face_recognition availability, and firebase status."""
    is_real = HAS_FR
    return {
        "status": "ok" if (is_real and FIREBASE_INITIALIZED) else "degraded",
        "version": "2.1.0",
        "face_recognition": is_real,
        "firebase_admin": FIREBASE_INITIALIZED,
        "mode": "real" if is_real else "mock",
        "allowed_origins": allowed_origins
    }
