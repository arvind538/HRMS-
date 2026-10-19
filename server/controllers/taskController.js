const mongoose = require("mongoose");
const Task = require("../models/Task");
const { roleOf, isPrivileged, getScopeIds, inScope, attachPeople, resolveUserId } = require("../utils/accessScope");
const { todayIST } = require("../utils/Shiftutils");

const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["pending", "in-progress", "submitted", "completed", "cancelled"];
// "submitted" can only be set through the submit endpoint, and "completed" by an assignee only through review
const SETTABLE_STATUSES = ["pending", "in-progress", "completed", "cancelled"];

const text = (v, max) => String(v ?? "").trim().slice(0, max);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isHttpUrl = (v) => /^https?:\/\/\S+$/i.test(v);

/* null = no due date, undefined = invalid date */
const parseDue = (v) => {
    if (!v) return null;
    const d = new Date(`${String(v).slice(0, 10)}T00:00:00.000+05:30`);
    return Number.isNaN(d.getTime()) ? undefined : d;
};

/* Loads the task from :id, or answers 404 and returns null */
async function findTask(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(404).json({ message: "Task not found." });
        return null;
    }
    const task = await Task.findById(req.params.id);
    if (!task) {
        res.status(404).json({ message: "Task not found." });
        return null;
    }
    return task;
}

const respond = async (res, task, code = 200) => {
    const [out] = await attachPeople([task], ["assignedTo", "assignedBy"]);
    res.status(code).json(out);
};

// @route GET /api/tasks?status=&priority=&assignedTo=&q=
exports.getTasks = async (req, res, next) => {
    try {
        const scope = await getScopeIds(req);
        const and = [];

        if (scope !== null) {
            and.push({ $or: [{ assignedTo: { $in: scope } }, { assignedBy: req.user._id }] });
        }

        const { status, priority, assignedTo, q } = req.query;
        if (status && STATUSES.includes(String(status))) and.push({ status: String(status) });
        if (priority && PRIORITIES.includes(String(priority))) and.push({ priority: String(priority) });
        if (q) and.push({ title: new RegExp(escapeRegex(q), "i") });
        if (assignedTo) {
            if (!mongoose.isValidObjectId(assignedTo) || !inScope(scope, assignedTo)) {
                return res.status(200).json({ success: true, count: 0, tasks: [], data: [] });
            }
            and.push({ assignedTo });
        }

        const found = await Task.find(and.length ? { $and: and } : {}).sort({ createdAt: -1 }).limit(500);
        const tasks = await attachPeople(found, ["assignedTo", "assignedBy"]);

        res.status(200).json({ success: true, count: tasks.length, tasks, data: tasks });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/tasks
exports.createTask = async (req, res, next) => {
    try {
        const canAssign = ["admin", "hr", "manager"].includes(roleOf(req));
        const title = text(req.body.title, 150);
        const priority = String(req.body.priority || "medium").toLowerCase();
        const due = parseDue(req.body.dueDate);

        if (title.length < 2) return res.status(400).json({ message: "Please enter a task title." });
        if (!PRIORITIES.includes(priority)) return res.status(400).json({ message: "Invalid priority." });
        if (due === undefined) return res.status(400).json({ message: "Invalid due date." });

        let assignee = String(req.user._id); // employees can create tasks only for themselves
        if (canAssign && req.body.assignedTo) {
            const resolved = await resolveUserId(req.body.assignedTo);
            if (!resolved) {
                return res.status(400).json({ message: "This employee does not have a login account yet, so a task cannot be assigned." });
            }
            const scope = await getScopeIds(req);
            if (!inScope(scope, resolved)) {
                return res.status(403).json({ message: "You can assign tasks only to your own team." });
            }
            assignee = resolved;
        }

        const task = await Task.create({
            title,
            description: text(req.body.description, 2000),
            assignedTo: assignee,
            assignedBy: req.user._id,
            priority,
            dueDate: due || undefined,
        });

        await respond(res, task, 201);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
    try {
        const task = await findTask(req, res);
        if (!task) return;

        const me = String(req.user._id);
        const isAssignee = String(task.assignedTo) === me;
        const isAssigner = String(task.assignedBy) === me;
        const privileged = isPrivileged(req);
        const reviewer = privileged || isAssigner;

        if (!privileged && !isAssignee && !isAssigner) {
            return res.status(403).json({ message: "You are not allowed to change this task." });
        }

        // The person who created the task (and admin / HR) can edit everything. The assignee can change the status.
        if (reviewer) {
            if (req.body.title !== undefined) {
                const title = text(req.body.title, 150);
                if (title.length < 2) return res.status(400).json({ message: "Please enter a task title." });
                task.title = title;
            }
            if (req.body.description !== undefined) task.description = text(req.body.description, 2000);
            if (req.body.priority !== undefined) {
                const priority = String(req.body.priority).toLowerCase();
                if (!PRIORITIES.includes(priority)) return res.status(400).json({ message: "Invalid priority." });
                task.priority = priority;
            }
            if (req.body.dueDate !== undefined) {
                const due = parseDue(req.body.dueDate);
                if (due === undefined) return res.status(400).json({ message: "Invalid due date." });
                task.dueDate = due || undefined;
            }
        }

        if (req.body.status !== undefined) {
            const status = String(req.body.status);
            if (!SETTABLE_STATUSES.includes(status)) {
                return res.status(400).json({ message: "Invalid status. Use Submit Work to send a task for review." });
            }
            if (!reviewer && status === "completed") {
                return res.status(400).json({ message: "Please use Submit Work, so your manager can review the task." });
            }
            if (!reviewer && task.status === "submitted") {
                return res.status(400).json({ message: "This task is waiting for review." });
            }
            task.status = status;
            task.completedAt = status === "completed" ? new Date() : undefined;
            if (status === "completed") task.progress = 100;
        }

        await task.save();
        await respond(res, task);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/tasks/:id/progress   body: { progress: 0-100, note }
// The assignee adds today's work update. Calling it again on the same day replaces today's entry.
exports.addProgress = async (req, res, next) => {
    try {
        const task = await findTask(req, res);
        if (!task) return;

        if (String(task.assignedTo) !== String(req.user._id)) {
            return res.status(403).json({ message: "Only the person this task is assigned to can add updates." });
        }
        if (["completed", "cancelled"].includes(task.status)) {
            return res.status(400).json({ message: `This task is already ${task.status}.` });
        }
        if (task.status === "submitted") {
            return res.status(400).json({ message: "This task is waiting for review. You can update it after the review." });
        }

        const progress = Number(req.body.progress);
        if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
            return res.status(400).json({ message: "Progress must be a whole number between 0 and 100." });
        }
        const note = text(req.body.note, 500);
        if (note.length < 3) return res.status(400).json({ message: "Please write what you worked on today." });

        const date = todayIST();
        const entry = { date, progress, note, createdAt: new Date() };
        const index = task.updates.findIndex((u) => u.date === date);
        if (index >= 0) task.updates.set(index, entry);
        else task.updates.push(entry);
        if (task.updates.length > 120) task.updates = task.updates.slice(-120);

        task.progress = progress;
        if (task.status === "pending") task.status = "in-progress";

        await task.save();
        await respond(res, task);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/tasks/:id/submit   body: { note, link? }
// The assignee sends the work for review, even if only part of it is done.
exports.submitTask = async (req, res, next) => {
    try {
        const task = await findTask(req, res);
        if (!task) return;

        const me = String(req.user._id);
        if (String(task.assignedTo) !== me) {
            return res.status(403).json({ message: "Only the person this task is assigned to can submit it." });
        }
        if (["completed", "cancelled"].includes(task.status)) {
            return res.status(400).json({ message: `This task is already ${task.status}.` });
        }
        if (task.status === "submitted") {
            return res.status(400).json({ message: "This task is already waiting for review." });
        }

        const note = text(req.body.note, 1000);
        if (note.length < 3) return res.status(400).json({ message: "Please write a short note about the work you did." });

        const link = text(req.body.link, 500);
        if (link && !isHttpUrl(link)) {
            return res.status(400).json({ message: "The link must start with http:// or https://" });
        }

        task.submission = { note, link, submittedAt: new Date() };
        task.set("review", undefined); // clear the old rework comment

        if (String(task.assignedBy) === me) {
            // A task a person created for themselves has nobody else to review it
            task.status = "completed";
            task.completedAt = new Date();
            task.progress = 100;
        } else {
            task.status = "submitted";
        }

        await task.save();
        await respond(res, task);
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/tasks/:id/review   body: { action: "approve" | "rework", comment }
// Only the person who assigned the task, or admin / HR.
exports.reviewTask = async (req, res, next) => {
    try {
        const task = await findTask(req, res);
        if (!task) return;

        if (!isPrivileged(req) && String(task.assignedBy) !== String(req.user._id)) {
            return res.status(403).json({ message: "Only the person who assigned this task, or an admin, can review it." });
        }
        if (task.status !== "submitted") {
            return res.status(400).json({ message: "This task has not been submitted for review." });
        }

        const action = String(req.body.action || "");
        const comment = text(req.body.comment, 500);

        if (action === "approve") {
            task.status = "completed";
            task.completedAt = new Date();
            task.progress = 100;
        } else if (action === "rework") {
            if (comment.length < 3) return res.status(400).json({ message: "Please write what needs to be fixed." });
            task.status = "in-progress";
            task.completedAt = undefined;
        } else {
            return res.status(400).json({ message: "Action must be approve or rework." });
        }

        task.review = { comment, reviewedAt: new Date(), reviewedBy: req.user._id };

        await task.save();
        await respond(res, task);
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
    try {
        const task = await findTask(req, res);
        if (!task) return;

        if (!isPrivileged(req) && String(task.assignedBy) !== String(req.user._id)) {
            return res.status(403).json({ message: "Only the person who created the task, or an admin, can delete it." });
        }

        await task.deleteOne();
        res.status(200).json({ success: true, message: "Task deleted successfully." });
    } catch (err) {
        next(err);
    }
};










// const mongoose = require("mongoose");
// const Task = require("../models/Task");
// const { roleOf, isPrivileged, getScopeIds, inScope, attachPeople, resolveUserId } = require("../utils/accessScope");

// const PRIORITIES = ["low", "medium", "high", "urgent"];
// const STATUSES = ["pending", "in-progress", "completed", "cancelled"];

// const text = (v, max) => String(v ?? "").trim().slice(0, max);
// const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// /* null = no due date, undefined = invalid date */
// const parseDue = (v) => {
//     if (!v) return null;
//     const d = new Date(`${String(v).slice(0, 10)}T00:00:00.000+05:30`);
//     return Number.isNaN(d.getTime()) ? undefined : d;
// };

// // @route GET /api/tasks?status=&priority=&assignedTo=&q=
// exports.getTasks = async (req, res, next) => {
//     try {
//         const scope = await getScopeIds(req);
//         const and = [];

//         if (scope !== null) {
//             and.push({ $or: [{ assignedTo: { $in: scope } }, { assignedBy: req.user._id }] });
//         }

//         const { status, priority, assignedTo, q } = req.query;
//         if (status && STATUSES.includes(String(status))) and.push({ status: String(status) });
//         if (priority && PRIORITIES.includes(String(priority))) and.push({ priority: String(priority) });
//         if (q) and.push({ title: new RegExp(escapeRegex(q), "i") });
//         if (assignedTo) {
//             if (!mongoose.isValidObjectId(assignedTo) || !inScope(scope, assignedTo)) {
//                 return res.status(200).json({ success: true, count: 0, tasks: [], data: [] });
//             }
//             and.push({ assignedTo });
//         }

//         const found = await Task.find(and.length ? { $and: and } : {}).sort({ createdAt: -1 }).limit(500);
//         const tasks = await attachPeople(found, ["assignedTo", "assignedBy"]);

//         res.status(200).json({ success: true, count: tasks.length, tasks, data: tasks });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/tasks
// exports.createTask = async (req, res, next) => {
//     try {
//         const canAssign = ["admin", "hr", "manager"].includes(roleOf(req));
//         const title = text(req.body.title, 150);
//         const priority = String(req.body.priority || "medium").toLowerCase();
//         const due = parseDue(req.body.dueDate);

//         if (title.length < 2) return res.status(400).json({ message: "Please enter a task title." });
//         if (!PRIORITIES.includes(priority)) return res.status(400).json({ message: "Invalid priority." });
//         if (due === undefined) return res.status(400).json({ message: "Invalid due date." });

//         let assignee = String(req.user._id); // employees can create tasks only for themselves
//         if (canAssign && req.body.assignedTo) {
//             const resolved = await resolveUserId(req.body.assignedTo);
//             if (!resolved) {
//                 return res.status(400).json({ message: "This employee does not have a login account yet, so a task cannot be assigned." });
//             }
//             const scope = await getScopeIds(req);
//             if (!inScope(scope, resolved)) {
//                 return res.status(403).json({ message: "You can assign tasks only to your own team." });
//             }
//             assignee = resolved;
//         }

//         const task = await Task.create({
//             title,
//             description: text(req.body.description, 2000),
//             assignedTo: assignee,
//             assignedBy: req.user._id,
//             priority,
//             dueDate: due || undefined,
//         });

//         const [out] = await attachPeople([task], ["assignedTo", "assignedBy"]);
//         res.status(201).json(out);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/tasks/:id
// exports.updateTask = async (req, res, next) => {
//     try {
//         if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Task not found." });

//         const task = await Task.findById(req.params.id);
//         if (!task) return res.status(404).json({ message: "Task not found." });

//         const me = String(req.user._id);
//         const isAssignee = String(task.assignedTo) === me;
//         const isAssigner = String(task.assignedBy) === me;
//         const privileged = isPrivileged(req);

//         if (!privileged && !isAssignee && !isAssigner) {
//             return res.status(403).json({ message: "You are not allowed to change this task." });
//         }

//         // The person who created the task (and admin / HR) can edit everything. The assignee can change the status.
//         if (privileged || isAssigner) {
//             if (req.body.title !== undefined) {
//                 const title = text(req.body.title, 150);
//                 if (title.length < 2) return res.status(400).json({ message: "Please enter a task title." });
//                 task.title = title;
//             }
//             if (req.body.description !== undefined) task.description = text(req.body.description, 2000);
//             if (req.body.priority !== undefined) {
//                 const priority = String(req.body.priority).toLowerCase();
//                 if (!PRIORITIES.includes(priority)) return res.status(400).json({ message: "Invalid priority." });
//                 task.priority = priority;
//             }
//             if (req.body.dueDate !== undefined) {
//                 const due = parseDue(req.body.dueDate);
//                 if (due === undefined) return res.status(400).json({ message: "Invalid due date." });
//                 task.dueDate = due || undefined;
//             }
//         }

//         if (req.body.status !== undefined) {
//             const status = String(req.body.status);
//             if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status." });
//             task.status = status;
//             task.completedAt = status === "completed" ? new Date() : undefined;
//         }

//         await task.save();
//         const [out] = await attachPeople([task], ["assignedTo", "assignedBy"]);
//         res.status(200).json(out);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route DELETE /api/tasks/:id
// exports.deleteTask = async (req, res, next) => {
//     try {
//         if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Task not found." });

//         const task = await Task.findById(req.params.id);
//         if (!task) return res.status(404).json({ message: "Task not found." });

//         if (!isPrivileged(req) && String(task.assignedBy) !== String(req.user._id)) {
//             return res.status(403).json({ message: "Only the person who created the task, or an admin, can delete it." });
//         }

//         await task.deleteOne();
//         res.status(200).json({ success: true, message: "Task deleted successfully." });
//     } catch (err) {
//         next(err);
//     }
// };