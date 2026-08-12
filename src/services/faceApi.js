/**
 * faceApi.js — All fetch calls to the FastAPI backend.
 * Components must NOT import fetch/axios directly; use these functions instead.
 *
 * Environment variable required:
 *   VITE_BACKEND_URL=http://localhost:8000
 */

import { auth } from './firebase.js';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

/**
 * Gets the current Firebase User's ID token for authentication headers.
 * @returns {Promise<string|null>}
 */
async function getAuthHeader() {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      return `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("Failed to retrieve Firebase ID token:", err);
  }
  return null;
}

/**
 * Registers a new employee face with the backend.
 * Protected: Requires authenticated user with ADMIN role.
 *
 * @param {string[]} images     - Array of base64-encoded JPEG/PNG strings.
 * @param {string}   employeeId - Unique employee identifier.
 * @param {string}   name       - Full name of the employee.
 * @returns {Promise<{ success: boolean, embeddings: number[][], mock_mode?: boolean }>}
 */
export async function registerFace(images, employeeId, name) {
  const authHeader = await getAuthHeader();
  const headers = { 'Content-Type': 'application/json' };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const response = await fetch(`${BASE_URL}/register-face`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ images, employeeId, name }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `Registration failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Sends a live camera frame to the backend for 1:N face identification.
 * Protected: Requires valid authenticated user session.
 *
 * @param {string} image - Base64 image string from webcam.
 * @returns {Promise<{ matched: boolean, employeeId: string|null, confidence: number, mock_mode?: boolean }>}
 */
export async function recognizeFace(image, employeeId = null) {
  const authHeader = await getAuthHeader();
  const headers = { 'Content-Type': 'application/json' };
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const response = await fetch(`${BASE_URL}/recognize-face`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ image, employeeId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `Recognition failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Health check for the FastAPI backend.
 * @returns {Promise<{ status: string, version?: string, mock_mode?: boolean }>}
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? res.json() : { status: 'error' };
  } catch {
    return { status: 'offline' };
  }
}
