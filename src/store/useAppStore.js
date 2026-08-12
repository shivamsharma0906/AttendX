import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '../services/firebase';

const db = getFirestore(app);

/* ── Employee ID Sanitizer Helper ──
 * Automatically converts legacy timestamp IDs (e.g. 1775661116720)
 * into short, clean, sequential Employee IDs (100, 101, 102...).
 */
const sanitizeEmployeeState = (employees = [], records = []) => {
  let hasLongId = false;
  const idMapping = {};

  const cleanEmployees = employees.map((emp, idx) => {
    const rawId = String(emp.id || emp.employeeId || '');
    if (!rawId || rawId.length > 6 || isNaN(Number(rawId))) {
      hasLongId = true;
      const newId = String(100 + idx);
      idMapping[rawId] = newId;
      return { ...emp, id: newId, employeeId: newId };
    }
    return emp;
  });

  if (!hasLongId) {
    return { employees, records };
  }

  const cleanRecords = records.map((rec) => {
    const oldEmpId = String(rec.empId || rec.employeeId || '');
    if (idMapping[oldEmpId]) {
      return { ...rec, empId: idMapping[oldEmpId], employeeId: idMapping[oldEmpId] };
    }
    return rec;
  });

  return { employees: cleanEmployees, records: cleanRecords };
};

const useStore = create(
  persist(
    (set, get) => ({
      /* ─── Auth ─── */
      user: null,
      login: (u) => set({ user: u }),
      logout: () => set({ user: null }),

      /* ─── Settings ─── */
      settings: {
        workingDays: 26,
        hoursPerDay: 9,
        shiftStart: '09:00',
        shiftEnd: '18:00',
        weeklyOffs: ['Sunday'],
        holidays: [
          { date: '2026-01-01', name: "New Year's Day" },
          { date: '2026-08-15', name: 'Independence Day' },
        ],
        gracePeriod: 15,
        breakDuration: 60,
        overtimeMinHrs: 9,
        overtimeMultiplier: 1.5,
        halfDayMaxHrs: 4.5,
        fullDayMinHrs: 9,
        cutoffTime: '11:00',
        allocatedLeaves: 12,
        payrollMultiplier: 1.0,
      },
      fetchSettings: async () => {
        try {
          const docRef = doc(db, 'settings', 'workPolicy');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            set({ settings: { ...get().settings, ...docSnap.data() } });
          } else {
            await setDoc(docRef, get().settings);
          }
        } catch (e) {
          console.error('Error fetching settings from Firestore:', e);
        }
      },
      updateSettings: (s) => {
        set((st) => {
          const newSettings = { ...st.settings, ...s };
          setDoc(doc(db, 'settings', 'workPolicy'), newSettings).catch((e) =>
            console.error('Error updating settings in Firestore:', e)
          );
          return { settings: newSettings };
        });
      },

      /* ─── Employees ─── */
      employees: [],
      addEmployee: (e) =>
        set((s) => {
          let nextId = 100;
          if (s.employees?.length > 0) {
            const ids = s.employees
              .map((emp) => parseInt(emp.id || emp.employeeId, 10))
              .filter((n) => !isNaN(n) && n >= 100 && n < 100000);
            if (ids.length > 0) nextId = Math.max(100, ...ids) + 1;
          }
          const cleanEmp = { ...e, id: String(e.id && e.id.length <= 6 ? e.id : nextId), employeeId: String(e.id && e.id.length <= 6 ? e.id : nextId) };
          return { employees: [...s.employees, cleanEmp] };
        }),
      updateEmployee: (id, d) =>
        set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, ...d } : e)) })),
      removeEmployee: (id) =>
        set((s) => ({
          employees: s.employees.filter((e) => e.id !== id),
          records: s.records.filter((r) => r.empId !== id),
        })),

      /* ─── Attendance Records ─── */
      records: [],
      addRecords: (newRecs) =>
        set((s) => {
          const existing = [...s.records];
          newRecs.forEach((nr) => {
            const idx = existing.findIndex((r) => r.empId === nr.empId && r.date === nr.date);
            if (idx >= 0) existing[idx] = { ...existing[idx], ...nr };
            else existing.push(nr);
          });
          return { records: existing };
        }),
      addRecord: (r) => get().addRecords([r]),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),

      /* ─── Helpers ─── */
      getEmpRecords: (empId, month) => {
        const recs = get().records.filter((r) => r.empId === empId);
        return month ? recs.filter((r) => r.date.startsWith(month)) : recs;
      },
    }),
    {
      name: 'nexuspay-v3',
      onRehydrateStorage: () => (state) => {
        if (state && state.employees?.length) {
          const sanitized = sanitizeEmployeeState(state.employees, state.records);
          state.employees = sanitized.employees;
          state.records = sanitized.records;
        }
      },
    }
  )
);

export default useStore;
