import React, { useState, useEffect } from 'react';
import { getAllShifts, setEmployeeShift } from '../services/firestoreService';
import { Clock, Calendar, Save, User, X } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
];

export default function ShiftManagementModal({ isOpen, onClose, employees = [] }) {
  const [shiftsMap, setShiftsMap] = useState({});
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [daysOfWeek, setDaysOfWeek] = useState([1, 2, 3, 4, 5]);
  const [saving, setSaving] = useState(false);

  const loadShifts = React.useCallback(async () => {
    const data = await getAllShifts();
    setShiftsMap(data);
    if (employees.length > 0) {
      const firstId = employees[0].id || employees[0].employeeId;
      setSelectedEmpId(firstId);
      populateForm(firstId, data);
    }
  }, [employees]);

  useEffect(() => {
    if (isOpen) {
      loadShifts();
    }
  }, [isOpen, loadShifts]);

  const populateForm = (empId, currentShiftsMap) => {
    const shift = currentShiftsMap[empId] || {
      startTime: '09:00',
      endTime: '17:00',
      daysOfWeek: [1, 2, 3, 4, 5],
    };
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setDaysOfWeek(shift.daysOfWeek || [1, 2, 3, 4, 5]);
  };

  const handleSelectEmployee = (e) => {
    const empId = e.target.value;
    setSelectedEmpId(empId);
    populateForm(empId, shiftsMap);
  };

  const toggleDay = (dayId) => {
    if (daysOfWeek.includes(dayId)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== dayId));
    } else {
      setDaysOfWeek([...daysOfWeek, dayId]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    setSaving(true);
    try {
      await setEmployeeShift(selectedEmpId, {
        startTime,
        endTime,
        daysOfWeek,
      });

      setShiftsMap({
        ...shiftsMap,
        [selectedEmpId]: { startTime, endTime, daysOfWeek },
      });

      toast.success('Shift schedule saved successfully!');
    } catch (err) {
      console.error('Save shift error:', err);
      toast.error('Failed to save shift.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Shift Scheduling</h2>
              <p className="text-xs text-slate-400">Configure customized work hours per employee</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Employee
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <select
                value={selectedEmpId}
                onChange={handleSelectEmployee}
                className="w-full pl-10 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
              >
                {employees.map((emp) => {
                  const empId = emp.id || emp.employeeId;
                  return (
                    <option key={empId} value={empId}>
                      {emp.name || empId} ({empId})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Shift Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Shift End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Active Days of Week
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const active = daysOfWeek.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`py-2 px-3.5 rounded-xl text-xs font-semibold transition ${
                      active
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Shift Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
