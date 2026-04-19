/**
 * faceApi.js — All fetch calls to the FastAPI backend.
 * Components must NOT import fetch/axios directly; use these functions instead.
 *
 * Environment variable required:
 *   VITE_BACKEND_URL=http://localhost:8000
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Registers a new employee face with the backend.
 * The backend extracts 128-d embeddings from captured images.
 *
 * @param {string[]} images     - Array of base64-encoded JPEG/PNG strings.
 * @param {string}   employeeId - Unique employee identifier.
 * @param {string}   name       - Full name of the employee.
 * @returns {{ success: boolean, embeddings: number[][] }}
 * @throws {Error} If the backend returns a non-200 status or no face is detected.
 */
export async function registerFace(images, employeeId, name) {
  const response = await fetch(`${BASE_URL}/register-face`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, employeeId, name }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `Registration failed with status ${response.status}`);
  }

  return response.json(); // { success: true, embeddings: [[...], [...], [...]] }
}

/**
 * Sends a live camera frame to the backend for 1:N face identification.
 * The caller must supply ALL employee encodings fetched from Firestore.
 *
 * @param {string} image
 *   Base64-encoded image string from the webcam.
 * @param {Array<{employeeId: string, encoding: number[]}>} employees
 *   Array of all employee face encodings from Firestore.
 *
 * @returns {{ matched: boolean, employeeId: string|null, confidence: number }}
 *   - matched:    true if a face was recognized above the tolerance threshold
 *   - employeeId: the matched employee's ID, or null
 *   - confidence: 0.0–1.0 match confidence score
 *
 * @throws {Error} If the network request fails entirely.
 */
export async function recognizeFace(image, employees) {
  const response = await fetch(`${BASE_URL}/recognize-face`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, employees }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `Recognition failed with status ${response.status}`);
  }

  return response.json(); // { matched: bool, employeeId: str|null, confidence: float }
}

/**
 * Health check for the FastAPI backend.
 * @returns {{ status: string }}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? res.json() : { status: 'error' };
  } catch {
    return { status: 'offline' };
  }
}
