const mongoose = require("mongoose");
const Leave = require("../models/Leave");
const { LEAVE_POLICY, DASHBOARD_TYPES } = require("../config/leavePolicy");
const {
    roleOf,
    isPrivileged,
    getScopeIds,
    inScope,
    expandIds,
    resolveUserId,
    attachPeople,
    ymdIST,
} = require("../utils/accessScope");
const { notify, notifyApprovers } = require("../utils/notify");

const DAY_MS = 24 * 60 * 60 * 1000;
const LEAVE_TYPES = Object.keys(LEAVE_POLICY);
const todayYmd = () => ymdIST(new Date());

/* A date (or YYYY-MM-DD text) becomes the same calendar day at UTC midnight */
const normalizeDay = (value) => {
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const d = new Date(`${text}T00:00:00.000Z`);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(`${ymdIST(d)}T00:00:00.000Z`);
};

const dayNumber = (d) => Math.floor(new Date(d).getTime() / DAY_MS);
const dateText = (d) => new Date(d).toISOString().slice(0, 10);

const isOwner = (req, leave) =>
    [String(req.user._id), req.user.employee ? String(req.user.employee) : ""]
        .filter(Boolean)
        .includes(String(leave.employee));

const failWith = (res, error) => res.status(error.status).json({ message: error.message });

/* Used, pending and remaining days for every leave type in one year */
const buildBalance = async (ids, year) => {
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year + 1, 0, 1));

    const rows = await Leave.aggregate([
        {
            $match: {
                employee: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
                status: { $in: ["approved", "pending"] },
                startDate: { $gte: from, $lt: to },
            },
        },
        { $group: { _id: { type: "$leaveType", status: "$status" }, days: { $sum: "$totalDays" } } },
    ]);

    const used = {};
    const pending = {};
    rows.forEach((r) => {
        const bucket = r._id.status === "approved" ? used : pending;
        bucket[r._id.type] = (bucket[r._id.type] || 0) + r.days;
    });

    return LEAVE_TYPES.map((type) => {
        const allotted = LEAVE_POLICY[type];
        const u = used[type] || 0;
        return {
            leaveType: type,
            allotted,
            used: u,
            pending: pending[type] || 0,
            remaining: allotted === 0 ? 0 : Math.max(0, allotted - u),
        };
    });
};

/* Shared checks for applying and editing a leave. Returns { error } or { data }. */
const prepareLeave = async (body, personId, existing) => {
    const type = String(body.leaveType || "").toLowerCase();
    const reason = String(body.reason || "").trim();
    const start = normalizeDay(body.startDate);
    const end = normalizeDay(body.endDate);

    if (!LEAVE_TYPES.includes(type)) {
        return { error: { status: 400, message: `Leave type must be one of: ${LEAVE_TYPES.join(", ")}.` } };
    }
    if (!start || !end) return { error: { status: 400, message: "A valid start date and end date are required." } };
    if (end < start) return { error: { status: 400, message: "The end date cannot be before the start date." } };
    if (reason.length < 3) return { error: { status: 400, message: "Please enter a reason for the leave." } };

    const totalDays = dayNumber(end) - dayNumber(start) + 1;
    if (totalDays > 365) return { error: { status: 400, message: "A leave request cannot be longer than 365 days." } };

    const ids = await expandIds(personId);

    const overlapFilter = {
        employee: { $in: ids },
        status: { $in: ["pending", "approved"] },
        startDate: { $lte: end },
        endDate: { $gte: start },
    };
    if (existing) overlapFilter._id = { $ne: existing._id };
    if (await Leave.findOne(overlapFilter)) {
        return { error: { status: 409, message: "You already have a leave request for some of these dates." } };
    }

    const allotted = LEAVE_POLICY[type];
    if (allotted > 0) {
        const balance = await buildBalance(ids, start.getUTCFullYear());
        const row = balance.find((b) => b.leaveType === type);
        let available = allotted - row.used - row.pending;

        // Edit ke waqt, us request ke din pehle wapas jod diye jate hain
        if (
            existing &&
            existing.status === "pending" &&
            existing.leaveType === type &&
            new Date(existing.startDate).getUTCFullYear() === start.getUTCFullYear()
        ) {
            available += existing.totalDays || 0;
        }
        available = Math.max(0, available);

        if (totalDays > available) {
            return {
                error: {
                    status: 400,
                    message: `Not enough ${type} leave balance. Available: ${available} day(s), requested: ${totalDays} day(s).`,
                },
            };
        }
    }

    return { data: { leaveType: type, startDate: start, endDate: end, totalDays, reason } };
};

// @route GET /api/leave?status=&employee=
exports.getLeaves = async (req, res, next) => {
    try {
        const scope = await getScopeIds(req);
        const query = {};

        if (req.query.status && String(req.query.status).toUpperCase() !== "ALL") {
            query.status = String(req.query.status).toLowerCase();
        }

        const requested = String(req.query.employee || "");
        if (requested) {
            if (!mongoose.isValidObjectId(requested) || !inScope(scope, requested)) {
                return res.status(200).json({ success: true, count: 0, leaves: [], data: [] });
            }
            query.employee = { $in: await expandIds(requested) };
        } else if (scope !== null) {
            query.employee = { $in: scope };
        }

        const found = await Leave.find(query).sort({ createdAt: -1 }).limit(1000);
        const leaves = await attachPeople(found, ["employee", "approvedBy"]);

        return res.status(200).json({ success: true, count: leaves.length, leaves, data: leaves });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/leave/my-leaves
exports.getMyLeaves = async (req, res, next) => {
    try {
        const ids = await expandIds(req.user._id);
        const found = await Leave.find({ employee: { $in: ids } }).sort({ createdAt: -1 }).limit(500);
        const leaves = await attachPeople(found, ["employee", "approvedBy"]);
        return res.status(200).json({ success: true, count: leaves.length, leaves, data: leaves });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/leave/apply  (hamesha logged-in user ke liye)
exports.applyLeave = async (req, res, next) => {
    try {
        const prepared = await prepareLeave(req.body, String(req.user._id), null);
        if (prepared.error) return failWith(res, prepared.error);

        const leave = await Leave.create({ employee: req.user._id, ...prepared.data, status: "pending" });

        // Admin, HR aur is person ke manager ko notification
        await notifyApprovers(req.user._id, {
            type: "leave",
            title: "New leave request",
            message: `${req.user.name || "An employee"} applied for ${prepared.data.totalDays} day(s) of ${prepared.data.leaveType} leave (${dateText(prepared.data.startDate)} to ${dateText(prepared.data.endDate)}).`,
        });

        const [out] = await attachPeople([leave]);
        return res.status(201).json(out);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/leave/:id   (owner sirf pending request edit kar sakta hai)
exports.updateLeave = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Leave request not found." });
        }
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: "Leave request not found." });

        if (!isOwner(req, leave)) {
            return res.status(403).json({ message: "You can edit only your own leave requests." });
        }
        if (leave.status !== "pending") {
            return res.status(400).json({ message: "Only pending leave requests can be edited." });
        }

        const prepared = await prepareLeave(req.body, String(leave.employee), leave);
        if (prepared.error) return failWith(res, prepared.error);

        Object.assign(leave, prepared.data);
        await leave.save();

        const [out] = await attachPeople([leave], ["employee", "approvedBy"]);
        return res.status(200).json(out);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/leave/:id   (owner pending request delete kar sakta hai, admin koi bhi)
exports.deleteLeave = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Leave request not found." });
        }
        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: "Leave request not found." });

        const admin = roleOf(req) === "admin";
        if (!isOwner(req, leave) && !admin) {
            return res.status(403).json({ message: "You can delete only your own leave requests." });
        }
        if (!admin && leave.status !== "pending") {
            return res.status(400).json({ message: "Only pending leave requests can be deleted." });
        }

        await leave.deleteOne();
        return res.status(200).json({ success: true, message: "Leave request deleted successfully." });
    } catch (err) {
        next(err);
    }
};

/* Approve aur reject ke liye same checks */
const decide = (status) => async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Leave request not found." });
        }

        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: "Leave request not found." });

        if (leave.status !== "pending") {
            return res.status(400).json({ message: `This leave request is already ${leave.status}.` });
        }
        if (isOwner(req, leave) && roleOf(req) !== "admin") {
            return res.status(403).json({ message: "You cannot approve or reject your own leave request." });
        }

        const scope = await getScopeIds(req);
        if (!inScope(scope, leave.employee)) {
            return res.status(403).json({ message: "You can handle leave requests only for your own team." });
        }

        leave.status = status;
        leave.approvedBy = req.user._id;
        leave.approvedOn = new Date();
        if (status === "rejected") {
            leave.rejectionReason = String(req.body.rejectionReason || "").trim().slice(0, 300) || "Rejected by the approver";
        }
        await leave.save();

        // Jisne apply kiya, usko result ki notification
        const applicant = await resolveUserId(leave.employee);
        await notify(applicant, {
            type: "leave",
            title: status === "approved" ? "Leave approved" : "Leave rejected",
            message:
                status === "approved"
                    ? `Your ${leave.leaveType} leave (${leave.totalDays} day(s)) was approved by ${req.user.name}.`
                    : `Your ${leave.leaveType} leave was rejected by ${req.user.name}. Reason: ${leave.rejectionReason}`,
            exclude: req.user._id,
        });

        const [out] = await attachPeople([leave], ["employee", "approvedBy"]);
        return res.status(200).json(out);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/leave/:id/approve
exports.approveLeave = decide("approved");

// @route PUT /api/leave/:id/reject
exports.rejectLeave = decide("rejected");

// @route PUT /api/leave/:id/cancel
exports.cancelLeave = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Leave request not found." });
        }

        const leave = await Leave.findById(req.params.id);
        if (!leave) return res.status(404).json({ message: "Leave request not found." });

        const owner = isOwner(req, leave);
        const privileged = isPrivileged(req);
        if (!owner && !privileged) {
            return res.status(403).json({ message: "You can cancel only your own leave requests." });
        }
        if (["cancelled", "rejected"].includes(leave.status)) {
            return res.status(400).json({ message: `This leave request is already ${leave.status}.` });
        }
        if (owner && !privileged && leave.status === "approved") {
            const today = dayNumber(normalizeDay(todayYmd()));
            if (dayNumber(leave.startDate) <= today) {
                return res.status(400).json({ message: "A leave that has already started cannot be cancelled. Please contact HR." });
            }
        }

        leave.status = "cancelled";
        await leave.save();

        const [out] = await attachPeople([leave]);
        return res.status(200).json(out);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/leave/balance/:employeeId?year=
exports.getLeaveBalance = async (req, res, next) => {
    try {
        const target = req.params.employeeId;
        const scope = await getScopeIds(req);
        if (!mongoose.isValidObjectId(target) || !inScope(scope, target)) {
            return res.status(403).json({ message: "You are not allowed to view this leave balance." });
        }

        const year = parseInt(req.query.year, 10) || Number(todayYmd().slice(0, 4));
        return res.status(200).json(await buildBalance(await expandIds(target), year));
    } catch (err) {
        next(err);
    }
};

// @route GET /api/leave/quota  (logged-in user ka total, used aur remaining)
exports.getMyLeaveQuota = async (req, res, next) => {
    try {
        const year = parseInt(req.query.year, 10) || Number(todayYmd().slice(0, 4));
        const byType = await buildBalance(await expandIds(req.user._id), year);

        const general = byType.filter((b) => DASHBOARD_TYPES.includes(b.leaveType));
        const sum = (key) => general.reduce((total, b) => total + b[key], 0);

        return res.status(200).json({
            year,
            allotted: sum("allotted"),
            used: sum("used"),
            pending: sum("pending"),
            remaining: sum("remaining"),
            byType,
        });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/leave/policies  (har leave type ka saal bhar ka quota, config se)
exports.getLeavePolicies = async (req, res, next) => {
    try {
        const policies = LEAVE_TYPES.map((leaveType) => ({
            leaveType,
            label: `${leaveType.charAt(0).toUpperCase()}${leaveType.slice(1)} Leave`,
            annualQuota: LEAVE_POLICY[leaveType],
        }));
        const total = policies.reduce((sum, p) => sum + p.annualQuota, 0);
        return res.status(200).json({ success: true, policies, total });
    } catch (err) {
        next(err);
    }
};