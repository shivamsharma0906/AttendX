import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
      /* ─── Auth ─── */
      user: null,
      login:  (u) => set({ user: u }),
      logout: ()  => set({ user: null }),

      /* ─── Settings ─── */
      settings: { workingDays: 26, hoursPerDay: 9 },
      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),

      /* ─── Employees ─── */
      employees: [],
      addEmployee:    (e) => set((s) => ({ employees: [...s.employees, e] })),
      updateEmployee: (id, d) => set((s) => ({ employees: s.employees.map(e => e.id === id ? { ...e, ...d } : e) })),
      removeEmployee: (id) => set((s) => ({
        employees: s.employees.filter(e => e.id !== id),
        records:   s.records.filter(r => r.empId !== id),
      })),

      /* ─── Attendance Records ─── */
      records: [],
      addRecords: (newRecs) => set((s) => {
        // Upsert: replace existing record for same empId+date, else add
        const existing = [...s.records];
        newRecs.forEach(nr => {
          const idx = existing.findIndex(r => r.empId === nr.empId && r.date === nr.date);
          if (idx >= 0) existing[idx] = { ...existing[idx], ...nr };
          else existing.push(nr);
        });
        return { records: existing };
      }),
      addRecord:  (r) => get().addRecords([r]),
      deleteRecord: (id) => set((s) => ({ records: s.records.filter(r => r.id !== id) })),

      /* ─── Helpers ─── */
      getEmpRecords: (empId, month /* 'yyyy-MM' */) => {
        const recs = get().records.filter(r => r.empId === empId);
        return month ? recs.filter(r => r.date.startsWith(month)) : recs;
      },
    }),
    { name: 'nexuspay-v3' }
  )
);

export default useStore;
