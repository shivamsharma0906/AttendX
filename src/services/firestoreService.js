/**
 * firestoreService.js — All Firestore read/write operations.
 *
 * Collections used:
 *   employeeFaces/{employeeId}   → { employeeId, name, encoding: number[] }
 *   employees/{employeeId}       → { id, name, baseSalary, joinDate, ... }
 *   attendance/{docId}           → { empId, date, inTime, outTime, source }
 *   leaveRequests/{docId}        → { employeeId, employeeName, startDate, endDate, reason, type, status, requestedAt, reviewedBy, comment }
 *   notifications/{docId}        → { recipientRole, type, title, message, metadata, isRead, createdAt }
 *   shifts/{employeeId}          → { employeeId, startTime, endTime, daysOfWeek, updatedAt }
 */

import {
  db,
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from './firebase';

// ── Face Encodings ─────────────────────────────────────────────────────────

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

export async function getEmployeeById(employeeId) {
  try {
    const docSnap = await getDoc(doc(db, 'employees', employeeId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
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

export async function markAttendanceFirestore(employeeId, date, inTime) {
  const docId = `${employeeId}_${date}`;
  try {
    const ref = doc(db, 'attendance', docId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
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

// ── Leave / Time-Off Management ──────────────────────────────────────────────

export async function createLeaveRequest({ employeeId, employeeName, startDate, endDate, reason, type }) {
  try {
    const ref = await addDoc(collection(db, 'leaveRequests'), {
      employeeId,
      employeeName: employeeName || 'Employee',
      startDate,
      endDate,
      reason,
      type: type || 'casual', // 'sick' | 'casual' | 'paid'
      status: 'pending',     // 'pending' | 'approved' | 'rejected'
      requestedAt: serverTimestamp(),
      reviewedBy: null,
      reviewedAt: null,
      comment: '',
    });

    // Notify admin
    await createNotification({
      recipientRole: 'admin',
      type: 'leave_request',
      title: 'New Leave Request',
      message: `${employeeName || employeeId} submitted a ${type} leave request (${startDate} to ${endDate}).`,
      metadata: { requestId: ref.id, employeeId },
    });

    return ref.id;
  } catch (err) {
    console.error('[firestoreService] createLeaveRequest error:', err);
    throw err;
  }
}

export async function getLeaveRequestsByEmployee(employeeId) {
  try {
    const q = query(collection(db, 'leaveRequests'), where('employeeId', '==', employeeId));
    const snap = await getDocs(q);
    const requests = [];
    snap.forEach((d) => requests.push({ id: d.id, ...d.data() }));
    return requests;
  } catch (err) {
    console.error('[firestoreService] getLeaveRequestsByEmployee error:', err);
    return [];
  }
}

export async function getAllLeaveRequests() {
  try {
    const snap = await getDocs(collection(db, 'leaveRequests'));
    const requests = [];
    snap.forEach((d) => requests.push({ id: d.id, ...d.data() }));
    return requests;
  } catch (err) {
    console.error('[firestoreService] getAllLeaveRequests error:', err);
    return [];
  }
}

export async function updateLeaveRequestStatus(requestId, status, comment = '', reviewerId = 'admin') {
  try {
    const ref = doc(db, 'leaveRequests', requestId);
    await updateDoc(ref, {
      status,
      comment,
      reviewedBy: reviewerId,
      reviewedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[firestoreService] updateLeaveRequestStatus error:', err);
    throw err;
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function createNotification({ recipientRole = 'admin', type, title, message, metadata = {} }) {
  try {
    await addDoc(collection(db, 'notifications'), {
      recipientRole,
      type,
      title,
      message,
      metadata,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[firestoreService] createNotification error:', err);
  }
}

export async function getAdminNotifications() {
  try {
    const q = query(collection(db, 'notifications'), where('recipientRole', '==', 'admin'));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (err) {
    console.error('[firestoreService] getAdminNotifications error:', err);
    return [];
  }
}

export async function markNotificationRead(notificationId) {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
    });
  } catch (err) {
    console.error('[firestoreService] markNotificationRead error:', err);
  }
}

// ── Shift Scheduling ──────────────────────────────────────────────────────────

export async function setEmployeeShift(employeeId, shiftData) {
  try {
    await setDoc(doc(db, 'shifts', employeeId), {
      employeeId,
      startTime: shiftData.startTime || '09:00',
      endTime: shiftData.endTime || '17:00',
      daysOfWeek: shiftData.daysOfWeek || [1, 2, 3, 4, 5], // Monday - Friday
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[firestoreService] setEmployeeShift error:', err);
    throw err;
  }
}

export async function getEmployeeShift(employeeId) {
  try {
    const snap = await getDoc(doc(db, 'shifts', employeeId));
    if (snap.exists()) {
      return snap.data();
    }
    // Default shift: 09:00 to 17:00 (Mon-Fri)
    return {
      employeeId,
      startTime: '09:00',
      endTime: '17:00',
      daysOfWeek: [1, 2, 3, 4, 5],
    };
  } catch (err) {
    console.error('[firestoreService] getEmployeeShift error:', err);
    return { startTime: '09:00', endTime: '17:00', daysOfWeek: [1, 2, 3, 4, 5] };
  }
}

export async function getAllShifts() {
  try {
    const snap = await getDocs(collection(db, 'shifts'));
    const map = {};
    snap.forEach((d) => {
      map[d.id] = d.data();
    });
    return map;
  } catch (err) {
    console.error('[firestoreService] getAllShifts error:', err);
    return {};
  }
}

// ── Task Management ────────────────────────────────────────────────────────────

export async function createTask({ title, description, assignedEmployeeId, assignedEmployeeName, priority, dueDate, createdBy }) {
  try {
    const ref = await addDoc(collection(db, 'tasks'), {
      title,
      description: description || '',
      assignedEmployeeId,
      assignedEmployeeName: assignedEmployeeName || '',
      priority: priority || 'medium',
      dueDate,
      status: 'pending',
      createdBy: createdBy || 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('[firestoreService] createTask error:', err);
    throw err;
  }
}

export async function getAllTasks() {
  try {
    const snap = await getDocs(query(collection(db, 'tasks'), orderBy('createdAt', 'desc')));
    const tasks = [];
    snap.forEach((d) => tasks.push({ id: d.id, ...d.data() }));
    return tasks;
  } catch {
    // Fallback without orderBy if index not built
    try {
      const snap2 = await getDocs(collection(db, 'tasks'));
      const tasks2 = [];
      snap2.forEach((d) => tasks2.push({ id: d.id, ...d.data() }));
      return tasks2.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (err2) {
      console.error('[firestoreService] getAllTasks error:', err2);
      return [];
    }
  }
}

export async function getTasksByEmployee(employeeId) {
  try {
    const q = query(collection(db, 'tasks'), where('assignedEmployeeId', '==', String(employeeId)));
    const snap = await getDocs(q);
    const tasks = [];
    snap.forEach((d) => tasks.push({ id: d.id, ...d.data() }));
    return tasks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (err) {
    console.error('[firestoreService] getTasksByEmployee error:', err);
    return [];
  }
}

export async function updateTaskStatus(taskId, status) {
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[firestoreService] updateTaskStatus error:', err);
    throw err;
  }
}

export async function updateTask(taskId, updates) {
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[firestoreService] updateTask error:', err);
    throw err;
  }
}

export async function deleteTask(taskId) {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (err) {
    console.error('[firestoreService] deleteTask error:', err);
    throw err;
  }
}

// ── Audit Logging ─────────────────────────────────────────────────────────────

export async function logAuditEvent({ actor, action, target, details }) {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      actor: actor || 'System / Admin',
      action,
      target: target || 'N/A',
      details: details || '',
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('[firestoreService] logAuditEvent error:', err);
  }
}

export async function getAuditLogs() {
  try {
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    const logs = [];
    snap.forEach((d) => logs.push({ id: d.id, ...d.data() }));
    return logs;
  } catch {
    try {
      const snap2 = await getDocs(collection(db, 'auditLogs'));
      const logs2 = [];
      snap2.forEach((d) => logs2.push({ id: d.id, ...d.data() }));
      return logs2.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    } catch {
      return [];
    }
  }
}
