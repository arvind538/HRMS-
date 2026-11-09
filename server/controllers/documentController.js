const mongoose = require("mongoose");
const Document = require("../models/Document");
const DocumentFile = require("../models/DocumentFile");
const Employee = require("../models/Employee");
const { notify, announcementAudience, userIdOfEmployee } = require("../utils/notify");
const { checkFile } = require("../utils/documentFiles");
const AUDIENCES = ["employee", "admin-hr"];

/* ------------------------------- categories ------------------------------- */

// personal = must belong to one employee
const CATEGORIES = {
    company: { label: "Company Document", personal: false },
    policy: { label: "HR Policy", personal: false },
    employee: { label: "Employee Document", personal: true },
    "offer-letter": { label: "Offer Letter", personal: true },
    "appointment-letter": { label: "Appointment Letter", personal: true },
    "salary-letter": { label: "Salary Letter", personal: true },
    "experience-letter": { label: "Experience Letter", personal: true },
    joining: { label: "Joining Document", personal: true },
};

const ALIASES = {
    policies: "policy",
    "hr-policy": "policy",
    "hr-policies": "policy",
    "company-documents": "company",
    "company-document": "company",
    "employee-documents": "employee",
    "employee-document": "employee",
    "offer-letters": "offer-letter",
    "appointment-letters": "appointment-letter",
    "salary-letters": "salary-letter",
    "experience-letters": "experience-letter",
    "joining-documents": "joining",
    "joining-document": "joining",
};

const normCategory = (v) => {
    const k = String(v || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
    const key = ALIASES[k] || k;
    return CATEGORIES[key] ? key : "";
};

// older documents may hold a free-text category, so the company-wide ones are matched loosely
const PUBLIC_CATEGORY = /^(company|hr[\s_-]?polic|polic)/i;

/* ------------------------------- helpers ------------------------------- */

const idOf = (v) => String(v?._id || v || "");
const validId = (v) => mongoose.isValidObjectId(v);
const bad = (res, message, status = 400) => res.status(status).json({ message });
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isPrivileged = (req) => ["admin", "hr"].includes(String(req.user?.role || "").toLowerCase());
const POPULATE = [
    ["employee", "name employeeId"],
    ["uploadedBy", "name"],
];
const withPeople = (q) => POPULATE.reduce((query, [path, fields]) => query.populate(path, fields), q);

/* The employee profile of the logged-in person. Older accounts may not have the link saved, so the email is used. */
async function ownEmployeeId(req) {
    if (req.user?.employee) return idOf(req.user.employee);
    const email = String(req.user?.email || "").trim();
    if (!email) return "";
    const rx = new RegExp(`^${escapeRegex(email)}$`, "i");
    const emp = await Employee.findOne({ $or: [{ loginEmail: rx }, { email: rx }] }).select("_id").lean();
    return emp ? String(emp._id) : "";
}

/* What a person may open: admin and HR everything, others their own and the company-wide ones */
function canSee(req, doc, own) {
    if (isPrivileged(req)) return true;
    if (doc.employee) return Boolean(own) && idOf(doc.employee) === own;
    return doc.visibility === "all-employees" && PUBLIC_CATEGORY.test(String(doc.category || ""));
    if (doc.audience === "admin-hr") return false;
}


const shape = (doc) => {
    const o = doc.toObject ? doc.toObject() : doc;
    const uploaded = Boolean(o.file);
    const { file, ...rest } = o;
    return {
        ...rest,
        audience: o.audience || "employee",
        source: uploaded ? "upload" : "link",
        hasFile: uploaded,
        downloadUrl: uploaded ? `/documents/${o._id}/file` : "", // fetch it with the login token (blob)
        categoryLabel: CATEGORIES[normCategory(o.category)]?.label || o.category,
    };
};

const cleanLink = (v) => {
    const url = String(v || "").trim().slice(0, 500);
    if (url && !/^https?:\/\/\S+$/i.test(url)) return { error: "The link must start with http:// or https://." };
    return { value: url };
};

/* Tells the person(s) the document is for. A failed notification never stops the work. */

async function tellAbout(req, doc, categoryKey) {
    try {
        const payload = {
            type: "general",
            title: "New document",
            message: `${CATEGORIES[categoryKey]?.label || "A document"}: ${doc.title}`,
            link: "/self-service/documents",
            exclude: req.user._id,
        };
        if (doc.employee) {
            const userId = await userIdOfEmployee(doc.employee);
            if (userId) await notify(userId, payload);
        } else {
            const ids = await announcementAudience({ audience: "all" });
            if (ids?.length) await notify(ids, { ...payload, link: categoryKey === "policy" ? "/documents/policies" : "/documents/company" });
        }
    } catch {
        /* ignored */
    }
}

/* Reads and checks the fields of an upload or an update. `current` is the existing document (for an update). */
async function readInput(req, current) {
    const b = req.body || {};
    const out = {};

    const title = b.title !== undefined ? String(b.title).trim() : current?.title || "";
    if (title.length < 2 || title.length > 150) return { error: "Title must be 2 to 150 characters." };
    out.title = title;

    const catKey = normCategory(b.category !== undefined ? b.category : current?.category);
    if (!catKey) return { error: "Please select a valid category." };
    out.category = catKey;

    if (b.description !== undefined) out.description = String(b.description).trim().slice(0, 500);

    let employee = b.employee !== undefined ? String(b.employee).trim() : current?.employee ? idOf(current.employee) : "";
    if (employee === "null" || employee === "undefined") employee = "";
    if (employee) {
        if (!validId(employee)) return { error: "Please select a valid employee." };
        if (!(await Employee.exists({ _id: employee }))) return { error: "Employee record not found." };
    } else if (CATEGORIES[catKey].personal) {
        return { error: `${CATEGORIES[catKey].label} must be given to one employee. Please select the employee.` };
    }
    out.employee = employee || null;
    out.visibility = employee ? "specific-employee" : "all-employees"; // decided here, never trusted from the client
    const audience = String(b.audience !== undefined ? b.audience : current?.audience || "employee");
    if (!AUDIENCES.includes(audience)) return { error: "Please select who can see this document." };
    out.audience = audience;
    if (b.docType !== undefined) out.docType = String(b.docType).trim().slice(0, 80);
    return { data: out };
}

/* ------------------------------- read ------------------------------- */

// @route GET /api/documents?category=&employee=&q=
exports.getDocuments = async (req, res, next) => {
    try {
        const { category, employee, q } = req.query;
        const and = [];

        if (category && category !== "ALL") {
            const key = normCategory(category);
            if (!key) return bad(res, "Unknown category.");
            and.push({ category: key });
        }
        if (q) and.push({ title: new RegExp(escapeRegex(String(q).trim().slice(0, 60)), "i") });

        if (isPrivileged(req)) {
            if (employee && employee !== "ALL") {
                if (!validId(employee)) return bad(res, "Please select a valid employee.");
                and.push({ employee });
            }
        } else {
            const own = await ownEmployeeId(req);
            const visible = [{ employee: null, visibility: "all-employees", category: PUBLIC_CATEGORY }];
            if (own) visible.push({ employee: own });
            and.push({ $or: visible });
            and.push({ audience: { $ne: "admin-hr" } });
        }

        const docs = await withPeople(Document.find(and.length ? { $and: and } : {}).sort({ createdAt: -1 }).limit(500));
        res.status(200).json(docs.map(shape));
    } catch (err) {
        next(err);
    }
};

// @route GET /api/documents/mine   (only the documents given to the logged-in employee)
exports.getMyDocuments = async (req, res, next) => {
    try {
        const own = await ownEmployeeId(req);
        if (!own) return res.status(200).json([]);
        // const docs = await withPeople(Document.find({ employee: own }).sort({ createdAt: -1 }).limit(500));
        const docs = await withPeople(Document.find({ employee: own, audience: { $ne: "admin-hr" } }).sort({ createdAt: -1 }).limit(500));
        res.status(200).json(docs.map(shape));
    } catch (err) {
        next(err);
    }
};

// @route GET /api/documents/:id/file?download=1
exports.getFile = async (req, res, next) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) return bad(res, "Document not found.", 404);
        if (!canSee(req, doc, isPrivileged(req) ? "" : await ownEmployeeId(req))) return bad(res, "You cannot open this document.", 403);
        if (!doc.file) return bad(res, "This document is a link, not an uploaded file.", 400);

        const stored = await DocumentFile.findById(doc.file);
        if (!stored) return bad(res, "The file is missing. Please upload it again.", 404);

        const name = doc.fileName || "document";
        res.setHeader("Content-Type", stored.contentType);
        res.setHeader("Content-Length", stored.data.length);
        res.setHeader("Content-Disposition", `${req.query.download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(name)}`);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, no-store");
        res.status(200).send(stored.data);
    } catch (err) {
        next(err);
    }
};

/* ------------------------------- write ------------------------------- */

// @route POST /api/documents   (multipart: file, or fileUrl as a link)
// exports.uploadDocument = async (req, res, next) => {
//     let doc = null;
//     try {
//         const input = await readInput(req, null);
//         if (input.error) return bad(res, input.error);

//         let checked = null;
//         let link = "";
//         if (req.file) {
//             checked = checkFile(req.file);
//             if (checked.error) return bad(res, checked.error);
//         } else {
//             const l = cleanLink(req.body.fileUrl);
//             if (l.error) return bad(res, l.error);
//             if (!l.value) return bad(res, "Please upload a file or give a link.");
//             link = l.value;
//         }

//         doc = await Document.create({
//             ...input.data,
//             uploadedBy: req.user._id,
//             ...(link ? { fileUrl: link } : { fileName: checked.name, fileType: checked.mime, fileSize: req.file.size, file: new mongoose.Types.ObjectId() }),
//         });

//         if (checked) {
//             const stored = await DocumentFile.create({ document: doc._id, data: req.file.buffer, contentType: checked.mime });
//             doc.file = stored._id;
//             await doc.save();
//         }

//         await tellAbout(req, doc, input.data.category);
//         res.status(201).json(shape(await withPeople(Document.findById(doc._id))));
//     } catch (err) {
//         if (doc) {
//             await DocumentFile.deleteMany({ document: doc._id }).catch(() => { });
//             await Document.deleteOne({ _id: doc._id }).catch(() => { });
//         }
//         next(err);
//     }
// };


exports.uploadDocument = async (req, res, next) => {
    let doc = null;
    let storedFileId = null;

    try {
        // 1. Validate document metadata
        const input = await readInput(req, null);

        if (input.error) {
            return bad(res, input.error);
        }

        // 2. Process actual uploaded file OR external URL
        let checked = null;
        let link = "";

        if (req.file) {
            checked = checkFile(req.file);

            if (checked.error) {
                return bad(res, checked.error);
            }
        } else {
            const rawUrl = String(req.body?.fileUrl || "").trim();

            if (!rawUrl) {
                return bad(
                    res,
                    'File backend tak nahi pahunchi. FormData mein file ko "file" field ke naam se bhejein.'
                );
            }

            const result = cleanLink(rawUrl);

            if (result.error) {
                return bad(res, result.error);
            }

            link = result.value;
        }

        // 3. Save document record
        // A temporary file reference satisfies the existing Document schema.
        const temporaryFileId = checked
            ? new mongoose.Types.ObjectId()
            : undefined;

        doc = await Document.create({
            ...input.data,
            uploadedBy: req.user._id,
            ...(checked
                ? {
                    file: temporaryFileId,
                    fileName: checked.name,
                    fileType: checked.mime,
                    fileSize: req.file.size,
                }
                : {
                    fileUrl: link,
                }),
        });

        // 4. Save binary file in DocumentFile collection
        if (checked) {
            const stored = await DocumentFile.create({
                document: doc._id,
                data: req.file.buffer,
                contentType: checked.mime,
            });

            storedFileId = stored._id;

            // Replace temporary reference with actual saved file reference
            doc.file = stored._id;
            await doc.save();
        }

        // 5. Notify relevant users without blocking the upload
        await tellAbout(req, doc, input.data.category);

        // 6. Return the saved document
        const savedDocument = await withPeople(
            Document.findById(doc._id)
        );

        return res.status(201).json(shape(savedDocument));
    } catch (err) {
        // Cleanup incomplete uploads if a later operation fails
        if (storedFileId) {
            await DocumentFile.deleteOne({ _id: storedFileId }).catch(() => { });
        } else if (doc) {
            await DocumentFile.deleteMany({ document: doc._id }).catch(() => { });
        }

        if (doc) {
            await Document.deleteOne({ _id: doc._id }).catch(() => { });
        }

        return next(err);
    }
};


// @route PUT /api/documents/:id   (multipart: a new file replaces the old one)
exports.updateDocument = async (req, res, next) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) return bad(res, "Document not found.", 404);

        const input = await readInput(req, doc);
        if (input.error) return bad(res, input.error);

        const employeeChanged = idOf(doc.employee) !== idOf(input.data.employee);
        doc.set(input.data);

        let oldFile = null;
        if (req.file) {
            const checked = checkFile(req.file);
            if (checked.error) return bad(res, checked.error);
            const stored = await DocumentFile.create({ document: doc._id, data: req.file.buffer, contentType: checked.mime });
            oldFile = doc.file;
            doc.set({ file: stored._id, fileName: checked.name, fileType: checked.mime, fileSize: req.file.size, fileUrl: undefined });
        } else if (req.body.fileUrl !== undefined && String(req.body.fileUrl).trim()) {
            const l = cleanLink(req.body.fileUrl);
            if (l.error) return bad(res, l.error);
            oldFile = doc.file;
            doc.set({ fileUrl: l.value, file: undefined, fileName: undefined, fileType: undefined, fileSize: undefined });
        }

        await doc.save();
        if (oldFile) await DocumentFile.deleteOne({ _id: oldFile }).catch(() => { });
        if (employeeChanged && doc.employee) await tellAbout(req, doc, input.data.category);

        res.status(200).json(shape(await withPeople(Document.findById(doc._id))));
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/documents/:id
exports.deleteDocument = async (req, res, next) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) return bad(res, "Document not found.", 404);
        await DocumentFile.deleteMany({ document: doc._id });
        await doc.deleteOne();
        res.status(200).json({ message: "Document removed successfully." });
    } catch (err) {
        next(err);
    }
};
