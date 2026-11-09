const mongoose = require("mongoose");
const JobPosition = require("../models/JobPosition");
const Candidate = require("../models/Candidate");
const CandidateResume = require("../models/CandidateResume");
const Interview = require("../models/Interview");
const Offer = require("../models/Offer");
const Employee = require("../models/Employee");
const Document = require("../models/Document");
const User = require("../models/User");
const { notify, userIdOfEmployee } = require("../utils/notify");
const { checkFile } = require("../utils/documentFiles");

/* ------------------------------- constants ------------------------------- */

const POSITION_STATUS = ["open", "closed", "on-hold"];
const EMP_TYPES = ["full-time", "part-time", "internship", "contract"];
const SOURCES = ["referral", "job-portal", "linkedin", "walk-in", "other"];
const STAGES = ["applied", "shortlisted", "interview-scheduled", "interviewed", "offered", "hired", "rejected"];
const ROUNDS = ["screening", "technical", "hr", "final"];
const MODES = ["in-person", "video", "phone"];
const IV_STATUS = ["scheduled", "completed", "cancelled", "no-show"];
const RECO = ["hire", "reject", "next-round"];
const OFFER_STATUS = ["draft", "sent", "accepted", "declined", "withdrawn"];
const LOCKED = ["offered", "hired"]; // these two are set only by offers
const RESUME_EXT = [".pdf", ".doc", ".docx"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------- helpers ------------------------------- */

const idOf = (v) => String(v?._id || v || "");
const validId = (v) => mongoose.isValidObjectId(v);
const bad = (res, message, status = 400) => res.status(status).json({ message });
const clean = (v, max) => String(v ?? "").trim().slice(0, max);
const bool = (v) => v === true || v === "true";
const toDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};
const roleOf = (req) => String(req.user?.role || "").toLowerCase();
const isStaff = (req) => ["admin", "hr"].includes(roleOf(req));
const isHiringTeam = (req) => ["admin", "hr", "manager"].includes(roleOf(req));
const skillsOf = (v) =>
    (Array.isArray(v) ? v : String(v || "").split(","))
        .map((s) => String(s).trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 30);
const isLive = (p) => p.status === "open" && p.isPublished && (!p.lastDate || new Date(p.lastDate) >= startOfToday());
const isHttp = (u) => /^https?:\/\/\S+$/i.test(String(u || ""));

const setStatus = (id, status, by, note = "") =>
    Candidate.findByIdAndUpdate(id, { status, $push: { statusHistory: { status, by: by || undefined, note: clean(note, 200), at: new Date() } } });

async function tellHr(title, message, link) {
    try {
        const users = await User.find({ role: { $in: ["admin", "hr"] }, isActive: { $ne: false } }).select("_id").lean();
        if (users.length) await notify(users.map((u) => u._id), { type: "general", title, message, link });
    } catch {
        /* a failed notification never stops the work */
    }
}

/* ============================== JOB POSITIONS ============================== */

function readPosition(b, current) {
    const out = {};
    const title = b.title !== undefined ? clean(b.title, 120) : current?.title || "";
    if (title.length < 2) return { error: "Job title must be at least 2 characters." };
    out.title = title;

    if (b.department !== undefined) {
        const d = String(b.department || "").trim();
        if (d && !validId(d)) return { error: "Please select a valid department." };
        out.department = d || null;
    }
    if (b.description !== undefined) out.description = clean(b.description, 4000);
    if (b.requiredSkills !== undefined) out.requiredSkills = skillsOf(b.requiredSkills);
    if (b.experienceRequired !== undefined) out.experienceRequired = clean(b.experienceRequired, 60);
    if (b.location !== undefined) out.location = clean(b.location, 120);
    if (b.salaryRange !== undefined) out.salaryRange = clean(b.salaryRange, 60);
    if (b.numberOfOpenings !== undefined) {
        const n = Number(b.numberOfOpenings);
        if (!Number.isInteger(n) || n < 1 || n > 500) return { error: "Openings must be a whole number from 1 to 500." };
        out.numberOfOpenings = n;
    }
    if (b.employmentType !== undefined) {
        if (!EMP_TYPES.includes(b.employmentType)) return { error: "Please select a valid job type." };
        out.employmentType = b.employmentType;
    }
    if (b.status !== undefined) {
        if (!POSITION_STATUS.includes(b.status)) return { error: "Please select a valid status." };
        out.status = b.status;
    }
    if (b.lastDate !== undefined) {
        if (b.lastDate === "" || b.lastDate === null) out.lastDate = null;
        else {
            const d = toDate(b.lastDate);
            if (!d) return { error: "Please enter a valid last date." };
            out.lastDate = d;
        }
    }
    if (b.isPublished !== undefined) out.isPublished = bool(b.isPublished);
    return { data: out };
}

// GET /positions  (staff see all; others only live job posts)
exports.getPositions = async (req, res, next) => {
    try {
        const staff = isHiringTeam(req);
        const filter = {};
        if (staff && POSITION_STATUS.includes(req.query.status)) filter.status = req.query.status;
        if (!staff) Object.assign(filter, { status: "open", isPublished: true });

        let rows = await JobPosition.find(filter).populate("department", "name").sort({ createdAt: -1 }).limit(500).lean();
        if (!staff) rows = rows.filter(isLive);

        if (staff && rows.length) {
            const agg = await Candidate.aggregate([
                { $match: { jobPosition: { $in: rows.map((r) => r._id) } } },
                { $group: { _id: "$jobPosition", total: { $sum: 1 }, hired: { $sum: { $cond: [{ $eq: ["$status", "hired"] }, 1, 0] } } } },
            ]);
            const map = new Map(agg.map((a) => [String(a._id), a]));
            rows.forEach((r) => {
                const a = map.get(String(r._id));
                r.candidateCount = a?.total || 0;
                r.hiredCount = a?.hired || 0;
            });
        }
        rows.forEach((r) => (r.isLive = isLive(r)));
        res.json(rows);
    } catch (err) {
        next(err);
    }
};

exports.createPosition = async (req, res, next) => {
    try {
        const input = readPosition(req.body || {}, null);
        if (input.error) return bad(res, input.error);
        const doc = await JobPosition.create({ ...input.data, createdBy: req.user._id, postedOn: input.data.isPublished ? new Date() : undefined });
        res.status(201).json(await JobPosition.findById(doc._id).populate("department", "name"));
    } catch (err) {
        next(err);
    }
};

exports.updatePosition = async (req, res, next) => {
    try {
        const doc = await JobPosition.findById(req.params.id);
        if (!doc) return bad(res, "Job position not found.", 404);
        const input = readPosition(req.body || {}, doc);
        if (input.error) return bad(res, input.error);
        doc.set(input.data);
        if (input.data.isPublished && !doc.postedOn) doc.postedOn = new Date();
        await doc.save();
        res.json(await JobPosition.findById(doc._id).populate("department", "name"));
    } catch (err) {
        next(err);
    }
};

exports.deletePosition = async (req, res, next) => {
    try {
        const doc = await JobPosition.findById(req.params.id);
        if (!doc) return bad(res, "Job position not found.", 404);
        if (await Candidate.exists({ jobPosition: doc._id })) return bad(res, "This position has candidates. Close it instead of deleting it.", 409);
        await doc.deleteOne();
        res.json({ message: "Job position deleted." });
    } catch (err) {
        next(err);
    }
};

/* ============================== CANDIDATES ============================== */

async function readCandidate(b, current) {
    const out = {};
    const name = b.name !== undefined ? clean(b.name, 80) : current?.name || "";
    if (name.length < 2) return { error: "Candidate name must be at least 2 characters." };
    out.name = name;

    const email = (b.email !== undefined ? clean(b.email, 120) : current?.email || "").toLowerCase();
    if (!EMAIL.test(email)) return { error: "Please enter a valid email address." };
    out.email = email;

    if (b.phone !== undefined) {
        const p = clean(b.phone, 20);
        if (p && !/^[+\d][\d\s-]{6,18}$/.test(p)) return { error: "Please enter a valid phone number." };
        out.phone = p;
    }

    const jp = String(b.jobPosition !== undefined ? b.jobPosition : idOf(current?.jobPosition)).trim();
    if (!validId(jp)) return { error: "Please select the job position." };
    if (!(await JobPosition.exists({ _id: jp }))) return { error: "Job position not found." };
    out.jobPosition = jp;

    if (b.experience !== undefined) out.experience = clean(b.experience, 60);
    if (b.currentCompany !== undefined) out.currentCompany = clean(b.currentCompany, 80);
    if (b.expectedCtc !== undefined) out.expectedCtc = clean(b.expectedCtc, 40);
    if (b.noticePeriod !== undefined) out.noticePeriod = clean(b.noticePeriod, 40);
    if (b.notes !== undefined) out.notes = clean(b.notes, 1000);
    if (b.source !== undefined) {
        if (!SOURCES.includes(b.source)) return { error: "Please select a valid source." };
        out.source = b.source;
    }
    if (b.resumeUrl !== undefined) {
        const u = clean(b.resumeUrl, 500);
        if (u && !isHttp(u)) return { error: "The resume link must start with http:// or https://." };
        out.resumeUrl = u;
    }

    const dup = await Candidate.exists({
        email: new RegExp(`^${escapeRegex(email)}$`, "i"),
        jobPosition: jp,
        ...(current ? { _id: { $ne: current._id } } : {}),
    });
    if (dup) return { error: "This candidate has already applied for this position.", code: 409 };
    return { data: out };
}

function checkResume(file) {
    if (!file) return {};
    const c = checkFile(file);
    if (c.error) return { error: c.error };
    if (!RESUME_EXT.includes(c.ext)) return { error: "The resume must be a PDF, DOC or DOCX file." };
    return { checked: c };
}

async function storeResume(candidate, file, checked) {
    const stored = await CandidateResume.create({ candidate: candidate._id, data: file.buffer, contentType: checked.mime });
    const old = candidate.resumeFile;
    candidate.set({ resumeFile: stored._id, resumeName: checked.name, resumeSize: file.size });
    await candidate.save();
    if (old) await CandidateResume.deleteOne({ _id: old }).catch(() => { });
}

/* shared by HR (add candidate) and the public apply form */
async function makeCandidate(body, file, by) {
    const input = await readCandidate(body, null);
    if (input.error) return input;
    const r = checkResume(file);
    if (r.error) return { error: r.error };

    const candidate = await Candidate.create({
        ...input.data,
        createdBy: by || undefined,
        statusHistory: [{ status: "applied", by: by || undefined, at: new Date(), note: "Application received" }],
    });
    if (r.checked) {
        try {
            await storeResume(candidate, file, r.checked);
        } catch (err) {
            await CandidateResume.deleteMany({ candidate: candidate._id }).catch(() => { });
            await Candidate.deleteOne({ _id: candidate._id }).catch(() => { });
            throw err;
        }
    }
    return { candidate };
}

const shapeCandidate = (c) => {
    const o = c.toObject ? c.toObject() : c;
    const { resumeFile, ...rest } = o;
    return { ...rest, hasResume: Boolean(resumeFile) };
};
const withPosition = (q) => q.populate("jobPosition", "title status");

// GET /candidates?status=&jobPosition=&source=&q=
exports.getCandidates = async (req, res, next) => {
    try {
        const { status, jobPosition, source, q } = req.query;
        const filter = {};
        if (status && STAGES.includes(status)) filter.status = status;
        if (jobPosition && validId(jobPosition)) filter.jobPosition = jobPosition;
        if (source && SOURCES.includes(source)) filter.source = source;
        if (q) {
            const rx = new RegExp(escapeRegex(String(q).trim().slice(0, 60)), "i");
            filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
        }
        const rows = await withPosition(Candidate.find(filter).sort({ createdAt: -1 }).limit(1000));
        res.json(rows.map(shapeCandidate));
    } catch (err) {
        next(err);
    }
};

exports.getCandidate = async (req, res, next) => {
    try {
        const c = await withPosition(Candidate.findById(req.params.id)).populate("statusHistory.by", "name");
        if (!c) return bad(res, "Candidate not found.", 404);
        res.json(shapeCandidate(c));
    } catch (err) {
        next(err);
    }
};

// POST /candidates  (multipart: optional file)
exports.createCandidate = async (req, res, next) => {
    try {
        const r = await makeCandidate(req.body || {}, req.file, req.user._id);
        if (r.error) return bad(res, r.error, r.code || 400);
        res.status(201).json(shapeCandidate(await withPosition(Candidate.findById(r.candidate._id))));
    } catch (err) {
        next(err);
    }
};

// PUT /candidates/:id  (details and/or a new resume)
exports.updateCandidate = async (req, res, next) => {
    try {
        const c = await Candidate.findById(req.params.id);
        if (!c) return bad(res, "Candidate not found.", 404);
        const input = await readCandidate(req.body || {}, c);
        if (input.error) return bad(res, input.error, input.code || 400);
        const r = checkResume(req.file);
        if (r.error) return bad(res, r.error);

        c.set(input.data);
        await c.save();
        if (r.checked) await storeResume(c, req.file, r.checked);
        res.json(shapeCandidate(await withPosition(Candidate.findById(c._id))));
    } catch (err) {
        next(err);
    }
};

// PUT /candidates/:id/status  { status, note }
exports.updateCandidateStatus = async (req, res, next) => {
    try {
        const { status, note } = req.body || {};
        if (!STAGES.includes(status)) return bad(res, "Please select a valid stage.");
        const c = await Candidate.findById(req.params.id);
        if (!c) return bad(res, "Candidate not found.", 404);
        if (c.status === "hired") return bad(res, "This candidate is already hired.", 409);
        if (LOCKED.includes(status)) return bad(res, "Create an offer to move a candidate to Offered or Hired.", 400);
        if (c.status === "offered") return bad(res, "This candidate has an offer. Update the offer status first.", 409);
        if (status === "interview-scheduled") return bad(res, "Schedule an interview to move a candidate to this stage.", 400);
        if (status === "rejected" && !clean(note, 200)) return bad(res, "Please add a short reason for the rejection.");

        await setStatus(c._id, status, req.user._id, note);
        res.json(shapeCandidate(await withPosition(Candidate.findById(c._id))));
    } catch (err) {
        next(err);
    }
};

// GET /candidates/:id/resume?download=1
exports.getResume = async (req, res, next) => {
    try {
        const c = await Candidate.findById(req.params.id).select("resumeFile resumeName resumeUrl");
        if (!c) return bad(res, "Candidate not found.", 404);
        if (!c.resumeFile) return bad(res, c.resumeUrl ? "This candidate has a resume link, not an uploaded file." : "No resume was uploaded.", 404);
        const stored = await CandidateResume.findById(c.resumeFile);
        if (!stored) return bad(res, "The resume file is missing.", 404);
        res.setHeader("Content-Type", stored.contentType);
        res.setHeader("Content-Length", stored.data.length);
        res.setHeader("Content-Disposition", `${req.query.download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(c.resumeName || "resume")}`);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, no-store");
        res.send(stored.data);
    } catch (err) {
        next(err);
    }
};

exports.deleteCandidate = async (req, res, next) => {
    try {
        const c = await Candidate.findById(req.params.id);
        if (!c) return bad(res, "Candidate not found.", 404);
        if (c.status === "hired") return bad(res, "A hired candidate cannot be deleted.", 409);
        await Promise.all([
            Interview.deleteMany({ candidate: c._id }),
            Offer.deleteMany({ candidate: c._id }),
            CandidateResume.deleteMany({ candidate: c._id }),
        ]);
        await c.deleteOne();
        res.json({ message: "Candidate deleted." });
    } catch (err) {
        next(err);
    }
};

// GET /pipeline?jobPosition=
exports.getPipeline = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.jobPosition && validId(req.query.jobPosition)) filter.jobPosition = req.query.jobPosition;
        const rows = await withPosition(Candidate.find(filter).sort({ updatedAt: -1 }).limit(2000));
        const pipeline = Object.fromEntries(STAGES.map((s) => [s, []]));
        rows.forEach((c) => pipeline[c.status]?.push(shapeCandidate(c)));
        res.json(pipeline);
    } catch (err) {
        next(err);
    }
};

/* ============================== INTERVIEWS ============================== */

const canTouch = (req, iv) => isStaff(req) || roleOf(req) === "manager" || (req.user?.employee && idOf(iv.interviewer) === idOf(req.user.employee));
const canGiveFeedback = (req, iv) => isStaff(req) || (req.user?.employee && idOf(iv.interviewer) === idOf(req.user.employee));

const withIv = (q) =>
    q
        .populate({ path: "candidate", select: "name email phone status jobPosition", populate: { path: "jobPosition", select: "title" } })
        .populate("interviewer", "name employeeId")
        .populate("scheduledBy", "name");

/* when an interview is cancelled or removed, put the candidate back in the right stage */
async function syncAfterInterview(candidateId, by) {
    const c = await Candidate.findById(candidateId).select("status");
    if (!c || c.status !== "interview-scheduled") return;
    if (await Interview.exists({ candidate: candidateId, status: "scheduled" })) return;
    const done = await Interview.exists({ candidate: candidateId, status: "completed" });
    await setStatus(candidateId, done ? "interviewed" : "shortlisted", by, "Interview cancelled");
}

async function hasClash(interviewer, start, mins, exceptId) {
    if (!interviewer) return false;
    const end = new Date(start.getTime() + mins * 60000);
    const near = await Interview.find({
        interviewer,
        status: "scheduled",
        scheduledAt: { $gte: new Date(start.getTime() - 8 * 3600000), $lte: end },
        ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    }).select("scheduledAt durationMins");
    return near.some((o) => o.scheduledAt < end && new Date(o.scheduledAt.getTime() + (o.durationMins || 45) * 60000) > start);
}

async function readInterview(b, current) {
    const out = {};
    if (!current) {
        const cid = String(b.candidate || "");
        if (!validId(cid)) return { error: "Please select the candidate." };
        const cand = await Candidate.findById(cid).select("status");
        if (!cand) return { error: "Candidate not found." };
        if (["hired", "rejected", "offered"].includes(cand.status)) return { error: `A ${cand.status} candidate cannot be interviewed.` };
        out.candidate = cid;
    }

    if (b.interviewer !== undefined) {
        const e = String(b.interviewer || "").trim();
        if (e) {
            if (!validId(e)) return { error: "Please select a valid interviewer." };
            if (!(await Employee.exists({ _id: e }))) return { error: "Interviewer not found." };
        }
        out.interviewer = e || null;
    }
    if (b.round !== undefined) {
        if (!ROUNDS.includes(b.round)) return { error: "Please select a valid round." };
        out.round = b.round;
    }
    if (b.mode !== undefined) {
        if (!MODES.includes(b.mode)) return { error: "Please select a valid mode." };
        out.mode = b.mode;
    }
    if (b.durationMins !== undefined) {
        const n = Number(b.durationMins);
        if (!Number.isInteger(n) || n < 15 || n > 480) return { error: "Duration must be between 15 and 480 minutes." };
        out.durationMins = n;
    }
    if (b.meetingLink !== undefined) {
        const l = clean(b.meetingLink, 500);
        if (l && !isHttp(l)) return { error: "The meeting link must start with http:// or https://." };
        out.meetingLink = l;
    }
    if (b.location !== undefined) out.location = clean(b.location, 200);
    if (b.notes !== undefined) out.notes = clean(b.notes, 1000);
    if (b.status !== undefined) {
        if (!IV_STATUS.includes(b.status)) return { error: "Please select a valid status." };
        out.status = b.status;
    }
    if (b.scheduledAt !== undefined || !current) {
        const d = toDate(b.scheduledAt);
        if (!d) return { error: "Please select the interview date and time." };
        if (!current && d.getTime() < Date.now() - 5 * 60000) return { error: "The interview time cannot be in the past." };
        out.scheduledAt = d;
    }
    return { data: out };
}

// GET /interviews?candidate=&status=&from=&to=   (interviewers only see their own)
exports.getInterviews = async (req, res, next) => {
    try {
        const { candidate, status, from, to } = req.query;
        const filter = {};
        if (candidate && validId(candidate)) filter.candidate = candidate;
        if (status && IV_STATUS.includes(status)) filter.status = status;
        const f = toDate(from);
        const t = toDate(to);
        if (f || t) filter.scheduledAt = { ...(f ? { $gte: f } : {}), ...(t ? { $lte: t } : {}) };

        if (!isHiringTeam(req)) {
            if (!req.user?.employee) return res.json([]);
            filter.interviewer = idOf(req.user.employee);
        }
        res.json(await withIv(Interview.find(filter).sort({ scheduledAt: -1 }).limit(1000)));
    } catch (err) {
        next(err);
    }
};

exports.scheduleInterview = async (req, res, next) => {
    try {
        const input = await readInterview(req.body || {}, null);
        if (input.error) return bad(res, input.error);
        const d = input.data;
        const mins = d.durationMins || 45;
        if (await hasClash(d.interviewer, d.scheduledAt, mins)) return bad(res, "The interviewer already has an interview at this time.", 409);

        const iv = await Interview.create({ ...d, status: "scheduled", scheduledBy: req.user._id });
        await setStatus(d.candidate, "interview-scheduled", req.user._id, `${d.round || "screening"} round scheduled`);

        try {
            const uid = d.interviewer ? await userIdOfEmployee(d.interviewer) : null;
            if (uid) await notify(uid, { type: "general", title: "Interview scheduled", message: `You have an interview on ${d.scheduledAt.toLocaleString("en-IN")}.`, link: "/recruitment/interviews", exclude: req.user._id });
        } catch {
            /* ignored */
        }
        res.status(201).json(await withIv(Interview.findById(iv._id)));
    } catch (err) {
        next(err);
    }
};

// PUT /interviews/:id  (reschedule, change mode, cancel, mark no-show)
exports.updateInterview = async (req, res, next) => {
    try {
        const iv = await Interview.findById(req.params.id);
        if (!iv) return bad(res, "Interview not found.", 404);
        if (!canTouch(req, iv)) return bad(res, "You cannot change this interview.", 403);
        if (iv.status === "completed") return bad(res, "A completed interview cannot be changed.", 409);

        const input = await readInterview(req.body || {}, iv);
        if (input.error) return bad(res, input.error);
        const d = input.data;

        const next_ = { ...d };
        const when = d.scheduledAt || iv.scheduledAt;
        const who = d.interviewer !== undefined ? d.interviewer : idOf(iv.interviewer) || null;
        const finalStatus = d.status || iv.status;
        if (finalStatus === "scheduled" && (await hasClash(who, when, d.durationMins || iv.durationMins || 45, iv._id)))
            return bad(res, "The interviewer already has an interview at this time.", 409);
        if (d.status === "completed") delete next_.status; // completing needs feedback

        const rescheduled = d.scheduledAt && d.scheduledAt.getTime() !== iv.scheduledAt.getTime();
        iv.set(next_);
        await iv.save();

        if (["cancelled", "no-show"].includes(iv.status)) await syncAfterInterview(iv.candidate, req.user._id);
        else if (iv.status === "scheduled") await setStatus(iv.candidate, "interview-scheduled", req.user._id, "Interview rescheduled").catch(() => { });

        if (rescheduled) {
            try {
                const uid = iv.interviewer ? await userIdOfEmployee(iv.interviewer) : null;
                if (uid) await notify(uid, { type: "general", title: "Interview rescheduled", message: `New time: ${iv.scheduledAt.toLocaleString("en-IN")}.`, link: "/recruitment/interviews", exclude: req.user._id });
            } catch {
                /* ignored */
            }
        }
        res.json(await withIv(Interview.findById(iv._id)));
    } catch (err) {
        next(err);
    }
};

// PUT /interviews/:id/feedback  { feedback, rating, recommendation }
exports.submitFeedback = async (req, res, next) => {
    try {
        const iv = await Interview.findById(req.params.id);
        if (!iv) return bad(res, "Interview not found.", 404);
        if (!canGiveFeedback(req, iv)) return bad(res, "Only the interviewer, HR or Admin can give feedback.", 403);
        if (["cancelled", "no-show"].includes(iv.status)) return bad(res, "This interview was not held.", 409);

        const feedback = clean(req.body?.feedback, 2000);
        const rating = Number(req.body?.rating);
        const recommendation = req.body?.recommendation;
        if (feedback.length < 3) return bad(res, "Please write your feedback.");
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad(res, "Rating must be from 1 to 5.");
        if (!RECO.includes(recommendation)) return bad(res, "Please select a recommendation.");

        iv.set({ feedback, rating, recommendation, status: "completed", feedbackAt: new Date() });
        await iv.save();

        // HR decides about rejecting or offering, feedback only moves the candidate to "interviewed"
        const c = await Candidate.findById(iv.candidate).select("status");
        if (c && !LOCKED.includes(c.status) && c.status !== "rejected" && !(await Interview.exists({ candidate: c._id, status: "scheduled" })))
            await setStatus(c._id, "interviewed", req.user._id, `Feedback: ${recommendation}`);

        res.json(await withIv(Interview.findById(iv._id)));
    } catch (err) {
        next(err);
    }
};

exports.deleteInterview = async (req, res, next) => {
    try {
        const iv = await Interview.findById(req.params.id);
        if (!iv) return bad(res, "Interview not found.", 404);
        await iv.deleteOne();
        await syncAfterInterview(iv.candidate, req.user._id);
        res.json({ message: "Interview deleted." });
    } catch (err) {
        next(err);
    }
};

/* ============================== OFFERS ============================== */

const withOffer = (q) =>
    q
        .populate({ path: "candidate", select: "name email status jobPosition", populate: { path: "jobPosition", select: "title" } })
        .populate("document", "title fileName");

const shapeOffer = (o) => {
    const x = o.toObject ? o.toObject() : o;
    return { ...x, expired: x.status === "sent" && Boolean(x.validTill) && new Date(x.validTill) < startOfToday() };
};

async function readOffer(b, current) {
    const out = {};
    if (!current) {
        const cid = String(b.candidate || "");
        if (!validId(cid)) return { error: "Please select the candidate." };
        const cand = await Candidate.findById(cid).populate("jobPosition", "title");
        if (!cand) return { error: "Candidate not found." };
        if (["hired", "rejected"].includes(cand.status)) return { error: `A ${cand.status} candidate cannot get an offer.` };
        if (await Offer.exists({ candidate: cid, status: { $in: ["draft", "sent"] } })) return { error: "This candidate already has an active offer.", code: 409 };
        out.candidate = cid;
        out.jobPosition = idOf(cand.jobPosition) || undefined;
        out._defaultTitle = cand.jobPosition?.title || "";
    }

    const designation = b.designation !== undefined ? clean(b.designation, 120) : current?.designation || out._defaultTitle || "";
    if (designation.length < 2) return { error: "Please enter the designation." };
    out.designation = designation;
    delete out._defaultTitle;

    if (b.annualCtc !== undefined) {
        const n = Number(b.annualCtc || 0);
        if (!Number.isFinite(n) || n < 0) return { error: "CTC must be a positive number." };
        out.annualCtc = n;
    }
    for (const k of ["joiningDate", "validTill", "offerDate"]) {
        if (b[k] === undefined) continue;
        if (b[k] === "" || b[k] === null) out[k] = k === "offerDate" ? new Date() : null;
        else {
            const d = toDate(b[k]);
            if (!d) return { error: `Please enter a valid ${k.replace(/([A-Z])/g, " $1").toLowerCase()}.` };
            out[k] = d;
        }
    }
    if (out.joiningDate && out.offerDate && out.joiningDate < out.offerDate) return { error: "Joining date cannot be before the offer date." };
    if (b.notes !== undefined) out.notes = clean(b.notes, 1000);
    if (b.document !== undefined) {
        const d = String(b.document || "").trim();
        if (d && (!validId(d) || !(await Document.exists({ _id: d })))) return { error: "The offer letter document was not found." };
        out.document = d || null;
    }
    if (!current && b.status !== undefined) {
        if (!["draft", "sent"].includes(b.status)) return { error: "A new offer can only be a draft or sent." };
        out.status = b.status;
    }
    return { data: out };
}

async function closeIfFilled(positionId) {
    if (!positionId) return;
    const pos = await JobPosition.findById(positionId);
    if (!pos || pos.status !== "open") return;
    const hired = await Candidate.countDocuments({ jobPosition: positionId, status: "hired" });
    if (hired >= pos.numberOfOpenings) {
        pos.status = "closed";
        await pos.save();
    }
}

exports.getOffers = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.status && OFFER_STATUS.includes(req.query.status)) filter.status = req.query.status;
        if (req.query.candidate && validId(req.query.candidate)) filter.candidate = req.query.candidate;
        const rows = await withOffer(Offer.find(filter).sort({ createdAt: -1 }).limit(1000));
        res.json(rows.map(shapeOffer));
    } catch (err) {
        next(err);
    }
};

exports.createOffer = async (req, res, next) => {
    try {
        const input = await readOffer(req.body || {}, null);
        if (input.error) return bad(res, input.error, input.code || 400);
        const offer = await Offer.create({ ...input.data, createdBy: req.user._id });
        if (offer.status === "sent") await setStatus(offer.candidate, "offered", req.user._id, "Offer sent");
        res.status(201).json(shapeOffer(await withOffer(Offer.findById(offer._id))));
    } catch (err) {
        next(err);
    }
};

// PUT /offers/:id  (edit a draft or sent offer)
exports.updateOffer = async (req, res, next) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return bad(res, "Offer not found.", 404);
        if (!["draft", "sent"].includes(offer.status)) return bad(res, `A ${offer.status} offer cannot be edited.`, 409);
        const input = await readOffer(req.body || {}, offer);
        if (input.error) return bad(res, input.error);
        offer.set(input.data);
        await offer.save();
        res.json(shapeOffer(await withOffer(Offer.findById(offer._id))));
    } catch (err) {
        next(err);
    }
};

// PUT /offers/:id/status  { status }
exports.updateOfferStatus = async (req, res, next) => {
    try {
        const { status } = req.body || {};
        if (!OFFER_STATUS.includes(status)) return bad(res, "Please select a valid status.");
        const offer = await Offer.findById(req.params.id);
        if (!offer) return bad(res, "Offer not found.", 404);
        if (["accepted", "declined", "withdrawn"].includes(offer.status)) return bad(res, `This offer is already ${offer.status}.`, 409);
        if (status === "draft") return bad(res, "An offer cannot go back to draft.");

        offer.status = status;
        if (["accepted", "declined"].includes(status)) offer.respondedOn = new Date();
        await offer.save();

        if (status === "sent") await setStatus(offer.candidate, "offered", req.user._id, "Offer sent");
        else if (status === "accepted") {
            await setStatus(offer.candidate, "hired", req.user._id, "Offer accepted");
            await closeIfFilled(offer.jobPosition);
        } else if (["declined", "withdrawn"].includes(status)) await setStatus(offer.candidate, "interviewed", req.user._id, `Offer ${status}`);

        res.json(shapeOffer(await withOffer(Offer.findById(offer._id))));
    } catch (err) {
        next(err);
    }
};

exports.deleteOffer = async (req, res, next) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return bad(res, "Offer not found.", 404);
        if (offer.status === "accepted") return bad(res, "An accepted offer cannot be deleted.", 409);
        await offer.deleteOne();
        const c = await Candidate.findById(offer.candidate).select("status");
        if (c?.status === "offered" && !(await Offer.exists({ candidate: c._id, status: "sent" }))) await setStatus(c._id, "interviewed", req.user._id, "Offer removed");
        res.json({ message: "Offer deleted." });
    } catch (err) {
        next(err);
    }
};

/* ============================== SUMMARY (dashboard cards) ============================== */

exports.getSummary = async (req, res, next) => {
    try {
        const now = new Date();
        const week = new Date(now.getTime() + 7 * 86400000);
        const [openPositions, byStatus, upcomingInterviews, pendingOffers] = await Promise.all([
            JobPosition.countDocuments({ status: "open" }),
            Candidate.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
            Interview.countDocuments({ status: "scheduled", scheduledAt: { $gte: now, $lte: week } }),
            Offer.countDocuments({ status: "sent" }),
        ]);
        const stages = Object.fromEntries(STAGES.map((s) => [s, 0]));
        byStatus.forEach((r) => (stages[r._id] = r.n));
        res.json({ openPositions, candidates: { total: Object.values(stages).reduce((a, b) => a + b, 0), ...stages }, upcomingInterviews, pendingOffers });
    } catch (err) {
        next(err);
    }
};

/* ============================== PUBLIC (careers page, no login) ============================== */

const hits = new Map();
const throttled = (ip) => {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < 3600000);
    if (recent.length >= 5) {
        hits.set(ip, recent);
        return true;
    }
    recent.push(now);
    hits.set(ip, recent);
    return false;
};

exports.publicJobs = async (req, res, next) => {
    try {
        const rows = await JobPosition.find({ status: "open", isPublished: true }).populate("department", "name").sort({ postedOn: -1 }).limit(100).lean();
        res.json(
            rows.filter(isLive).map((p) => ({
                _id: p._id, title: p.title, department: p.department?.name || "", description: p.description, requiredSkills: p.requiredSkills,
                experienceRequired: p.experienceRequired, location: p.location, employmentType: p.employmentType, salaryRange: p.salaryRange,
                numberOfOpenings: p.numberOfOpenings, lastDate: p.lastDate, postedOn: p.postedOn,
            }))
        );
    } catch (err) {
        next(err);
    }
};

// POST /public/apply/:id  (multipart: name, email, phone, experience, file ...)
exports.publicApply = async (req, res, next) => {
    try {
        if (req.body?.website) return res.status(201).json({ message: "Application received." }); // hidden field, only bots fill it
        if (throttled(req.ip)) return bad(res, "Too many applications from this connection. Please try again later.", 429);

        const pos = await JobPosition.findById(req.params.id).lean();
        if (!pos || !isLive(pos)) return bad(res, "This job is no longer open.", 404);

        const r = await makeCandidate({ name: req.body?.name, email: req.body?.email, phone: req.body?.phone, experience: req.body?.experience, currentCompany: req.body?.currentCompany, expectedCtc: req.body?.expectedCtc, noticePeriod: req.body?.noticePeriod, notes: req.body?.notes, source: "job-portal", jobPosition: pos._id }, req.file, null);
        if (r.error) return bad(res, r.error, r.code || 400);

        await tellHr("New job application", `${r.candidate.name} applied for ${pos.title}.`, "/recruitment/applications");
        res.status(201).json({ message: "Application received. We will contact you soon." });
    } catch (err) {
        next(err);
    }
};

