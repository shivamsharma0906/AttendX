/**
 * firestoreService.js — All Firestore read/write operations.
 *
 * Collections used:
 *   employeeFaces/{employeeId}   → { employeeId, name, encoding: number[] }
 *   employees/{employeeId}       → { id, name, baseSalary, joinDate, ... }
 *   attendance/{docId}           → { empId, date, inTime, outTime, source }
 */

import {
  db,
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  query,
  where,
  serverTimestamp,
} from './firebase';

// ── Face Encodings ─────────────────────────────────────────────────────────

/**
 * Fetches all employee face encodings stored in Firestore.
 * Used by the Face Recognition kiosk to build the comparison list.
 *
 * @returns {Promise<Array<{employeeId: string, encoding: number[]}>>}
 */
export async function fetchAllEmployeeEncodings() {
  try {
    const snap = await getDocs(collection(db, 'employeeFaces'));
    const results = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.encoding && Array.isArray(data.encoding)) {
        results.push({
          employeeId: data.employeeId || docSnap.id,
          encoding: data.encoding,
        });
      }
    });
    return results;
  } catch (err) {
    console.error('[firestoreService] fetchAllEmployeeEncodings error:', err);
    return [];
  }
}

/**
 * Saves (or overwrites) an employee's averaged face encoding in Firestore.
 * Called after the register-face flow completes.
 *
 * @param {string}   employeeId
 * @param {string}   name
 * @param {number[]} encoding     - Averaged 128-d embedding
 */
export async function saveEmployeeEncoding(employeeId, name, encoding) {
  try {
    await setDoc(doc(db, 'employeeFaces', employeeId), {
      employeeId,
      name,
      encoding,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[firestoreService] saveEmployeeEncoding error:', err);
    throw err;
  }
}

// ── Employee Lookup ─────────────────────────────────────────────────────────

/**
 * Fetches a single employee document by ID from the employees collection.
 * Used after face recognition to display the employee's name in the greeting.
 *
 * @param {string} employeeId
 * @returns {Promise<{id: string, name: string, [key: string]: any} | null>}
 */
export async function getEmployeeById(employeeId) {
  try {
    const docSnap = await getDoc(doc(db, 'employees', employeeId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    // Fallback: check the employeeFaces collection for the name
    const faceSnap = await getDoc(doc(db, 'employeeFaces', employeeId));
    if (faceSnap.exists()) {
      return { id: employeeId, name: faceSnap.data().name || 'Employee', ...faceSnap.data() };
    }
    return null;
  } catch (err) {
    console.error('[firestoreService] getEmployeeById error:', err);
    return null;
  }
}

// ── Attendance ──────────────────────────────────────────────────────────────

/**
 * Marks attendance for a recognized employee in Firestore.
 * Upserts so running the face scanner twice on the same day only sets inTime once.
 *
 * @param {string} employeeId
 * @param {string} date         - Format: 'yyyy-MM-dd'
 * @param {string} inTime       - Format: 'HH:mm'
 */
export async function markAttendanceFirestore(employeeId, date, inTime) {
  const docId = `${employeeId}_${date}`;
  try {
    const ref = doc(db, 'attendance', docId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      // Already has an entry for today — don't overwrite inTime
      console.log('[firestoreService] Attendance already marked for today');
      return;
    }
    await setDoc(ref, {
      empId: employeeId,
      date,
      inTime,
      outTime: null,
      source: 'face-recognition',
      markedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[firestoreService] markAttendanceFirestore error:', err);
    throw err;
  }
}

/**
 * Fetches today's attendance records from Firestore.
 *
 * @param {string} date - Format: 'yyyy-MM-dd'
 * @returns {Promise<Array>}
 */
export async function fetchAttendanceByDate(date) {
  try {
    const q = query(collection(db, 'attendance'), where('date', '==', date));
    const snap = await getDocs(q);
    const records = [];
    snap.forEach((d) => records.push({ id: d.id, ...d.data() }));
    return records;
  } catch (err) {
    console.error('[firestoreService] fetchAttendanceByDate error:', err);
    return [];
  }
}
