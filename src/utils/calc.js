// Salary + time calculation helpers with Leave & Shift support

export const calcHours = (inTime, outTime) => {
  if (!inTime || !outTime) return 0;
  const [ih, im] = inTime.split(':').map(Number);
  const [oh, om] = outTime.split(':').map(Number);
  let diff = (oh + om / 60) - (ih + im / 60);
  if (diff < 0) diff += 24;
  return Math.max(0, diff);
};

/**
 * Calculates attendance status based on hours worked and leave status.
 * Statuses: 'absent' | 'half' | 'full' | 'overtime' | 'present' | 'on-leave'
 */
export const getStatus = (record, approvedLeaveDates = [], settings = {}) => {
  if (record?.isOnLeave || (record?.date && approvedLeaveDates.includes(record.date))) {
    return 'on-leave';
  }
  if (!record || (!record.inTime && !record.outTime)) return 'absent';
  const hrs = calcHours(record.inTime, record.outTime);
  if (hrs === 0) return 'present'; // only inTime saved
  
  const otMin = settings?.overtimeMinHrs !== undefined ? settings.overtimeMinHrs : 9;
  const fullMin = settings?.fullDayMinHrs !== undefined ? settings.fullDayMinHrs : 9;
  const halfMax = settings?.halfDayMaxHrs !== undefined ? settings.halfDayMaxHrs : 4.5;

  if (hrs > otMin) return 'overtime';
  if (hrs >= fullMin) return 'full';
  if (hrs >= halfMax) return 'half';
  return 'absent';
};

export const STATUS_COLORS = {
  absent:   { bg: '#f43f5e', bgAlpha: 'rgba(244,63,94,0.15)',   label: 'Absent',   text: '#f43f5e' },
  half:     { bg: '#fbbf24', bgAlpha: 'rgba(251,191,36,0.15)',  label: 'Half Day', text: '#fbbf24' },
  full:     { bg: '#34d399', bgAlpha: 'rgba(52,211,153,0.15)',  label: 'Full Day', text: '#34d399' },
  overtime: { bg: '#60a5fa', bgAlpha: 'rgba(96,165,250,0.15)',  label: 'Overtime', text: '#60a5fa' },
  present:  { bg: '#a78bfa', bgAlpha: 'rgba(167,139,250,0.15)', label: 'Active',   text: '#a78bfa' },
  'on-leave':{ bg: '#38bdf8', bgAlpha: 'rgba(56,189,248,0.15)',  label: 'On Leave', text: '#38bdf8' },
};

/**
 * Checks if check-in time is late compared to assigned shift start time.
 * @param {string} inTime - Format 'HH:mm'
 * @param {string} [shiftStartTime='09:00'] - Expected shift start time ('HH:mm')
 * @param {number} [gracePeriodMinutes=15] - Grace period in minutes
 */
export const isLate = (inTime, shiftStartTime = '09:00', gracePeriodMinutes = 15) => {
  if (!inTime) return false;
  const [ih, im] = inTime.split(':').map(Number);
  const [sh, sm] = shiftStartTime.split(':').map(Number);

  const checkInMins = ih * 60 + im;
  const shiftMins = sh * 60 + sm + gracePeriodMinutes;

  return checkInMins > shiftMins;
};

export const calcFinalSalary = (baseSalary, workedHrs, targetHrs, leaveDaysCount = 0, totalWorkingDays = 22) => {
  if (!targetHrs || !workedHrs) return 0;
  // Paid leave credit adjustment
  const leaveCredit = (baseSalary / totalWorkingDays) * leaveDaysCount;
  const baseEarned = (baseSalary / targetHrs) * workedHrs;
  return Math.min(baseSalary, baseEarned + leaveCredit);
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
