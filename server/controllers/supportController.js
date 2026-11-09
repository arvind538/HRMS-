const mongoose = require("mongoose");
const SupportTicket = require("../models/SupportTicket");
const TicketMessage = require("../models/TicketMessage");
const User = require("../models/User");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const { notify } = require("../utils/notify");

const { CATEGORIES, PRIORITIES, STATUSES, SLA_HOURS } = SupportTicket;

const DONE = ["Resolved", "Closed"];
const REOPEN_DAYS = 7;
const MAX_ACTIVE = 25;
const MAX_MESSAGES = 500;

/* ------------------------------- helpers ------------------------------- */

const idOf = (v) => String(v?._id || v || "");
const validId = (v) => mongoose.isValidObjectId(v);
const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const roleOf = (req) => String(req.user?.role || "").toLowerCase();
const isStaff = (req) => ["admin", "hr"].includes(roleOf(req));
const me = (req) => String(req.user._id || req.user.id);
const dueFrom = (from, priority) => new Date(new Date(from).getTime() + (SLA_HOURS[priority] || 24) * 3600000);
const linkOf = (id) => `/help/tickets?ticket=${id}`;

const makeNumber = () => {
    const d = new Date();
    return `TKT-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.floor(10000 + Math.random() * 90000)}`;
};

const pop = (q) =>
    q
        .populate({ path: "createdBy", select: "name email role employee", populate: { path: "employee", select: "employeeId designation department" } })
        .populate("assignedTo", "name email role");

async function nameMaps() {
    const [d, g] = await Promise.all([Department.find().select("name").lean(), Designation.find().select("title").lean()]);
    return { dept: new Map(d.map((x) => [String(x._id), x.name])), desig: new Map(g.map((x) => [String(x._id), x.title])) };
}
const labelOf = (map, v) => {
    if (!v) return "";
    if (typeof v === "object" && (v.name || v.title)) return v.name || v.title;
    const raw = idOf(v);
    return map.get(raw) || (validId(raw) ? "" : raw);
};

async function staffIds() {
    const users = await User.find({ role: { $in: ["admin", "hr"] }, isActive: { $ne: false } }).select("_id").lean();
    return users.map((u) => u._id);
}

/* a failed notification never stops the work */
async function tell(ids, title, message, id, exclude) {
    try {
        if (ids?.length) await notify(ids, { type: "general", title, message, link: linkOf(id), exclude });
    } catch {
        /* ignored */
    }
}

async function systemLine(ticketId, req, text) {
    await TicketMessage.create({ ticket: ticketId, sender: req.user._id, senderRole: roleOf(req), text, system: true });
    await SupportTicket.updateOne({ _id: ticketId }, { $inc: { messageCount: 1 }, $set: { lastMessageAt: new Date() } });
}

/* ------------------------------- shaping ------------------------------- */

function shape(t, req, m) {
    const o = t.toObject ? t.toObject() : t;
    const cb = o.createdBy && typeof o.createdBy === "object" ? o.createdBy : { _id: o.createdBy };
    const emp = cb.employee && typeof cb.employee === "object" ? cb.employee : {};
    const mine = idOf(cb) === me(req);
    const done = DONE.includes(o.status);
    const due = o.dueAt || dueFrom(o.createdAt, o.priority);
    const doneAt = o.closedAt || o.resolvedAt || o.updatedAt;

    return {
        _id: o._id,
        ticketNumber: o.ticketNumber,
        title: o.title,
        description: o.description,
        category: o.category,
        priority: o.priority,
        status: o.status,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        dueAt: due,
        firstResponseAt: o.firstResponseAt || null,
        resolvedAt: o.resolvedAt || null,
        closedAt: o.closedAt || null,
        resolutionNotes: o.resolutionNotes || "",
        rating: o.rating || null,
        ratingFeedback: o.ratingFeedback || "",
        messageCount: o.messageCount || 0,
        lastMessageAt: o.lastMessageAt || o.createdAt,
        lastMessagePreview: o.lastMessagePreview || "",
        isMine: mine,
        isOverdue: !done && new Date(due) < new Date(),
        canReopen: mine && done && Date.now() - new Date(doneAt).getTime() < REOPEN_DAYS * 86400000,
        requester: {
            _id: cb._id,
            name: cb.name || "User",
            email: cb.email || "",
            role: cb.role || "",
            employeeId: emp.employeeId || "",
            designation: labelOf(m.desig, emp.designation),
            department: labelOf(m.dept, emp.department),
        },
        assignedTo: o.assignedTo && o.assignedTo.name ? { _id: o.assignedTo._id, name: o.assignedTo.name, role: o.assignedTo.role } : null,
        unread: mine ? o.unreadForRequester || 0 : isStaff(req) ? o.unreadForStaff || 0 : 0,
    };
}

const full = async (id, req) => {
    const [t, m] = await Promise.all([pop(SupportTicket.findById(id)).lean(), nameMaps()]);
    return shape(t, req, m);
};

function shapeMsg(msg, req, creatorId) {
    const o = msg.toObject ? msg.toObject() : msg;
    const sid = idOf(o.sender);
    return {
        _id: o._id,
        text: o.text,
        internal: Boolean(o.internal),
        system: Boolean(o.system),
        createdAt: o.createdAt,
        sender: o.sender && o.sender.name ? { _id: sid, name: o.sender.name, role: o.sender.role } : null,
        side: o.system ? "system" : sid === creatorId ? "requester" : "staff",
        mine: !o.system && sid === me(req),
    };
}

/* the ticket, only if this person may open it */
async function load(req, res) {
    const t = await SupportTicket.findById(req.params.id);
    if (!t) {
        bad(res, "Ticket not found.", 404);
        return null;
    }
    if (!isStaff(req) && idOf(t.createdBy) !== me(req)) {
        bad(res, "You cannot open this ticket.", 403);
        return null;
    }
    return t;
}

/* ============================== TICKETS ============================== */

// GET /tickets?scope=all|mine&status=&category=&priority=&assigned=me|none|<userId>&q=
exports.getTickets = async (req, res, next) => {
    try {
        const q = req.query;
        const all = isStaff(req) && q.scope !== "mine";
        const filter = {};
        if (!all) filter.createdBy = me(req);
        if (STATUSES.includes(q.status)) filter.status = q.status;
        if (CATEGORIES.includes(q.category)) filter.category = q.category;
        if (PRIORITIES.includes(q.priority)) filter.priority = q.priority;
        if (all) {
            if (q.assigned === "me") filter.assignedTo = me(req);
            else if (q.assigned === "none") filter.assignedTo = null;
            else if (validId(q.assigned)) filter.assignedTo = q.assigned;
        }
        if (q.q) {
            const rx = new RegExp(esc(String(q.q).trim().slice(0, 60)), "i");
            const or = [{ title: rx }, { ticketNumber: rx }, { description: rx }];
            if (all) {
                const users = await User.find({ name: rx }).select("_id").limit(50).lean();
                if (users.length) or.push({ createdBy: { $in: users.map((u) => u._id) } });
            }
            filter.$or = or;
        }

        const [rows, m] = await Promise.all([pop(SupportTicket.find(filter).sort({ lastMessageAt: -1, createdAt: -1 }).limit(500)).lean(), nameMaps()]);
        res.json({ success: true, count: rows.length, tickets: rows.map((t) => shape(t, req, m)) });
    } catch (err) {
        next(err);
    }
};
exports.getMyTickets = exports.getTickets; // old name

// POST /tickets
exports.createTicket = async (req, res, next) => {
    try {
        const b = req.body || {};
        const title = clean(b.title, 120);
        const description = clean(b.description, 3000);
        if (title.length < 5) return bad(res, "Title must be 5 to 120 characters.");
        if (description.length < 10) return bad(res, "Please describe the problem in at least 10 characters.");
        if (!CATEGORIES.includes(b.category)) return bad(res, "Please select a valid category.");
        if (!PRIORITIES.includes(b.priority)) return bad(res, "Please select a valid priority.");

        const active = await SupportTicket.countDocuments({ createdBy: me(req), status: { $nin: DONE } });
        if (active >= MAX_ACTIVE) return bad(res, `You already have ${MAX_ACTIVE} active tickets. Please wait for them to be resolved.`, 429);

        let doc = null;
        for (let i = 0; i < 5 && !doc; i++) {
            try {
                doc = await SupportTicket.create({ ticketNumber: makeNumber(), title, description, category: b.category, priority: b.priority, createdBy: req.user._id, dueAt: dueFrom(new Date(), b.priority), unreadForStaff: 1, lastMessageAt: new Date() });
            } catch (err) {
                if (err?.code !== 11000) throw err; // a clash of ticket numbers: try another one
            }
        }
        if (!doc) return bad(res, "Could not create the ticket. Please try again.", 500);

        await tell(await staffIds(), "New support ticket", `${req.user.name} raised ${doc.ticketNumber}: ${doc.title}`, doc._id, req.user._id);
        res.status(201).json({ success: true, ticket: await full(doc._id, req) });
    } catch (err) {
        next(err);
    }
};

// GET /tickets/:id?after=<messageId>   (the chat asks again and again with "after" to get only the new messages)
exports.getTicket = async (req, res, next) => {
    try {
        const t = await load(req, res);
        if (!t) return;
        const mine = idOf(t.createdBy) === me(req);
        const seeNotes = isStaff(req) && !mine;

        const f = { ticket: t._id };
        if (validId(req.query.after)) f._id = { $gt: req.query.after };
        if (!seeNotes) f.internal = false;
        const msgs = await TicketMessage.find(f).sort({ _id: 1 }).limit(500).populate("sender", "name role").lean();

        const field = mine ? "unreadForRequester" : isStaff(req) ? "unreadForStaff" : null;
        if (field && (t[field] || 0) > 0) await SupportTicket.updateOne({ _id: t._id }, { $set: { [field]: 0 } });

        const ticket = await full(t._id, req);
        ticket.unread = 0;
        res.json({ success: true, ticket, messages: msgs.map((m) => shapeMsg(m, req, idOf(t.createdBy))) });
    } catch (err) {
        next(err);
    }
};

// POST /tickets/:id/messages  { text, internal? }
exports.postMessage = async (req, res, next) => {
    try {
        const t = await load(req, res);
        if (!t) return;
        const mine = idOf(t.createdBy) === me(req);
        const text = clean(req.body?.text, 2000);
        if (!text) return bad(res, "Please write a message.");
        if (t.status === "Closed") return bad(res, "This ticket is closed. Reopen it to continue.", 409);
        if (t.messageCount >= MAX_MESSAGES) return bad(res, "This ticket has too many messages. Please raise a new ticket.", 409);

        const internal = isStaff(req) && !mine && (req.body?.internal === true || req.body?.internal === "true");
        const msg = await TicketMessage.create({ ticket: t._id, sender: req.user._id, senderRole: roleOf(req), text, internal });

        const set = { lastMessageAt: new Date() };
        const inc = { messageCount: 1 };
        let reopened = false;
        if (!internal) set.lastMessagePreview = text.slice(0, 120);

        if (mine) {
            inc.unreadForStaff = 1;
            if (t.status === "Waiting for Employee") set.status = "In Progress";
            else if (t.status === "Resolved") {
                set.status = t.assignedTo ? "In Progress" : "Open";
                set.resolvedAt = null;
                reopened = true;
            }
        } else if (!internal) {
            inc.unreadForRequester = 1;
            if (!t.firstResponseAt) set.firstResponseAt = new Date();
            if (["Open", "Assigned"].includes(t.status)) set.status = "In Progress";
            if (!t.assignedTo) set.assignedTo = req.user._id;
        }
        await SupportTicket.updateOne({ _id: t._id }, { $set: set, $inc: inc });
        if (reopened) await systemLine(t._id, req, "Ticket reopened because the employee replied.");

        if (mine) await tell(t.assignedTo ? [t.assignedTo] : await staffIds(), `Reply on ${t.ticketNumber}`, `${req.user.name}: ${text.slice(0, 80)}`, t._id, req.user._id);
        else if (!internal) await tell([t.createdBy], `Reply on ${t.ticketNumber}`, `${req.user.name}: ${text.slice(0, 80)}`, t._id, req.user._id);

        const saved = await TicketMessage.findById(msg._id).populate("sender", "name role").lean();
        res.status(201).json({ success: true, message: shapeMsg(saved, req, idOf(t.createdBy)), ticket: await full(t._id, req) });
    } catch (err) {
        next(err);
    }
};

/* HR and Admin handle other people's tickets, not their own */
const manageGuard = (req, res, t) => {
    if (idOf(t.createdBy) === me(req)) {
        bad(res, "You raised this ticket, so another HR or Admin has to handle it.", 403);
        return false;
    }
    return true;
};

// PUT /tickets/:id/status  { status, resolutionNotes? }   (HR, Admin)
exports.setStatus = async (req, res, next) => {
    try {
        const t = await load(req, res);
        if (!t || !manageGuard(req, res, t)) return;
        const status = req.body?.status;
        if (!STATUSES.includes(status)) return bad(res, "Please select a valid status.");
        if (t.status === status) return bad(res, `The ticket is already ${status}.`, 409);

        const notes = clean(req.body?.resolutionNotes, 1000);
        if (status === "Resolved" && notes.length < 3 && !t.resolutionNotes) return bad(res, "Please write how the problem was solved.");

        const set = { status };
        if (notes) set.resolutionNotes = notes;
        if (status === "Resolved") {
            set.resolvedAt = new Date();
            if (!t.firstResponseAt) set.firstResponseAt = new Date();
        }
        if (status === "Closed") {
            set.closedAt = new Date();
            if (!t.resolvedAt) set.resolvedAt = new Date();
        }
        if (!DONE.includes(status)) {
            set.resolvedAt = null;
            set.closedAt = null;
        }
        if (["Assigned", "In Progress", "Waiting for Employee"].includes(status) && !t.assignedTo) set.assignedTo = req.user._id;

        await SupportTicket.updateOne({ _id: t._id }, { $set: set, $inc: { unreadForRequester: 1 } });
        await systemLine(t._id, req, `${req.user.name} changed the status to ${status}.`);
        await tell([t.createdBy], `${t.ticketNumber} is ${status}`, status === "Resolved" ? "Your ticket is resolved. Please check and rate the support." : `Status changed to ${status}.`, t._id, req.user._id);
        res.json({ success: true, ticket: await full(t._id, req) });
    } catch (err) {
        next(err);
    }
};

// PUT /tickets/:id/assign  { assignedTo: userId | null }   (HR, Admin)
exports.assignTicket = async (req, res, next) => {
    try {
        const t = await load(req, res);
        if (!t || !manageGuard(req, res, t)) return;
        if (DONE.includes(t.status)) return bad(res, "This ticket is already finished.", 409);

        const to = req.body?.assignedTo || null;
        let user = null;
        if (to) {
            if (!validId(to)) return bad(res, "Please select a valid person.");
            user = await User.findOne({ _id: to, role: { $in: ["admin", "hr"] }, isActive: { $ne: false } }).select("name").lean();
            if (!user) return bad(res, "Only an active HR or Admin user can be assigned.");
            if (String(to) === idOf(t.createdBy)) return bad(res, "A ticket cannot be assigned to the person who raised it.");
        }
        if (idOf(t.assignedTo) === String(to || "")) return bad(res, "No change.", 409);

        const set = { assignedTo: to };
        if (to && t.status === "Open") set.status = "Assigned";
        if (!to && t.status === "Assigned") set.status = "Open";
        await SupportTicket.updateOne({ _id: t._id }, { $set: set });
        await systemLine(t._id, req, user ? `${req.user.name} assigned this ticket to ${user.name}.` : `${req.user.name} removed the assignee.`);
        if (user && String(to) !== me(req)) await tell([to], "Ticket assigned to you", `${t.ticketNumber}: ${t.title}`, t._id, req.user._id);
        res.json({ success: true, ticket: await full(t._id, req) });
    } catch (err) {
        next(err);
    }
};

// PUT /tickets/:id  { priority?, category? }   (HR, Admin)
exports.updateTicket = async (req, res, next) => {
    try {
        const t = await load(req, res);
        if (!t || !manageGuard(req, res, t)) return;
        const b = req.body || {};
        const set = {};
        const notes = [];
        if (b.priority !== undefined && b.priority !== t.priority) {
            if (!PRIORITIES.includes(b.priority)) return bad(res, "Please select a valid priority.");
            set.priority = b.priority;
            set.dueAt = dueFrom(t.createdAt, b.priority);
            notes.push(`priority to ${b.priority}`);
        }
        if (b.category !== undefined && b.category !== t.category) {
            if (!CATEGORIES.includes(b.category)) return bad(res, "Please select a valid category.");
            set.category = b.category;
            notes.push(`category to ${b.category}`);
        }
        if (!notes.length) return bad(res, "Nothing to change.", 409);
        await SupportTicket.updateOne({ _id: t._id }, { $set: set });
        await systemLine(t._id, req, `${req.user.name} changed the ${notes.join(" and ")}.`);
        res.json({ success: true, ticket: await full(t._id, req) });
    } catch (err) {
        next(err);
    }
};

// PUT /tickets/:id/close   (the person who raised it)
exports.closeTicket = async (req, res, next) => {
    try {
        const t = await load(req, res);
        if (!t) return;
        if (idOf(t.createdBy) !== me(req)) return bad(res, "Only the person who raised the ticket can close it.", 403);
        if (t.status === "Closed") return bad(res, "This ticket is already closed.", 409);
        await SupportTicket.updateOne({ _id: t._id }, { $set: { status: "Closed", closedAt: new Date(), resolvedAt: t.resolvedAt || new Date() }, $inc: { unreadForStaff: t.assignedTo ? 1 : 0 } });
        await systemLine(t._id, req, `${req.user.name} closed this ticket.`);
        if (t.assignedTo) await tell([t.assignedTo], `${t.ticketNumber} was closed`, "The employee closed the ticket.", t._id, req.user._id);
        res.json({ success: true, ticket: await full(t._id, req) });
    } catch (err) {
        next(err);
    }
};

// PUT /tickets/:id/reopen  { text }   (the person who raised it, within 7 days)
exports.reopenTicket = async (req, res, next) => {
    try {
        const t = await load(req, res);
        if (!t) return;
        if (idOf(t.createdBy) !== me(req)) return bad(res, "Only the person who raised the ticket can reopen it.", 403);
        if (!DONE.includes(t.status)) return bad(res, "This ticket is still open.", 409);
        const doneAt = t.closedAt || t.resolvedAt || t.updatedAt;
        if (Date.now() - new Date(doneAt).getTime() > REOPEN_DAYS * 86400000) return bad(res, `A ticket can be reopened within ${REOPEN_DAYS} days. Please raise a new ticket.`, 409);

        const text = clean(req.body?.text, 2000);
        await SupportTicket.updateOne({ _id: t._id }, { $set: { status: t.assignedTo ? "In Progress" : "Open", resolvedAt: null, closedAt: null }, $inc: { unreadForStaff: 1 } });
        await systemLine(t._id, req, `${req.user.name} reopened this ticket.`);
        if (text) {
            await TicketMessage.create({ ticket: t._id, sender: req.user._id, senderRole: roleOf(req), text });
            await SupportTicket.updateOne({ _id: t._id }, { $inc: { messageCount: 1 }, $set: { lastMessageAt: new Date(), lastMessagePreview: text.slice(0, 120) } });
        }
        await tell(t.assignedTo ? [t.assignedTo] : await staffIds(), `${t.ticketNumber} was reopened`, text ? text.slice(0, 80) : "The employee reopened the ticket.", t._id, req.user._id);
        res.json({ success: true, ticket: await full(t._id, req) });
    } catch (err) {
        next(err);
    }
};

// POST /tickets/:id/rating  { rating, feedback }
exports.rateTicket = async (req, res, next) => {
    try {
        const t = await load(req, res);
        if (!t) return;
        if (idOf(t.createdBy) !== me(req)) return bad(res, "Only the person who raised the ticket can rate it.", 403);
        if (!DONE.includes(t.status)) return bad(res, "You can rate the support after the ticket is resolved.", 409);
        const rating = Number(req.body?.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad(res, "Rating must be from 1 to 5.");
        await SupportTicket.updateOne({ _id: t._id }, { $set: { rating, ratingFeedback: clean(req.body?.feedback, 300) } });
        res.json({ success: true, ticket: await full(t._id, req) });
    } catch (err) {
        next(err);
    }
};

// DELETE /tickets/:id   (Admin)
exports.deleteTicket = async (req, res, next) => {
    try {
        const t = await SupportTicket.findById(req.params.id);
        if (!t) return bad(res, "Ticket not found.", 404);
        await TicketMessage.deleteMany({ ticket: t._id });
        await t.deleteOne();
        res.json({ success: true, message: "Ticket deleted." });
    } catch (err) {
        next(err);
    }
};

/* ============================== SUMMARY AND CONTACTS ============================== */

// GET /summary?scope=all|mine
exports.getSummary = async (req, res, next) => {
    try {
        const all = isStaff(req) && req.query.scope !== "mine";
        const rows = await SupportTicket.find(all ? {} : { createdBy: me(req) })
            .select("status priority dueAt createdAt assignedTo firstResponseAt rating unreadForStaff unreadForRequester createdBy")
            .limit(5000)
            .lean();

        const now = new Date();
        const active = rows.filter((r) => !DONE.includes(r.status));
        const hours = rows.filter((r) => r.firstResponseAt).map((r) => (new Date(r.firstResponseAt) - new Date(r.createdAt)) / 3600000);
        const rated = rows.filter((r) => r.rating);
        const unread = rows.filter((r) => (all && idOf(r.createdBy) !== me(req) ? r.unreadForStaff > 0 : r.unreadForRequester > 0)).length;

        res.json({
            success: true,
            total: rows.length,
            active: active.length,
            open: rows.filter((r) => r.status === "Open").length,
            inProgress: rows.filter((r) => ["Assigned", "In Progress"].includes(r.status)).length,
            waiting: rows.filter((r) => r.status === "Waiting for Employee").length,
            resolved: rows.filter((r) => DONE.includes(r.status)).length,
            overdue: active.filter((r) => new Date(r.dueAt || dueFrom(r.createdAt, r.priority)) < now).length,
            unassigned: active.filter((r) => !r.assignedTo).length,
            assignedToMe: active.filter((r) => idOf(r.assignedTo) === me(req)).length,
            unread,
            avgRating: rated.length ? Number((rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1)) : 0,
            avgFirstResponseHours: hours.length ? Number((hours.reduce((s, h) => s + h, 0) / hours.length).toFixed(1)) : 0,
        });
    } catch (err) {
        next(err);
    }
};

// GET /contacts  (the HR and Admin people everybody may contact; also the list for "assign to")
exports.getContacts = async (req, res, next) => {
    try {
        const [users, m] = await Promise.all([
            User.find({ role: { $in: ["admin", "hr"] }, isActive: { $ne: false } })
                .select("name email role employee")
                .populate({ path: "employee", select: "employeeId designation department phone mobile" })
                .sort({ name: 1 })
                .lean(),
            nameMaps(),
        ]);
        res.json({
            success: true,
            contacts: users.map((u) => {
                const e = u.employee && typeof u.employee === "object" ? u.employee : {};
                return { _id: u._id, name: u.name, email: u.email, role: u.role, employeeId: e.employeeId || "", designation: labelOf(m.desig, e.designation), department: labelOf(m.dept, e.department), phone: e.phone || e.mobile || "" };
            }),
        });
    } catch (err) {
        next(err);
    }
};