// Salary + time calculation helpers

export const calcHours = (inTime, outTime) => {
  if (!inTime || !outTime) return 0;
  const [ih, im] = inTime.split(':').map(Number);
  const [oh, om] = outTime.split(':').map(Number);
  let diff = (oh + om / 60) - (ih + im / 60);
  if (diff < 0) diff += 24;
  return Math.max(0, diff);
};

// Status: 'absent' | 'half' | 'full' | 'overtime'
export const getStatus = (record) => {
  if (!record || (!record.inTime && !record.outTime)) return 'absent';
  const hrs = calcHours(record.inTime, record.outTime);
  if (hrs === 0) return 'present'; // only inTime saved
  if (hrs > 9) return 'overtime';
  if (hrs >= 4.5) return 'full';
  return 'half';
};

export const STATUS_COLORS = {
  absent:   { bg: '#f43f5e', bgAlpha: 'rgba(244,63,94,0.15)',   label: 'Absent',   text: '#f43f5e' },
  half:     { bg: '#fbbf24', bgAlpha: 'rgba(251,191,36,0.15)',  label: 'Half Day', text: '#fbbf24' },
  full:     { bg: '#34d399', bgAlpha: 'rgba(52,211,153,0.15)',  label: 'Full Day', text: '#34d399' },
  overtime: { bg: '#60a5fa', bgAlpha: 'rgba(96,165,250,0.15)',  label: 'Overtime', text: '#60a5fa' },
  present:  { bg: '#a78bfa', bgAlpha: 'rgba(167,139,250,0.15)', label: 'Active',   text: '#a78bfa' },
};

export const isLate = (inTime) => {
  if (!inTime) return false;
  const [h, m] = inTime.split(':').map(Number);
  return h > 9 || (h === 9 && m > 15);
};

export const calcFinalSalary = (baseSalary, workedHrs, targetHrs) => {
  if (!targetHrs || !workedHrs) return 0;
  return (baseSalary / targetHrs) * workedHrs;
};

export const fmtHrs = (h) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h ${mm > 0 ? mm + 'm' : ''}`.trim();
};

export const monthKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
