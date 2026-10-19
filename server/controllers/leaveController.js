
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
    [String(req.user._id), req.user.employee ? String(req.user.employee) : ""].filter(Boolean).includes(String(leave.employee));

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
        // when editing, the days of the request being edited are given back first
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

// @route POST /api/leave/apply  (always for the logged-in user)
exports.applyLeave = async (req, res, next) => {
    try {
        const prepared = await prepareLeave(req.body, String(req.user._id), null);
        if (prepared.error) return failWith(res, prepared.error);

        const leave = await Leave.create({ employee: req.user._id, ...prepared.data, status: "pending" });

        // Admin, HR and the manager of this person get a notification
        await notifyApprovers(req.user._id, {
            type: "leave",
            title: "New leave request",
            title: status === "approved" ? "Leave approved" : "Leave rejected",
            message: `${req.user.name || "An employee"} applied for ${prepared.data.totalDays} day(s) of ${prepared.data.leaveType} leave (${dateText(prepared.data.startDate)} to ${dateText(prepared.data.endDate)}).`,
        });

        const [out] = await attachPeople([leave]);
        return res.status(201).json(out);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/leave/:id   (the owner edits a pending request)
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

// @route DELETE /api/leave/:id   (the owner deletes a pending request, an admin can delete any)
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

/* Approve and reject share the same checks */
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

        // The employee who applied gets the result
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
            const today = dayNumber(normalizeDay(ymdIST()));
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

        const year = parseInt(req.query.year, 10) || Number(ymdIST().slice(0, 4));
        return res.status(200).json(await buildBalance(await expandIds(target), year));
    } catch (err) {
        next(err);
    }
};

// @route GET /api/leave/quota  (total, used and remaining days of the logged-in user)
exports.getMyLeaveQuota = async (req, res, next) => {
    try {
        const year = parseInt(req.query.year, 10) || Number(ymdIST().slice(0, 4));
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


// const mongoose = require("mongoose");
// const Leave = require("../models/Leave");
// const { LEAVE_POLICY, DASHBOARD_TYPES } = require("../config/leavePolicy");
// const { roleOf, isPrivileged, getScopeIds, inScope, expandIds, attachPeople, ymdIST } = require("../utils/accessScope");
// const { notify, notifyApprovers } = require("../utils/notify");

// const DAY_MS = 24 * 60 * 60 * 1000;
// const LEAVE_TYPES = Object.keys(LEAVE_POLICY);

// /* A date (or YYYY-MM-DD text) becomes the same calendar day at UTC midnight */
// const normalizeDay = (value) => {
//     const text = String(value || "").trim();
//     if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
//         const d = new Date(`${text}T00:00:00.000Z`);
//         return Number.isNaN(d.getTime()) ? null : d;
//     }
//     const d = new Date(value);
//     if (Number.isNaN(d.getTime())) return null;
//     return new Date(`${ymdIST(d)}T00:00:00.000Z`);
// };

// const dayNumber = (d) => Math.floor(new Date(d).getTime() / DAY_MS);

// const isOwner = (req, leave) =>
//     [String(req.user._id), req.user.employee ? String(req.user.employee) : ""].filter(Boolean).includes(String(leave.employee));

// /* Used, pending and remaining days for every leave type in one year */
// const buildBalance = async (ids, year) => {
//     const from = new Date(Date.UTC(year, 0, 1));
//     const to = new Date(Date.UTC(year + 1, 0, 1));

//     const rows = await Leave.aggregate([
//         {
//             $match: {
//                 employee: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
//                 status: { $in: ["approved", "pending"] },
//                 startDate: { $gte: from, $lt: to },
//             },
//         },
//         { $group: { _id: { type: "$leaveType", status: "$status" }, days: { $sum: "$totalDays" } } },
//     ]);

//     const used = {};
//     const pending = {};
//     rows.forEach((r) => {
//         const bucket = r._id.status === "approved" ? used : pending;
//         bucket[r._id.type] = (bucket[r._id.type] || 0) + r.days;
//     });

//     return LEAVE_TYPES.map((type) => {
//         const allotted = LEAVE_POLICY[type];
//         const u = used[type] || 0;
//         return {
//             leaveType: type,
//             allotted,
//             used: u,
//             pending: pending[type] || 0,
//             remaining: allotted === 0 ? 0 : Math.max(0, allotted - u),
//         };
//     });
// };

// // @route GET /api/leave?status=&employee=
// exports.getLeaves = async (req, res, next) => {
//     try {
//         const scope = await getScopeIds(req);
//         const query = {};

//         if (req.query.status && String(req.query.status).toUpperCase() !== "ALL") {
//             query.status = String(req.query.status).toLowerCase();
//         }

//         const requested = String(req.query.employee || "");
//         if (requested) {
//             if (!mongoose.isValidObjectId(requested) || !inScope(scope, requested)) {
//                 return res.status(200).json({ success: true, count: 0, leaves: [], data: [] });
//             }
//             query.employee = { $in: await expandIds(requested) };
//         } else if (scope !== null) {
//             query.employee = { $in: scope };
//         }

//         const found = await Leave.find(query).sort({ createdAt: -1 }).limit(1000);
//         const leaves = await attachPeople(found, ["employee", "approvedBy"]);

//         return res.status(200).json({ success: true, count: leaves.length, leaves, data: leaves });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/leave/apply  (always for the logged-in user)
// exports.applyLeave = async (req, res, next) => {
//     try {
//         const userId = String(req.user._id);
//         const type = String(req.body.leaveType || "").toLowerCase();
//         const reason = String(req.body.reason || "").trim();
//         const start = normalizeDay(req.body.startDate);
//         const end = normalizeDay(req.body.endDate);

//         if (!LEAVE_TYPES.includes(type)) {
//             return res.status(400).json({ message: `Leave type must be one of: ${LEAVE_TYPES.join(", ")}.` });
//         }
//         if (!start || !end) {
//             return res.status(400).json({ message: "A valid start date and end date are required." });
//         }
//         if (end < start) {
//             return res.status(400).json({ message: "The end date cannot be before the start date." });
//         }
//         if (reason.length < 3) {
//             return res.status(400).json({ message: "Please enter a reason for the leave." });
//         }

//         const totalDays = dayNumber(end) - dayNumber(start) + 1;
//         if (totalDays > 365) {
//             return res.status(400).json({ message: "A leave request cannot be longer than 365 days." });
//         }

//         const ids = await expandIds(userId);

//         const overlap = await Leave.findOne({
//             employee: { $in: ids },
//             status: { $in: ["pending", "approved"] },
//             startDate: { $lte: end },
//             endDate: { $gte: start },
//         });
//         if (overlap) {
//             return res.status(409).json({ message: "You already have a leave request for some of these dates." });
//         }

//         const allotted = LEAVE_POLICY[type];
//         if (allotted > 0) {
//             const balance = await buildBalance(ids, start.getUTCFullYear());
//             const row = balance.find((b) => b.leaveType === type);
//             const available = Math.max(0, allotted - row.used - row.pending);
//             if (totalDays > available) {
//                 return res.status(400).json({
//                     message: `Not enough ${type} leave balance. Available: ${available} day(s), requested: ${totalDays} day(s).`,
//                 });
//             }
//         }

//         const leave = await Leave.create({
//             employee: userId,
//             leaveType: type,
//             startDate: start,
//             endDate: end,
//             totalDays,
//             reason,
//             status: "pending",
//         });

//         const [out] = await attachPeople([leave]);
//         return res.status(201).json(out);
//     } catch (err) {
//         next(err);
//     }
// };



// /* Approve and reject share the same checks */
// const decide = (status) => async (req, res, next) => {
//     try {
//         if (!mongoose.isValidObjectId(req.params.id)) {
//             return res.status(404).json({ message: "Leave request not found." });
//         }

//         const leave = await Leave.findById(req.params.id);
//         if (!leave) return res.status(404).json({ message: "Leave request not found." });

//         if (leave.status !== "pending") {
//             return res.status(400).json({ message: `This leave request is already ${leave.status}.` });
//         }
//         if (isOwner(req, leave) && roleOf(req) !== "admin") {
//             return res.status(403).json({ message: "You cannot approve or reject your own leave request." });
//         }

//         const scope = await getScopeIds(req);
//         if (!inScope(scope, leave.employee)) {
//             return res.status(403).json({ message: "You can handle leave requests only for your own team." });
//         }

//         leave.status = status;
//         leave.approvedBy = req.user._id;
//         leave.approvedOn = new Date();
//         if (status === "rejected") {
//             leave.rejectionReason = String(req.body.rejectionReason || "").trim().slice(0, 300) || "Rejected by the approver";
//         }
//         await leave.save();

//         const [out] = await attachPeople([leave], ["employee", "approvedBy"]);
//         return res.status(200).json(out);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/leave/:id/approve
// exports.approveLeave = decide("approved");

// // @route PUT /api/leave/:id/reject
// exports.rejectLeave = decide("rejected");

// // @route PUT /api/leave/:id/cancel
// exports.cancelLeave = async (req, res, next) => {
//     try {
//         if (!mongoose.isValidObjectId(req.params.id)) {
//             return res.status(404).json({ message: "Leave request not found." });
//         }

//         const leave = await Leave.findById(req.params.id);
//         if (!leave) return res.status(404).json({ message: "Leave request not found." });

//         const owner = isOwner(req, leave);
//         const privileged = isPrivileged(req);
//         if (!owner && !privileged) {
//             return res.status(403).json({ message: "You can cancel only your own leave requests." });
//         }
//         if (["cancelled", "rejected"].includes(leave.status)) {
//             return res.status(400).json({ message: `This leave request is already ${leave.status}.` });
//         }
//         if (owner && !privileged && leave.status === "approved") {
//             const today = dayNumber(normalizeDay(ymdIST()));
//             if (dayNumber(leave.startDate) <= today) {
//                 return res.status(400).json({ message: "A leave that has already started cannot be cancelled. Please contact HR." });
//             }
//         }

//         leave.status = "cancelled";
//         await leave.save();

//         const [out] = await attachPeople([leave]);
//         return res.status(200).json(out);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/leave/balance/:employeeId?year=
// exports.getLeaveBalance = async (req, res, next) => {
//     try {
//         const target = req.params.employeeId;
//         const scope = await getScopeIds(req);
//         if (!mongoose.isValidObjectId(target) || !inScope(scope, target)) {
//             return res.status(403).json({ message: "You are not allowed to view this leave balance." });
//         }

//         const year = parseInt(req.query.year, 10) || Number(ymdIST().slice(0, 4));
//         return res.status(200).json(await buildBalance(await expandIds(target), year));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/leave/quota  (the dashboard card: total, used and remaining days of the logged-in user)
// exports.getMyLeaveQuota = async (req, res, next) => {
//     try {
//         const year = parseInt(req.query.year, 10) || Number(ymdIST().slice(0, 4));
//         const byType = await buildBalance(await expandIds(req.user._id), year);

//         const general = byType.filter((b) => DASHBOARD_TYPES.includes(b.leaveType));
//         const sum = (key) => general.reduce((total, b) => total + b[key], 0);

//         return res.status(200).json({
//             year,
//             allotted: sum("allotted"),
//             used: sum("used"),
//             pending: sum("pending"),
//             remaining: sum("remaining"),
//             byType,
//         });
//     } catch (err) {
//         next(err);
//     }
// };






// // const Leave = require("../models/Leave");

// // // Helper: Safely calculate days between dates
// // const calculateDays = (start, end) => {
// //     const startDate = new Date(start);
// //     const endDate = new Date(end);

// //     if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
// //         throw new Error("Invalid start or end date provided.");
// //     }

// //     const diffTime = endDate.getTime() - startDate.getTime();
// //     if (diffTime < 0) {
// //         throw new Error("End date start date se pehle nahi ho sakti.");
// //     }

// //     return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
// // };

// // // @route GET /api/leave
// // exports.getLeaves = async (req, res, next) => {
// //     try {
// //         const query = {};
// //         if (req.query.status) query.status = req.query.status.toLowerCase();
// //         if (req.query.employee) query.employee = req.query.employee;

// //         let leaves = [];
// //         try {
// //             // Try fetching with population
// //             leaves = await Leave.find(query)
// //                 .populate("employee", "name fullName username email employeeId department designation code")
// //                 .sort({ createdAt: -1 });
// //         } catch (popErr) {
// //             console.warn("Population warning, falling back to raw find:", popErr.message);
// //             // Fallback if population schema reference fails
// //             leaves = await Leave.find(query).sort({ createdAt: -1 });
// //         }

// //         return res.status(200).json({
// //             success: true,
// //             count: leaves.length,
// //             leaves: leaves,
// //             data: leaves
// //         });
// //     } catch (err) {
// //         console.error("GET /leave 500 Error:", err);
// //         return res.status(500).json({
// //             success: false,
// //             message: err.message || "Internal server error while fetching leaves."
// //         });
// //     }
// // };

// // // @route POST /api/leave/apply
// // exports.applyLeave = async (req, res, next) => {
// //     try {
// //         const { leaveType, startDate, endDate, reason } = req.body;

// //         const employee = req.user?.employee || req.user?._id || req.body.employee;

// //         if (!employee) {
// //             return res.status(400).json({ message: "Employee ID provide karna zaroori hai." });
// //         }

// //         if (!startDate || !endDate || !leaveType) {
// //             return res.status(400).json({ message: "Leave type, start date, aur end date required hain." });
// //         }

// //         const totalDays = calculateDays(startDate, endDate);

// //         const leave = await Leave.create({
// //             employee,
// //             leaveType,
// //             startDate,
// //             endDate,
// //             totalDays,
// //             reason,
// //             status: "pending",
// //         });

// //         const populatedLeave = await Leave.findById(leave._id)
// //             .populate("employee", "name fullName username employeeId department code");

// //         return res.status(201).json(populatedLeave);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route PUT /api/leave/:id/approve
// // exports.approveLeave = async (req, res, next) => {
// //     try {
// //         const approverId = req.user?.employee || req.user?._id || req.body.approvedBy;

// //         const leave = await Leave.findByIdAndUpdate(
// //             req.params.id,
// //             {
// //                 status: "approved",
// //                 approvedBy: approverId,
// //                 approvedOn: new Date(),
// //             },
// //             { new: true }
// //         )
// //             .populate("employee", "name fullName username employeeId department email code")
// //             .populate("approvedBy", "name fullName username");

// //         if (!leave) {
// //             return res.status(404).json({ message: "Leave request nahi mili." });
// //         }

// //         return res.status(200).json(leave);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route PUT /api/leave/:id/reject
// // exports.rejectLeave = async (req, res, next) => {
// //     try {
// //         const approverId = req.user?.employee || req.user?._id || req.body.approvedBy;
// //         const reason = req.body.rejectionReason?.trim() || "Rejected by administrator";

// //         const leave = await Leave.findByIdAndUpdate(
// //             req.params.id,
// //             {
// //                 status: "rejected",
// //                 approvedBy: approverId,
// //                 approvedOn: new Date(),
// //                 rejectionReason: reason,
// //             },
// //             { new: true }
// //         )
// //             .populate("employee", "name fullName username employeeId department email code")
// //             .populate("approvedBy", "name fullName username");

// //         if (!leave) {
// //             return res.status(404).json({ message: "Leave request nahi mili." });
// //         }

// //         return res.status(200).json(leave);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route PUT /api/leave/:id/cancel
// // exports.cancelLeave = async (req, res, next) => {
// //     try {
// //         const leave = await Leave.findByIdAndUpdate(
// //             req.params.id,
// //             { status: "cancelled" },
// //             { new: true }
// //         )
// //             .populate("employee", "name fullName username employeeId department code");

// //         if (!leave) {
// //             return res.status(404).json({ message: "Leave request nahi mili." });
// //         }

// //         return res.status(200).json(leave);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route GET /api/leave/balance/:employeeId
// // exports.getLeaveBalance = async (req, res, next) => {
// //     try {
// //         const { employeeId } = req.params;
// //         const year = parseInt(req.query.year) || new Date().getFullYear();

// //         const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
// //         const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

// //         const approvedLeaves = await Leave.find({
// //             employee: employeeId,
// //             status: "approved",
// //             startDate: { $gte: startOfYear, $lte: endOfYear }
// //         });

// //         const usedByType = {};
// //         approvedLeaves.forEach((l) => {
// //             usedByType[l.leaveType] = (usedByType[l.leaveType] || 0) + (l.totalDays || 0);
// //         });

// //         const allotted = {
// //             sick: 12,
// //             casual: 12,
// //             earned: 15,
// //             maternity: 180,
// //             paternity: 15,
// //             unpaid: 0,
// //         };

// //         const balance = Object.keys(allotted).map((type) => {
// //             const used = usedByType[type] || 0;
// //             const total = allotted[type];
// //             return {
// //                 leaveType: type,
// //                 allotted: total,
// //                 used,
// //                 remaining: total === 0 ? 0 : Math.max(0, total - used),
// //             };
// //         });

// //         return res.status(200).json(balance);
// //     } catch (err) {
// //         next(err);
// //     }
// // };