const TZ = "Asia/Kolkata";

// Aaj ki date IST me, "YYYY-MM-DD"
const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

// "YYYY-MM-DD" -> 0..6 (0 = Sunday)
const dayOfWeek = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay();

const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

// "18:30" -> "06:30 PM"
const to12h = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
};

// 480 -> "08h 00m"
const formatDuration = (mins) =>
    `${String(Math.floor(mins / 60)).padStart(2, "0")}h ${String(mins % 60).padStart(2, "0")}m`;

// Dashboard ke liye shift ka ready-to-show roop
const describeShift = (shift) => {
    if (!shift) return null;
    const mins = shift.durationMinutes;
    return {
        _id: shift._id,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakMinutes: shift.breakMinutes,
        workingDays: shift.workingDays,
        isNightShift: shift.isNightShift,
        durationMinutes: mins,
        durationLabel: formatDuration(mins),
        timeLabel: `${to12h(shift.startTime)} to ${to12h(shift.endTime)}`,
    };
};

// ===== Attendance me use karne ke liye =====
// checkIn/checkOut "HH:mm" (IST). graceMinutes: kitni der tak late nahi ginna.
const lateMinutes = (checkIn, shift, graceMinutes = 0) => {
    if (!shift || !checkIn) return 0;
    return Math.max(0, toMinutes(checkIn) - toMinutes(shift.startTime) - graceMinutes);
};

const earlyLeaveMinutes = (checkOut, shift) => {
    // Night shift me checkout agle din hota hai, uska alag hisaab chahiye; abhi skip.
    if (!shift || !checkOut || shift.isNightShift) return 0;
    return Math.max(0, toMinutes(shift.endTime) - toMinutes(checkOut));
};

module.exports = {
    todayIST,
    dayOfWeek,
    toMinutes,
    to12h,
    formatDuration,
    describeShift,
    lateMinutes,
    earlyLeaveMinutes,
};