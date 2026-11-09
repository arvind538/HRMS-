const mongoose = require("mongoose");
const CompanyOffDay = require("../models/CompanyOffDay");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const { dayRangeIST, ymdIST } = require("../utils/accessScopeBase");
const { dowOf } = require("../utils/workCalendar");
const { notify } = require("../utils/notify");

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const clean = (v, n) => String(v ?? "").trim().slice(0, n);
const roleOf = (req) => String(req.user?.role || "").toLowerCase();
const me = (req) => String(req.user._id || req.user.id);
const realDay = (s) => DAY.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

async function tellAll(filter, payload, exclude) {
    try {
        const users = await User.find({ isActive: { $ne: false }, ...filter }).select("_id").lean();
        if (users.length) await notify(users.map((u) => u._id), { type: "general", link: "/attendance/off-days", exclude, ...payload });
    } catch { /* a failed notification never stops the work */ }
}

const shape = (o, req) => ({
    _id: o._id, date: o.date, name: o.name, reason: o.reason, status: o.status, decisionNote: o.decisionNote, decidedAt: o.decidedAt,
    requestedBy: o.requestedBy?.name ? { _id: o.requestedBy._id, name: o.requestedBy.name } : null,
    decidedBy: o.decidedBy?.name ? { _id: o.decidedBy._id, name: o.decidedBy.name } : null,
    mine: String(o.requestedBy?._id || o.requestedBy || "") === me(req),
});
const load = async (id, req) => shape(await CompanyOffDay.findById(id).populate("requestedBy decidedBy", "name").lean(), req);

// GET /attendance/off-days?year=   everyone sees the approved ones. Admin and HR also see pending and rejected.
exports.listOffDays = async (req, res, next) => {
    try {
        const year = Number(req.query.year) || Number(ymdIST(new Date()).slice(0, 4));
        const filter = { date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } };
        if (!["admin", "hr"].includes(roleOf(req))) filter.status = "approved";
        const rows = await CompanyOffDay.find(filter).sort({ date: 1 }).populate("requestedBy decidedBy", "name").lean();
        res.json({ success: true, data: rows.map((r) => shape(r, req)) });
    } catch (err) {
        next(err);
    }
};

// POST /attendance/off-days  { date, name, reason }   admin: approved at once. HR: waits for the admin.
exports.createOffDay = async (req, res, next) => {
    try {
        const date = clean(req.body?.date, 10);
        const name = clean(req.body?.name, 80);
        const reason = clean(req.body?.reason, 300);
        if (!realDay(date)) return bad(res, "Please select a valid date.");
        if (name.length < 2) return bad(res, "Please enter a name, for example Diwali or Office closed.");
        if (dowOf(date) === 0) return bad(res, "Sunday is already the weekly off.");
        const today = ymdIST(new Date());
        const oldest = new Date(`${today}T00:00:00Z`);
        oldest.setUTCDate(oldest.getUTCDate() - 30);
        if (date < oldest.toISOString().slice(0, 10)) return bad(res, "An off day older than 30 days cannot be added.");
        if (date > `${Number(today.slice(0, 4)) + 2}-12-31`) return bad(res, "This date is too far in the future.");

        const admin = roleOf(req) === "admin";
        const set = { name, reason, requestedBy: req.user._id, status: admin ? "approved" : "pending", decidedBy: admin ? req.user._id : undefined, decidedAt: admin ? new Date() : undefined, decisionNote: "" };

        let doc = await CompanyOffDay.findOne({ date });
        if (doc && doc.status !== "rejected") return bad(res, doc.status === "approved" ? "This day is already an off day." : "This day is already waiting for approval.", 409);
        if (doc) { doc.set(set); await doc.save(); } // a rejected day can be requested again
        else doc = await CompanyOffDay.create({ date, ...set });

        if (admin) await afterApproval(doc, req);
        else await tellAll({ role: "admin" }, { title: "Off day waiting for approval", message: `${req.user.name} asked for ${name} on ${date}.` }, req.user._id);

        res.status(201).json({ success: true, message: admin ? "Off day added. Everyone can see it now." : "Sent to the admin for approval.", data: await load(doc._id, req) });
    } catch (err) {
        if (err?.code === 11000) return bad(res, "This day already exists.", 409);
        next(err);
    }
};

/* an approved day must not keep automatic "absent" rows that the system saved earlier */
async function afterApproval(doc, req) {
    try {
        const { start, end } = dayRangeIST(doc.date);
        await Attendance.deleteMany({ date: { $gte: start, $lt: end }, source: "system", status: { $in: ["absent", "not-marked"] } });
    } catch { /* cleanup is optional */ }
    await tellAll({}, { title: "Off day announced", message: `${doc.name}: ${doc.date} is an off day for everyone.` }, req.user._id);
}

// PUT /attendance/off-days/:id/decision  { decision: "approved" | "rejected", note }   admin only
exports.decideOffDay = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return bad(res, "Not found.", 404);
        const doc = await CompanyOffDay.findById(req.params.id);
        if (!doc) return bad(res, "Not found.", 404);
        if (doc.status !== "pending") return bad(res, "This request is already decided.", 409);
        const decision = req.body?.decision;
        const note = clean(req.body?.note, 300);
        if (!["approved", "rejected"].includes(decision)) return bad(res, "Please choose approve or reject.");
        if (decision === "rejected" && note.length < 3) return bad(res, "Please write the reason for rejecting.");

        doc.set({ status: decision, decidedBy: req.user._id, decidedAt: new Date(), decisionNote: note });
        await doc.save();
        if (decision === "approved") await afterApproval(doc, req);
        else if (doc.requestedBy) await tellAll({ _id: doc.requestedBy }, { title: "Off day rejected", message: `${doc.name} (${doc.date}): ${note}` }, req.user._id);
        res.json({ success: true, data: await load(doc._id, req) });
    } catch (err) {
        next(err);
    }
};

// DELETE /attendance/off-days/:id   admin: any. HR: only own pending request.
exports.removeOffDay = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return bad(res, "Not found.", 404);
        const doc = await CompanyOffDay.findById(req.params.id);
        if (!doc) return bad(res, "Not found.", 404);
        const admin = roleOf(req) === "admin";
        if (!admin && !(doc.status === "pending" && String(doc.requestedBy) === me(req))) return bad(res, "You can withdraw only your own pending request.", 403);
        await doc.deleteOne();
        res.json({ success: true, message: "Removed." });
    } catch (err) {
        next(err);
    }
};