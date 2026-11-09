const mongoose = require("mongoose");
const Candidate = require("../models/Candidate"); // <- change the path if your model file is somewhere else

const OBJECT_ID = /^[a-f\d]{24}$/i;
const EMAIL = /^\S+@\S+\.\S+$/;

const lower = (v) => String(v ?? "").trim().toLowerCase();
const clean = (v) => String(v ?? "").trim();
const has = (path) => Boolean(Candidate.schema.path(path)); // does the Candidate model have this field?

const personName = (c) =>
    c?.name || c?.fullName || [c?.firstName, c?.lastName].filter(Boolean).join(" ") || "";
const jobTitleOf = (j) => j?.title || j?.name || j?.jobTitle || "";

/* the fields the model really requires (the form shows a star on them) */
const requiredFields = () =>
    Candidate.schema.requiredPaths().filter((p) => ["email", "phone", "jobPosition"].includes(p));

/* the job model the candidate points to (works with any model name, for example JobPosition) */
const jobModel = () => {
    const ref = Candidate.schema.path("jobPosition")?.options?.ref;
    return typeof ref === "string" && mongoose.models[ref] ? mongoose.models[ref] : null;
};

/* one candidate, in the shape the dropdown needs */
const shape = (c) => {
    const o = typeof c?.toObject === "function" ? c.toObject() : c;
    const job = o.jobPosition && jobTitleOf(o.jobPosition) ? o.jobPosition : null; // populated job only (not a bare id)
    return {
        _id: o._id,
        name: personName(o) || (o.email || "").split("@")[0] || "Unnamed candidate",
        email: o.email || "",
        phone: o.phone || "",
        status: lower(o.status),
        jobPosition: job ? { _id: job._id, title: jobTitleOf(job) } : null,
    };
};

const populateJob = (query) => (has("jobPosition") ? query.populate("jobPosition", "title name jobTitle") : query);

/* GET /recruitment/candidate-options -> { candidates, jobs, required } */
exports.getCandidateOptions = async (req, res, next) => {
    try {
        const rows = await populateJob(Candidate.find({}).sort({ createdAt: -1 }).limit(2000)).lean();

        const Job = jobModel();
        const jobRows = Job ? await Job.find({}).select("title name jobTitle").sort({ createdAt: -1 }).limit(500).lean() : [];

        res.json({
            success: true,
            candidates: rows.map(shape),
            jobs: jobRows.map((j) => ({ _id: j._id, title: jobTitleOf(j) })).filter((j) => j.title),
            required: requiredFields(),
        });
    } catch (err) {
        next(err);
    }
};

/* POST /recruitment/candidates/quick  body: { name, email?, phone?, jobPosition? }  (admin / HR) */
exports.quickAddCandidate = async (req, res, next) => {
    try {
        if (!["admin", "hr"].includes(lower(req.user?.role))) {
            return res.status(403).json({ message: "Only admin or HR can add a candidate." });
        }

        const name = clean(req.body?.name).replace(/\s+/g, " ");
        const email = lower(req.body?.email);
        const phone = clean(req.body?.phone).replace(/\D/g, "");
        const jobId = clean(req.body?.jobPosition);
        const required = requiredFields();

        if (name.length < 2) return res.status(400).json({ message: "Candidate name must be at least 2 characters." });
        if (required.includes("email") && !email) return res.status(400).json({ message: "Candidate email is required." });
        if (required.includes("phone") && !phone) return res.status(400).json({ message: "Candidate phone number is required." });
        if (required.includes("jobPosition") && !jobId) return res.status(400).json({ message: "Please select the job position." });
        if (email && !EMAIL.test(email)) return res.status(400).json({ message: "Please enter a valid email address." });
        if (phone && !/^\d{10,13}$/.test(phone)) return res.status(400).json({ message: "Phone number must be 10 to 13 digits." });
        if (jobId && !OBJECT_ID.test(jobId)) return res.status(400).json({ message: "Please select the job position from the list." });

        /* the same person must not be added twice: the old record is returned and the form selects it */
        const same = [];
        if (email && has("email")) same.push({ email });
        if (phone && has("phone")) same.push({ phone: new RegExp(`${phone.slice(-10)}$`) });
        if (same.length) {
            const found = await populateJob(Candidate.findOne({ $or: same }));
            if (found) {
                return res.status(409).json({
                    message: `${personName(found) || "This candidate"} already exists with this email or phone number.`,
                    existing: shape(found),
                });
            }
        }

        /* only the fields that exist in the model are filled */
        const doc = new Candidate();
        if (has("name")) doc.set("name", name);
        else if (has("fullName")) doc.set("fullName", name);
        else {
            if (has("firstName")) doc.set("firstName", name.split(" ")[0]);
            if (has("lastName")) doc.set("lastName", name.split(" ").slice(1).join(" "));
        }
        if (email && has("email")) doc.set("email", email);
        if (phone && has("phone")) doc.set("phone", phone);
        if (jobId && has("jobPosition")) doc.set("jobPosition", jobId);
        if (has("createdBy") && req.user?._id) doc.set("createdBy", req.user._id);
        if (Candidate.schema.path("source")?.enumValues?.includes("manual")) doc.set("source", "manual");

        try {
            await doc.save();
        } catch (err) {
            if (err.name === "ValidationError") {
                const fields = Object.keys(err.errors).join(", ");
                return res.status(400).json({
                    message: `A candidate cannot be saved without: ${fields}. Add this candidate from the Candidates page, or make these fields optional in the Candidate model.`,
                });
            }
            throw err;
        }

        if (doc.jobPosition) await doc.populate("jobPosition", "title name jobTitle");

        return res.status(201).json({ success: true, message: "Candidate added.", candidate: shape(doc) });
    } catch (err) {
        next(err);
    }
};