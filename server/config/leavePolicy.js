// Yearly leave quota (days). Change the numbers here and the whole HRMS follows.
const LEAVE_POLICY = {
    sick: 12,
    casual: 12,
    earned: 15,
    maternity: 180,
    paternity: 15,
    unpaid: 0, // 0 = no limit
};

// These types are added up for the dashboard card "Leave Days Remaining"
const DASHBOARD_TYPES = ["sick", "casual", "earned"];

module.exports = { LEAVE_POLICY, DASHBOARD_TYPES };