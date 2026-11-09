const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const User = require("../models/User");
const ActivityLog = require("../models/activityLogModel");
const Task = require("../models/Task");
const Goal = require("../models/Goal");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const { myEmployee, teamFilter } = require("../utils/teamScope");
const { attachManagerName, attachManagerNames, managerNameOf } = require("../utils/reportingManager");

const GENDERS = ["male", "female", "other"];
const ROLES = ["Employee", "Manager", "HR", "Admin"];
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
const PASSWORD_MESSAGE =
    "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number.";
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const AADHAAR_REGEX = /^[2-9]\d{11}$/;
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const CI = { locale: "en", strength: 2 }; // case-insensitive email match

const ID_PREFIX = "FPS"; // employee ids: FPS0001, FPS0002 ...
const OBJECT_ID = /^[a-f\d]{24}$/i; // mongoose.isValidObjectId is too loose (it accepts any 12 character text)

const PHONE_DIGITS = 10; // country code + mobile number, for example 919876543210
const PHONE_REGEX = new RegExp(`^[1-9]\\d{${PHONE_DIGITS - 1}}$`);

/* Login roles that can be a reporting manager. Add "hr" and "admin" here if they should be allowed too. */
const MANAGER_ROLES = ["manager"];

/* Step by step saving. The admin has 5 steps (the last one is the login access), HR has 4. */
const ADMIN_LAST_STEP = 5;
const HR_LAST_STEP = 4;
const STEP_RULES = {
    1: ["name", "email", "phone"],
    2: ["designation", "department", "dateOfJoining", "salary"],
    3: ["aadhaarNumber", "panNumber"],
    4: ["bankDetails.accountName", "bankDetails.bankName", "bankDetails.branchName", "bankDetails.accountNumber", "bankDetails.ifscCode"],
    5: ["loginEmail"],
};

/* ----------------------------- helpers ----------------------------- */

const str = (v) => (v === undefined || v === null ? "" : String(v).trim());
const rawStr = (v) => (v === undefined || v === null ? "" : String(v)); // base64 and passwords (no trim)
const lower = (v) => str(v).toLowerCase();
const upper = (v) => str(v).toUpperCase();
const digits = (v) => str(v).replace(/\D/g, "");

/* an old 10-digit mobile number becomes 91 + number. Anything longer is cut to the last PHONE_DIGITS digits. */
const normalizePhone = (v) => {
    const d = digits(v);
    return d.length === 10 ? `91${d}` : d.slice(-PHONE_DIGITS);
};

// id ya {_id} object ho to usse plain string bana do
const refString = (v) => {
    if (v && typeof v === "object") return String(v._id || v.id || "").trim();
    return str(v);
};

// ObjectId, populated object or text -> plain string (used to compare ids)
const idStr = (v) => String(v?._id || v || "").trim();

const toDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeStatus = (v) => {
    const s = str(v);
    const l = s.toLowerCase();
    return l === "exit" || l === "exited" ? "Exited" : s;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Fields that managers must not see (admin and HR can) */
const SENSITIVE_FIELDS = ["salary", "bankDetails", "documents", "idProofNumber", "aadhaarNumber", "panNumber"];

/* ------------------------- role and access ------------------------- */

const roleOf = (req) => lower(req.user?.role);
const isAdmin = (req) => roleOf(req) === "admin"; // login access (login email, password, role) is admin only
const canManage = (req) => ["admin", "hr"].includes(roleOf(req)); // profile: create, update, delete, exit
const deny = (res, message = "You are not allowed to perform this action.") =>
    res.status(403).json({ message });

const requesterId = (req) => String(req.user?._id || req.user?.id || "");

// Is this employee profile the logged-in user's own profile?
const isSelf = (req, emp) => {
    if (!emp) return false;
    const linked = req.user?.employee ? String(req.user.employee._id || req.user.employee) : "";
    if (linked && linked === String(emp._id)) return true;
    const email = lower(req.user?.email);
    return Boolean(email) && [emp.email, emp.loginEmail].some((e) => lower(e) === email);
};

// Logged-in user's own employee profile
const findMyEmployee = async (req, select = "") => {
    const linked = req.user?.employee ? req.user.employee._id || req.user.employee : null;
    if (linked && mongoose.isValidObjectId(linked)) {
        const byLink = await Employee.findById(linked).select(select);
        if (byLink) return byLink;
    }
    const email = lower(req.user?.email);
    if (!email) return null;
    return Employee.findOne({ $or: [{ email }, { loginEmail: email }] }).select(select);
};

/* --------------------------- login account --------------------------- */

const findUserByEmail = (email) => User.findOne({ email }).collation(CI);

const loginEmailTaken = async (email, exceptUserId) => {
    const found = await findUserByEmail(email).select("_id");
    return Boolean(found && (!exceptUserId || String(found._id) !== String(exceptUserId)));
};

// The User (login account) that belongs to this employee profile
const findLinkedUser = async (employee) => {
    const byRef = await User.findOne({ employee: employee._id });
    if (byRef) return byRef;

    const emails = [employee.loginEmail, employee.email].map(lower).filter(Boolean);
    for (const email of emails) {
        const byEmail = await findUserByEmail(email);
        if (byEmail && (!byEmail.employee || String(byEmail.employee) === String(employee._id))) {
            return byEmail;
        }
    }
    return null;
};

const hashPassword = (password) => bcrypt.hash(password, 10);
const userRoleFrom = (role) => lower(role || "Employee");
const isLoginActive = (status) => !["inactive", "exited"].includes(lower(status));

/* ------------------------------ misc ------------------------------ */

const logActivity = async (req, action) => {
    try {
        if (!ActivityLog) return;
        await ActivityLog.create({
            user: req.user?.id || req.user?._id || null,
            action,
            module: "Employee",
        });
    } catch (err) {
        console.error("Activity log error:", err.message);
    }
};

/* ----------------------------- reporting manager ----------------------------- */

/* works whether the schema stores the manager as an ObjectId (recommended) or as text */
const mgrIsObjectId = () => Employee.schema.path("reportingManager")?.instance === "ObjectId";
const oid = (x) => new mongoose.Types.ObjectId(String(x));

/* the manager, his manager, his manager's manager... used to stop loops (A reports to B, B reports to A) */
async function ancestors(boss) {
    const out = new Set();
    let cur = boss;
    for (let i = 0; i < 15 && cur; i++) {
        out.add(String(cur._id));
        const upId = idStr(cur.reportingManager);
        // chain ends at an empty value or at an old text value like "Sanjay Sir" (it is not an id, so it is never looked up)
        if (!mgrIsObjectId() || !OBJECT_ID.test(upId) || out.has(upId)) break;
        cur = await Employee.findById(upId).select("reportingManager").lean();
    }
    return out;
}

/* accepts an id (normal), or an employee id / name (old forms). Returns { value, boss } to save, or { error }. */
async function resolveManager(input, selfId) {
    const raw = refString(input);
    if (!raw || raw === "null" || raw === "undefined") return { value: mgrIsObjectId() ? null : "" };

    const pick = "_id name employeeId email loginEmail employeeStatus reportingManager";
    let boss = null;

    if (OBJECT_ID.test(raw)) {
        boss = await Employee.findById(raw).select(pick).lean();
    } else {
        const noTitle = raw.replace(/\s+(sir|madam|mam|ma'am)$/i, "");
        const names = [...new Set([raw, noTitle])].map(escapeRegex).join("|");
        const found = await Employee.find({
            $or: [{ employeeId: raw.toUpperCase() }, { name: new RegExp(`^(${names})$`, "i") }],
        })
            .select(pick)
            .limit(2)
            .lean();
        if (found.length > 1) return { error: `More than one person is called "${raw}". Please choose the manager from the list.` };
        boss = found[0] || null;
    }

    if (!boss) return { error: "The selected reporting manager was not found." };
    if (selfId && String(boss._id) === String(selfId)) return { error: "An employee cannot report to themselves." };
    if (!isLoginActive(boss.employeeStatus)) return { error: `${boss.name} is inactive or has left the company.` };

    const login = await findLinkedUser(boss);
    if (!login) return { error: `${boss.name} has no login account yet. Ask the admin to create it first.` };
    if (!MANAGER_ROLES.includes(lower(login.role))) {
        return { error: `${boss.name} does not have the Manager role. Ask the admin to set his Access Role to Manager.` };
    }
    if (selfId && (await ancestors(boss)).has(String(selfId))) {
        return { error: `${boss.name} already reports to this employee. That would make a loop.` };
    }

    return { value: mgrIsObjectId() ? boss._id : boss.name, boss };
}

/* when a manager leaves or is deleted his people must not keep pointing at him */
async function releaseTeam(boss) {
    const filter = mgrIsObjectId()
        ? { reportingManager: boss._id }
        : { reportingManager: new RegExp(`^\\s*(${escapeRegex(boss.name)}|${escapeRegex(boss.employeeId || "~")})\\s*$`, "i") };
    const r = await Employee.updateMany(filter, { $set: { reportingManager: mgrIsObjectId() ? null : "" } });
    return r.modifiedCount || 0;
}

/* ----------------------------- errors and ids ----------------------------- */

const handleError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);

    if (error.name === "ValidationError") {
        const message = Object.values(error.errors).map((e) => e.message).join(", ");
        return res.status(400).json({ message });
    }
    if (error.name === "CastError") {
        // for example an old text value saved in an id field
        return res.status(400).json({ message: `Invalid value for "${error.path}". Please select it again.` });
    }
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || "field";
        return res.status(409).json({ message: `A record with this ${field} already exists.` });
    }
    return res.status(500).json({ message: fallbackMessage });
};

/* Next employee id: FPS0001, FPS0002 ... (highest existing FPS number + 1). Old ids like EMP0001 are ignored. */
const nextEmployeeId = async () => {
    const rows = await Employee.find({ employeeId: new RegExp(`^${ID_PREFIX}\\d+$`, "i") })
        .select("employeeId")
        .lean();
    let max = 0;
    rows.forEach((r) => {
        const n = Number(String(r.employeeId).slice(ID_PREFIX.length));
        if (n > max) max = n;
    });
    return `${ID_PREFIX}${String(max + 1).padStart(4, "0")}`;
};

/**
 * Request body -> schema fields (dot-path object).
 * Only keys that were sent are returned, so a partial update never wipes other data.
 * "password" is never copied here: it belongs to the User model, not Employee.
 */
const buildEmployeeData = (body = {}) => {
    const data = {};
    const bank = body.bankDetails || {};
    const docs = body.documents || {};

    const setIf = (path, value, fn = str, skipEmpty = false) => {
        if (value === undefined) return;
        const out = fn(value);
        if (skipEmpty && (out === "" || out === null)) return;
        data[path] = out;
    };
    const flatOrNested = (flat, nested) => (body[flat] !== undefined ? body[flat] : nested);

    /* Personal */
    setIf("employeeId", body.employeeId, upper, true);
    setIf("firstName", body.firstName);
    setIf("lastName", body.lastName);
    setIf("name", body.name, str, true);
    if (data.name === undefined && (body.firstName !== undefined || body.lastName !== undefined)) {
        const full = `${str(body.firstName)} ${str(body.lastName)}`.trim();
        if (full) data.name = full;
    }
    setIf("email", body.email, lower, true);
    setIf("loginEmail", body.loginEmail, lower, true);
    setIf("phone", body.phone, normalizePhone);
    setIf("gender", body.gender, lower, true);
    if (data.gender && !GENDERS.includes(data.gender)) delete data.gender;
    setIf("timeZone", body.timeZone);
    setIf("avatar", body.avatar, rawStr);

    /* Address */
    setIf("address", body.address);
    setIf("city", body.city);
    setIf("state", body.state);
    setIf("pincode", body.pincode);

    /* Job */
    setIf("designation", body.designation, refString, true);
    setIf("department", body.department, refString, true);
    setIf("reportingManager", body.reportingManager, refString); // checked and replaced by resolveManager in create / update
    setIf("employmentType", body.employmentType, str, true);
    setIf("employeeStatus", body.employeeStatus, normalizeStatus, true);
    setIf("role", body.role, str, true);
    if (data.role && !ROLES.includes(data.role)) delete data.role;
    setIf("dateOfJoining", body.dateOfJoining, toDate);
    setIf("salary", body.salary, (v) => Number(v) || 0);

    /* Exit */
    setIf("exitDate", body.exitDate, toDate);
    setIf("exitReason", body.exitReason);

    /* Identity */
    setIf("nationalIdType", body.nationalIdType);
    setIf("nationalIdOther", body.nationalIdOther);
    setIf("aadhaarNumber", body.aadhaarNumber, digits);
    setIf("panNumber", body.panNumber, upper);
    setIf("idProofNumber", body.idProofNumber !== undefined ? body.idProofNumber : body.nationalId, upper);
    // Older forms only sent one ID number. The Aadhaar number is the main ID.
    if (data.aadhaarNumber && data.idProofNumber === undefined) data.idProofNumber = data.aadhaarNumber;

    /* Bank */
    ["accountName", "bankName", "branchName", "accountNumber"].forEach((k) =>
        setIf(`bankDetails.${k}`, flatOrNested(k, bank[k]))
    );
    setIf("bankDetails.ifscCode", flatOrNested("ifscCode", bank.ifscCode), upper);

    /* Documents (base64 images) */
    [
        "nationalIdFrontFileName",
        "nationalIdFrontFileData",
        "nationalIdBackFileName",
        "nationalIdBackFileData",
        "panCardFileName",
        "panCardFileData",
        "passportPhotoFileName",
        "passportPhotoData",
    ].forEach((k) => setIf(`documents.${k}`, docs[k] !== undefined ? docs[k] : body[k], rawStr));

    return data;
};

/* the required fields of one step that are still missing */
const missingForStep = (step, data) =>
    (STEP_RULES[step] || []).filter((key) => !data[key]).map((key) => key.split(".").pop());

/* Format checks done on the server, because the browser can be bypassed.
   create = the old one-shot form (Aadhaar and PAN required). step = the step that is being saved. */
const validateInput = (data, { create = false, step = 0 } = {}) => {
    if (data.email && !EMAIL_REGEX.test(data.email)) return "Please enter a valid personal email address.";
    if (data.loginEmail && !EMAIL_REGEX.test(data.loginEmail)) return "Please enter a valid login email address.";
    if ("phone" in data && !PHONE_REGEX.test(data.phone)) {
        return `Phone number must be ${PHONE_DIGITS} digits with the country code (for example, 919876543210).`;
    }

    const needIds = create || step === 3;
    if (needIds || data.aadhaarNumber) {
        if (!AADHAAR_REGEX.test(data.aadhaarNumber || "")) {
            return "Aadhaar number must be 12 digits and cannot start with 0 or 1.";
        }
    }
    if (needIds || data.panNumber) {
        if (!PAN_REGEX.test(data.panNumber || "")) {
            return "Enter a valid PAN number (for example, ABCDE1234F).";
        }
    }
    if (data["bankDetails.ifscCode"] && !IFSC_REGEX.test(data["bankDetails.ifscCode"])) {
        return "Enter a valid IFSC code (for example, SBIN0001234).";
    }
    if (data["bankDetails.accountNumber"] && !/^\d{9,18}$/.test(data["bankDetails.accountNumber"])) {
        return "Account number must be 9 to 18 digits.";
    }
    return null;
};

// employeeId / emails / phone / Aadhaar / PAN duplicate check
const findDuplicate = async (data, excludeId) => {
    const notSelf = excludeId ? { _id: { $ne: excludeId } } : {};
    const checks = [];

    if (data.employeeId) checks.push([{ employeeId: data.employeeId }, "Employee ID", data.employeeId]);
    if (data.email) checks.push([{ email: data.email }, "Personal email", data.email]);
    if (data.phone) {
        // old records can hold the 10-digit number, so the last 10 digits are compared
        checks.push([{ phone: new RegExp(`${data.phone.slice(-10)}$`) }, "Phone number", data.phone]);
    }
    if (data.loginEmail) {
        checks.push([
            { $or: [{ loginEmail: data.loginEmail }, { email: data.loginEmail }] },
            "Login email",
            data.loginEmail,
        ]);
    }
    if (data.aadhaarNumber) {
        checks.push([
            { $or: [{ aadhaarNumber: data.aadhaarNumber }, { idProofNumber: data.aadhaarNumber }] },
            "Aadhaar number",
            data.aadhaarNumber,
        ]);
    } else if (data.idProofNumber) {
        checks.push([{ idProofNumber: data.idProofNumber }, "Document ID number", data.idProofNumber]);
    }
    if (data.panNumber) {
        checks.push([
            { $or: [{ panNumber: data.panNumber }, { idProofNumber: data.panNumber }] },
            "PAN number",
            data.panNumber,
        ]);
    }

    for (const [filter, label, value] of checks) {
        const dup = await Employee.exists({ ...filter, ...notSelf });
        if (dup) return `${label} "${value}" is already registered with another employee.`;
    }
    return null;
};

/* ----------------------------- handlers ----------------------------- */

/*
  STEP 1 of the step-by-step form: creates the employee as a DRAFT.
  Only the personal details are needed. The other steps are saved later with PUT /employees/:id.
*/
const createDraft = async (req, res) => {
    const data = buildEmployeeData(req.body || {});

    // a draft never carries a login or a manager. They come in their own steps.
    delete data.loginEmail;
    delete data.role;
    delete data.reportingManager;

    if (!data.employeeId) data.employeeId = await nextEmployeeId();

    const missing = missingForStep(1, data);
    if (missing.length) return res.status(400).json({ message: `Required fields missing: ${missing.join(", ")}` });

    const invalid = validateInput(data);
    if (invalid) return res.status(400).json({ message: invalid });

    const dupMessage = await findDuplicate(data);
    if (dupMessage) return res.status(409).json({ message: dupMessage });

    const employee = new Employee();
    for (const [path, value] of Object.entries(data)) employee.set(path, value);
    employee.set("onboarding.status", "draft");
    employee.set("onboarding.step", 1);

    // validateBeforeSave: false -> the fields of the later steps (designation, salary ...) are not required yet.
    // Every format is already checked above, and the later steps are checked when they are saved.
    const saved = await employee.save({ validateBeforeSave: false });

    await logActivity(req, `Started employee profile (Step 1 saved): ${saved.name} (${saved.employeeId})`);

    const out = saved.toObject();
    delete out.documents;
    return res.status(201).json({
        success: true,
        message: "Step 1 saved. You can continue with the next steps now, or later.",
        draft: true,
        employee: out,
        data: out,
    });
};

// @route POST /api/employees  (admin / hr)
// body.draft = true -> Step 1 of the step-by-step form.
// Without draft the old one-shot form still works: admin = profile + login account, HR = profile only.
const createEmployee = async (req, res) => {
    let saved = null;
    try {
        if (!canManage(req)) return deny(res, "Only admin or HR can add employees.");

        if (req.body?.draft === true || req.body?.draft === "true") return await createDraft(req, res);

        const admin = isAdmin(req);
        const data = buildEmployeeData(req.body || {});

        // Reporting manager: must be a real employee with the Manager role
        if (req.body?.reportingManager !== undefined) {
            const m = await resolveManager(req.body.reportingManager, null);
            if (m.error) return res.status(400).json({ message: m.error });
            data.reportingManager = m.value;
        }

        const password = admin ? rawStr(req.body?.password) : "";

        if (req.files?.avatar?.[0]) data.avatar = `/uploads/${req.files.avatar[0].filename}`;
        if (!data.employeeId) data.employeeId = await nextEmployeeId();

        // Login access (login email, password, role) is created by the admin only
        if (admin) {
            if (!data.loginEmail && data.email) data.loginEmail = data.email;
        } else {
            delete data.loginEmail;
            delete data.role;
        }

        const missing = ["name", "email", "designation", "department"].filter((k) => !data[k]);
        if (missing.length) {
            return res.status(400).json({ message: `Required fields missing: ${missing.join(", ")}` });
        }

        const invalid = validateInput(data, { create: true });
        if (invalid) return res.status(400).json({ message: invalid });

        if (admin && !PASSWORD_REGEX.test(password)) {
            return res.status(400).json({ message: PASSWORD_MESSAGE });
        }

        const dupMessage = await findDuplicate(data);
        if (dupMessage) return res.status(409).json({ message: dupMessage });

        if (admin && (await loginEmailTaken(data.loginEmail))) {
            return res.status(409).json({ message: "A login account with this email already exists." });
        }

        const employee = new Employee();
        for (const [path, value] of Object.entries(data)) employee.set(path, value);
        saved = await employee.save();

        // Only the admin creates the login account. If it fails, the profile is rolled back (no half-created data).
        if (admin) {
            try {
                await User.create({
                    name: saved.name,
                    email: saved.loginEmail,
                    password: await hashPassword(password),
                    role: userRoleFrom(saved.role),
                    employee: saved._id,
                    isActive: isLoginActive(saved.employeeStatus),
                });
            } catch (userErr) {
                await Employee.deleteOne({ _id: saved._id }).catch(() => { });
                saved = null;
                throw userErr;
            }
        }

        await logActivity(
            req,
            admin
                ? `Created new employee profile and login: ${saved.name} (${saved.employeeId})`
                : `Created new employee profile: ${saved.name} (${saved.employeeId})`
        );

        // The response does not need the heavy base64 documents
        const out = saved.toObject();
        delete out.documents;

        return res.status(201).json({
            success: true,
            message: admin
                ? "Employee registered successfully. Login account created."
                : "Employee profile saved. An admin must add the login access before this employee can log in.",
            loginCreated: admin,
            employee: out,
            data: out,
        });
    } catch (error) {
        return handleError(res, error, "Failed to save employee.");
    }
};

// @route PUT /api/employees/:id  (admin / hr)
// body.onboardingStep = 1..5 -> one step of the step-by-step form. Without it: a normal edit.
// Login email, password and role can be changed by the admin only.
const updateEmployee = async (req, res) => {
    try {
        if (!canManage(req)) return deny(res, "Only admin or HR can update employees.");
        const admin = isAdmin(req);

        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(404).json({ message: "Employee record not found." });
        }

        // lean(): the raw saved values are read as they are (an old text manager value cannot break anything)
        const current = await Employee.findById(id)
            .select("_id name email loginEmail employeeId role employeeStatus reportingManager onboarding")
            .lean();
        if (!current) return res.status(404).json({ message: "Employee record not found." });

        /* which step is being saved, and how far the draft is */
        const step = Number(req.body?.onboardingStep) || 0; // 0 = a normal edit
        const lastStep = admin ? ADMIN_LAST_STEP : HR_LAST_STEP;
        const draftNow = current.onboarding?.status === "draft";
        const savedStep = draftNow ? Number(current.onboarding?.step) || 0 : ADMIN_LAST_STEP;

        if (step && (step < 1 || step > ADMIN_LAST_STEP)) return res.status(400).json({ message: "Invalid step." });
        if (step === ADMIN_LAST_STEP && !admin) return deny(res, "Only the admin can set the login access.");
        if (step && draftNow && step > savedStep + 1) {
            return res.status(400).json({ message: "Please save the earlier steps first." });
        }

        const data = buildEmployeeData(req.body || {});

        // Reporting manager: only checked when it really changed
        if (req.body?.reportingManager !== undefined) {
            const sent = idStr(req.body.reportingManager);
            if (sent && sent === idStr(current.reportingManager)) {
                delete data.reportingManager; // same as before: nothing to check, nothing to save
            } else {
                const m = await resolveManager(req.body.reportingManager, id);
                if (m.error) return res.status(400).json({ message: m.error });
                data.reportingManager = m.value;
            }
        }

        if (req.files?.avatar?.[0]) data.avatar = `/uploads/${req.files.avatar[0].filename}`;

        if (!admin) {
            // HR can never touch the login email or the role
            delete data.loginEmail;
            delete data.role;
        } else if (!data.loginEmail && !current.loginEmail && (data.email || current.email) && (!step || step >= ADMIN_LAST_STEP)) {
            // Old records without a login email: use the personal email
            data.loginEmail = data.email || current.email;
        }

        if (step) {
            const missing = missingForStep(step, data);
            if (missing.length) return res.status(400).json({ message: `Required fields missing: ${missing.join(", ")}` });
        }

        const invalid = validateInput(data, { step });
        if (invalid) return res.status(400).json({ message: invalid });

        const dupMessage = await findDuplicate(data, id);
        if (dupMessage) return res.status(409).json({ message: dupMessage });

        /* Check everything about the login account BEFORE saving anything */
        const newPassword = admin ? rawStr(req.body?.password) : "";
        if (newPassword && !PASSWORD_REGEX.test(newPassword)) {
            return res.status(400).json({ message: PASSWORD_MESSAGE });
        }

        const linkedUser = await findLinkedUser(current);
        if (step === ADMIN_LAST_STEP && !linkedUser && !newPassword) {
            return res.status(400).json({ message: "Password is required for the employee login." });
        }

        const loginEmailChanged = Boolean(
            admin &&
            data.loginEmail &&
            data.loginEmail !== lower(linkedUser?.email || current.loginEmail || current.email)
        );

        if (loginEmailChanged && (await loginEmailTaken(data.loginEmail, linkedUser?._id))) {
            return res.status(409).json({ message: "A login account with this email already exists." });
        }

        const newLoginEmail = data.loginEmail || current.loginEmail || data.email || current.email;
        if (!linkedUser && newPassword && (await loginEmailTaken(newLoginEmail))) {
            return res.status(409).json({ message: "A login account with this email already exists." });
        }

        /* Save the profile (and the progress of a draft) */
        const update = { $set: data };
        if (step && draftNow) {
            update.$max = { "onboarding.step": step };
            if (step >= lastStep) update.$set["onboarding.status"] = "complete"; // the last step of this role is saved
        }
        const updated = await Employee.findByIdAndUpdate(id, update, { returnDocument: "after", runValidators: true });

        /* Keep the login account in sync */
        let loginMessage = "";
        if (linkedUser) {
            const editingOwnLogin = String(linkedUser._id) === requesterId(req);
            const statusChanged = Boolean(data.employeeStatus && data.employeeStatus !== current.employeeStatus);
            const set = {};
            const unset = {};

            if (!linkedUser.employee) set.employee = updated._id;
            if (data.name) set.name = data.name;
            if (loginEmailChanged) set.email = data.loginEmail;
            // Role is admin only (it is already removed from the data for HR)
            if (data.role && !editingOwnLogin) set.role = userRoleFrom(data.role);

            // The login follows the employee status only when the status really changed.
            // HR can switch a login off (Inactive / Exited) but cannot switch it back on.
            if (statusChanged && !editingOwnLogin) {
                const active = isLoginActive(data.employeeStatus);
                if (admin || !active) set.isActive = active;
            }

            if (newPassword) {
                set.password = await hashPassword(newPassword);
                set.passwordChangedAt = new Date(); // old logins stop working
                unset.passwordResetToken = "";
                unset.passwordResetExpires = "";
                unset.passwordResetRequestedAt = "";
                loginMessage = " Password updated.";
            }

            const userUpdate = {};
            if (Object.keys(set).length) userUpdate.$set = set;
            if (Object.keys(unset).length) userUpdate.$unset = unset;
            if (Object.keys(userUpdate).length) await User.updateOne({ _id: linkedUser._id }, userUpdate);
        } else if (newPassword) {
            // Employee who never had a login (a draft, or added by HR): the admin creates it now
            await User.create({
                name: updated.name,
                email: updated.loginEmail || updated.email,
                password: await hashPassword(newPassword),
                role: userRoleFrom(updated.role),
                employee: updated._id,
                isActive: isLoginActive(updated.employeeStatus),
            });
            loginMessage = " Login account created.";
        }

        await logActivity(
            req,
            step
                ? `Saved step ${step} of employee profile: ${updated.name} (${updated.employeeId})`
                : `Updated employee profile: ${updated.name} (${updated.employeeId})`
        );

        const out = updated.toObject();
        delete out.documents;
        if (!admin) delete out.loginEmail;

        return res.status(200).json({
            success: true,
            message: `Employee updated successfully.${loginMessage}`,
            employee: out,
            data: out,
        });
    } catch (error) {
        return handleError(res, error, "Failed to update employee profile.");
    }
};

// @route GET /api/employees
const getEmployees = async (req, res, next) => {
    try {
        const role = roleOf(req);

        // Employee: only their own profile
        if (role === "employee") {
            const me = await findMyEmployee(req);
            if (!me) return res.status(200).json([]);
            const own = await attachManagerName(me); // reportingManager = the manager's name
            delete own.documents;
            delete own.bankDetails;
            return res.status(200).json([own]);
        }

        const { status, department, search } = req.query;
        const filter = {};

        if (status) filter.employeeStatus = String(status);
        if (department) filter.department = String(department);
        if (search && String(search).trim()) {
            const rx = new RegExp(escapeRegex(String(search).trim()), "i");
            filter.$or = [{ name: rx }, { email: rx }, { employeeId: rx }];
            if (isAdmin(req)) filter.$or.push({ loginEmail: rx }); // login email is searchable by the admin only
        }

        // Heavy base64 documents and bank details are never needed in the list.
        // Only the admin sees the login email. Managers also do not see salary, Aadhaar or PAN numbers.
        let hidden = "-documents -bankDetails";
        if (!isAdmin(req)) hidden += " -loginEmail";
        if (!canManage(req)) hidden += " -salary -idProofNumber -aadhaarNumber -panNumber";

        if (role === "manager") {
            // a manager sees only himself and the people who report to him
            const me = await myEmployee(req);
            const team = me ? await Employee.find(teamFilter(me)).select("_id").lean() : [];
            filter._id = { $in: me ? [me._id, ...team.map((t) => t._id)] : [] };
        }

        const employees = await Employee.find(filter).select(hidden).sort({ createdAt: -1 });

        // reportingManager keeps the id, reportingManagerName has the name (for tables and cards).
        // "onboarding" is included, so the list can show a Draft badge.
        return res.status(200).json(await attachManagerNames(employees));
    } catch (err) {
        next(err);
    }
};

// @route GET /api/employees/profile  (logged-in user's own profile)
const getMyProfile = async (req, res, next) => {
    try {
        const employee = await findMyEmployee(req);
        if (employee) return res.status(200).json(await attachManagerName(employee));

        // No linked employee profile (admin, HR, or an account that is not linked yet):
        // return the login details instead of a 404, so the app keeps working.
        return res.status(200).json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            hasEmployeeProfile: false,
        });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/employees/me   (a person edits their own contact details)
const updateMyProfile = async (req, res, next) => {
    try {
        const me = await findMyEmployee(req);
        if (!me) {
            return res.status(404).json({ message: "Your employee profile is not linked yet. Please contact HR." });
        }

        const set = {};

        if (req.body.phone !== undefined) {
            const phone = normalizePhone(req.body.phone);
            if (!PHONE_REGEX.test(phone)) {
                return res.status(400).json({
                    message: `Enter a valid ${PHONE_DIGITS}-digit phone number with the country code (for example, 919876543210).`,
                });
            }
            set.phone = phone;
        }
        if (req.body.address !== undefined) {
            const address = str(req.body.address);
            if (address.length < 5 || address.length > 200) {
                return res.status(400).json({ message: "Address must be 5 to 200 characters." });
            }
            set.address = address;
        }
        ["city", "state"].forEach((key) => {
            if (req.body[key] !== undefined) set[key] = str(req.body[key]);
            if (req.body.timeZone !== undefined) set.timeZone = str(req.body.timeZone).slice(0, 60);
        });
        if (req.body.pincode !== undefined) {
            const pincode = digits(req.body.pincode);
            if (!/^[1-9]\d{5}$/.test(pincode)) {
                return res.status(400).json({ message: "Pincode must be exactly 6 digits." });
            }
            set.pincode = pincode;
        }

        if (!Object.keys(set).length) return res.status(400).json({ message: "There is nothing to update." });

        const updated = await Employee.findByIdAndUpdate(
            me._id,
            { $set: set },
            { returnDocument: "after", runValidators: true }
        ).select("-documents");

        return res.status(200).json({ success: true, message: "Profile updated successfully.", employee: updated });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/employees/me  (dashboard ke liye halka: documents aur bank nahi)
const getMe = async (req, res, next) => {
    try {
        const employee = await findMyEmployee(req, "-documents -bankDetails");
        if (employee) return res.status(200).json(await attachManagerName(employee));

        return res.status(200).json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            hasEmployeeProfile: false,
        });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/employees/:id
const getEmployeeById = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: "Employee not found" });

        const manage = canManage(req);
        const self = isSelf(req, employee);

        if (!manage && !self) {
            if (roleOf(req) !== "manager") return deny(res, "You can only view your own profile.");
            const me = await myEmployee(req);
            const inTeam = me && (await Employee.exists({ $and: [teamFilter(me), { _id: employee._id }] }));
            if (!inTeam) return deny(res, "This employee is not in your team.");
        }

        let out = employee;
        if (!manage && !self) {
            // A manager viewing someone else does not get salary, bank, ID details or documents
            out = employee.toObject();
            SENSITIVE_FIELDS.forEach((k) => delete out[k]);
        }

        // The login email is shown to the admin and to the employee themselves only
        if (!isAdmin(req) && !self) {
            if (out === employee) out = employee.toObject();
            delete out.loginEmail;
        }

        // reportingManagerName: the edit page shows the manager by name (the id stays in reportingManager)
        const mgrRaw = idStr(out.reportingManager);
        let mgrName = "";
        if (OBJECT_ID.test(mgrRaw)) mgrName = (await Employee.findById(mgrRaw).select("name").lean())?.name || "";
        else mgrName = mgrRaw; // an old record that holds the name as text
        if (out === employee) out = employee.toObject();
        out.reportingManagerName = mgrName;

        // hasLogin: does this employee already have a login account? (the form needs it for the password rule)
        if (manage) out.hasLogin = Boolean(await findLinkedUser(employee));

        return res.status(200).json({ success: true, data: out, employee: out });
    } catch (error) {
        next(error);
    }
};

// @route DELETE /api/employees/:id  (admin / hr, the route allows admin only)
const deleteEmployee = async (req, res, next) => {
    try {
        if (!canManage(req)) return deny(res, "Only admin or HR can delete employees.");

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const employee = await Employee.findById(req.params.id);
        if (!employee) return res.status(404).json({ message: "Employee not found" });

        const linkedUser = await findLinkedUser(employee);
        if (linkedUser) {
            if (String(linkedUser._id) === requesterId(req)) {
                return deny(res, "You cannot delete your own account.");
            }
            if (linkedUser.role === "admin" && !isAdmin(req)) {
                return deny(res, "Only an admin can delete an admin account.");
            }
        }

        await Employee.deleteOne({ _id: employee._id });
        const released = await releaseTeam(employee);
        if (linkedUser) await User.deleteOne({ _id: linkedUser._id }); // login stops immediately

        await logActivity(req, `Deleted employee profile: ${employee.name}`);

        return res.status(200).json({
            message: released
                ? `Employee removed. ${released} people had this manager. Please assign them a new one.`
                : "Employee removed successfully",
            teamReleased: released,
        });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/employees/:id/exit  (admin / hr)
const exitEmployee = async (req, res, next) => {
    try {
        if (!canManage(req)) return deny(res, "Only admin or HR can process an exit.");

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const current = await Employee.findById(req.params.id).select("_id email loginEmail");
        if (!current) return res.status(404).json({ message: "Employee not found" });

        const linkedUser = await findLinkedUser(current);
        if (linkedUser && String(linkedUser._id) === requesterId(req)) {
            return deny(res, "You cannot process an exit for your own account.");
        }

        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    employeeStatus: "Exited",
                    exitDate: toDate(req.body?.exitDate) || new Date(),
                    exitReason:
                        str(req.body?.exitReason || req.body?.reason) || "Separated from organization",
                },
            },
            { returnDocument: "after" }
        ).select(isAdmin(req) ? "-documents" : "-documents -loginEmail");

        // Login is switched off, the history stays
        if (linkedUser) await User.updateOne({ _id: linkedUser._id }, { $set: { isActive: false } });

        const released = await releaseTeam(employee);
        const out = employee.toObject();
        out.teamReleased = released;

        await logActivity(req, `Processed exit for employee: ${employee.name}`);

        return res.status(200).json(out);
    } catch (err) {
        next(err);
    }
};

/* ----------------------------- team ----------------------------- */

const EMPTY = { members: 0, withLogin: 0, openTasks: 0, submitted: 0, overdue: 0, avgGoalProgress: 0 };
const nameOf = (map, v) => {
    if (!v) return "";
    const s = String(v._id || v);
    return map.get(s) || (mongoose.isValidObjectId(s) ? "" : s);
};

// @route GET /api/employees/team?manager=<employeeId>  (manager: own team. admin/hr: any manager's team)
const getTeam = async (req, res, next) => {
    try {
        if (!["admin", "hr", "manager"].includes(roleOf(req))) return deny(res, "Only managers, HR and admin can open a team.");

        let boss;
        if (canManage(req) && req.query.manager) {
            if (!mongoose.isValidObjectId(req.query.manager)) return res.status(400).json({ message: "Please select a valid manager." });
            boss = await Employee.findById(req.query.manager).select("_id name employeeId email");
        } else boss = await myEmployee(req);
        if (!boss) return res.json({ success: true, manager: null, summary: EMPTY, members: [], message: "No employee profile is linked to this login yet." });

        const list = await Employee.find(teamFilter(boss))
            .select("name employeeId email phone designation department employeeStatus dateOfJoining").sort({ name: 1 }).lean();
        const ids = list.map((e) => e._id);
        const emails = list.map((e) => lower(e.email)).filter(Boolean);

        const [users, deps, desigs] = await Promise.all([
            ids.length ? User.find({ $or: [{ employee: { $in: ids } }, { email: { $in: emails } }] }).select("_id employee email isActive").lean() : [],
            Department.find().select("name").lean(),
            Designation.find().select("title").lean(),
        ]);
        const byEmp = new Map(users.filter((u) => u.employee).map((u) => [String(u.employee), u]));
        const byMail = new Map(users.map((u) => [lower(u.email), u]));
        const userFor = (e) => byEmp.get(String(e._id)) || byMail.get(lower(e.email));
        const userIds = users.map((u) => u._id);

        const now = new Date();
        const [taskRows, goalRows] = await Promise.all([
            userIds.length
                ? Task.aggregate([
                    { $match: { assignedTo: { $in: userIds.map(oid) } } },
                    {
                        $group: {
                            _id: { u: "$assignedTo", s: "$status" }, n: { $sum: 1 },
                            late: { $sum: { $cond: [{ $and: [{ $eq: [{ $type: "$dueDate" }, "date"] }, { $lt: ["$dueDate", now] }, { $not: [{ $in: ["$status", ["completed", "cancelled"]] }] }] }, 1, 0] } }
                        }
                    },
                ])
                : [],
            ids.length
                ? Goal.aggregate([
                    { $match: { employee: { $in: ids } } },
                    { $group: { _id: "$employee", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }, avg: { $avg: "$progress" } } },
                ])
                : [],
        ]);

        const tasks = new Map();
        taskRows.forEach((r) => {
            const k = String(r._id.u);
            const t = tasks.get(k) || { open: 0, submitted: 0, completed: 0, overdue: 0 };
            if (["pending", "in-progress"].includes(r._id.s)) t.open += r.n;
            else if (r._id.s === "submitted") t.submitted += r.n;
            else if (r._id.s === "completed") t.completed += r.n;
            t.overdue += r.late;
            tasks.set(k, t);
        });
        const goals = new Map(goalRows.map((g) => [String(g._id), { total: g.total, completed: g.done, avgProgress: Math.round(g.avg || 0) }]));
        const dMap = new Map(deps.map((d) => [String(d._id), d.name]));
        const gMap = new Map(desigs.map((d) => [String(d._id), d.title]));

        const members = list.map((e) => {
            const u = userFor(e);
            return {
                _id: e._id, name: e.name, employeeId: e.employeeId, email: e.email, phone: e.phone, dateOfJoining: e.dateOfJoining,
                employeeStatus: e.employeeStatus || "Active",
                designation: nameOf(gMap, e.designation), department: nameOf(dMap, e.department),
                userId: u ? u._id : null, hasLogin: Boolean(u), loginActive: u ? u.isActive !== false : false,
                tasks: (u && tasks.get(String(u._id))) || { open: 0, submitted: 0, completed: 0, overdue: 0 },
                goals: goals.get(String(e._id)) || { total: 0, completed: 0, avgProgress: 0 },
            };
        });

        const sum = (f) => members.reduce((s, m) => s + f(m), 0);
        const withGoals = members.filter((m) => m.goals.total > 0);
        res.json({
            success: true, manager: { _id: boss._id, name: boss.name, employeeId: boss.employeeId },
            summary: {
                members: members.length, withLogin: members.filter((m) => m.hasLogin).length,
                openTasks: sum((m) => m.tasks.open), submitted: sum((m) => m.tasks.submitted), overdue: sum((m) => m.tasks.overdue),
                avgGoalProgress: withGoals.length ? Math.round(withGoals.reduce((s, m) => s + m.goals.avgProgress, 0) / withGoals.length) : 0,
            },
            members,
        });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/employees/manager-options  (admin / hr)
// People who can be a reporting manager = employees whose login role is in MANAGER_ROLES (name, id, reportee count).
// Drafts are left out: they have no login yet.
const getManagerOptions = async (req, res, next) => {
    try {
        if (!canManage(req)) return deny(res, "Only admin or HR can view the manager list.");

        const roleMatch = MANAGER_ROLES.map((r) => new RegExp(`^${r}$`, "i")); // "manager" and "Manager" both match
        const users = await User.find({ role: { $in: roleMatch }, isActive: { $ne: false } })
            .select("role email employee")
            .lean();
        if (!users.length) return res.json({ success: true, managers: [] });

        const refIds = users.map((u) => u.employee).filter(Boolean);
        const emails = users.map((u) => lower(u.email)).filter(Boolean);

        const employees = await Employee.find({
            "onboarding.status": { $ne: "draft" },
            $or: [{ _id: { $in: refIds } }, { email: { $in: emails } }, { loginEmail: { $in: emails } }],
        })
            .select("name employeeId email loginEmail employeeStatus")
            .lean();

        const roleByEmp = new Map();
        const roleByMail = new Map();
        users.forEach((u) => {
            if (u.employee) roleByEmp.set(String(u.employee), lower(u.role));
            if (u.email) roleByMail.set(lower(u.email), lower(u.role));
        });

        const managers = await Promise.all(
            employees
                .filter((e) => e.name && isLoginActive(e.employeeStatus))
                .map(async (e) => ({
                    _id: e._id,
                    name: e.name,
                    employeeId: e.employeeId || "",
                    role: roleByEmp.get(String(e._id)) || roleByMail.get(lower(e.loginEmail)) || roleByMail.get(lower(e.email)) || "",
                    reportees: await Employee.countDocuments(teamFilter(e)),
                }))
        );

        managers.sort((a, b) => a.name.localeCompare(b.name));
        res.json({ success: true, managers });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/employees/next-id  (admin / hr)  ->  { employeeId: "FPS0001" }
const getNextEmployeeId = async (req, res, next) => {
    try {
        if (!canManage(req)) return deny(res, "Only admin or HR can generate an employee ID.");
        res.json({ employeeId: await nextEmployeeId() });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/employees/assign-team  body: { manager: employeeId | "" , employees: [employeeId] }  (admin / hr)
const assignTeam = async (req, res, next) => {
    try {
        if (!canManage(req)) return deny(res, "Only admin or HR can assign a team.");
        const ids = [...new Set((req.body?.employees || []).map(String))].filter((i) => mongoose.isValidObjectId(i));
        if (!ids.length) return res.status(400).json({ message: "Please select at least one employee." });
        if (ids.length > 200) return res.status(400).json({ message: "Please select up to 200 employees at a time." });

        const m = await resolveManager(req.body?.manager, null);
        if (m.error) return res.status(400).json({ message: m.error });
        if (m.boss) {
            if (ids.includes(String(m.boss._id))) return res.status(400).json({ message: "A manager cannot be in his own team." });
            const up = await ancestors(m.boss);
            if (ids.some((i) => up.has(i))) return res.status(400).json({ message: "One of the selected people is above this manager. That would make a loop." });
        }

        const r = await Employee.updateMany({ _id: { $in: ids } }, { $set: { reportingManager: m.value } });
        await logActivity(req, m.boss ? `Assigned ${r.modifiedCount} employees to manager ${m.boss.name}` : `Removed the reporting manager of ${r.modifiedCount} employees`);
        res.json({ success: true, updated: r.modifiedCount, message: m.boss ? `${r.modifiedCount} employees now report to ${m.boss.name}.` : `${r.modifiedCount} employees have no manager now.` });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getEmployees,
    getMyProfile,
    updateMyProfile,
    getMe,
    getEmployeeById,
    getEmployee: getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    exitEmployee,
    getTeam,
    getManagerOptions,
    getNextEmployeeId,
    assignTeam,
};




// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const Employee = require("../models/Employee");
// const User = require("../models/User");
// const ActivityLog = require("../models/activityLogModel");
// const Task = require("../models/Task");
// const Goal = require("../models/Goal");
// const Department = require("../models/Department");
// const Designation = require("../models/Designation");
// const { myEmployee, teamFilter } = require("../utils/teamScope");
// const { attachManagerName, attachManagerNames, managerNameOf } = require("../utils/reportingManager");


// const GENDERS = ["male", "female", "other"];
// const ROLES = ["Employee", "Manager", "HR", "Admin"];
// const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
// const PASSWORD_MESSAGE =
//     "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number.";
// const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
// const AADHAAR_REGEX = /^[2-9]\d{11}$/;
// const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
// const CI = { locale: "en", strength: 2 }; // case-insensitive email match

// const ID_PREFIX = "FPS"; // employee ids: FPS0001, FPS0002 ...
// const OBJECT_ID = /^[a-f\d]{24}$/i; // mongoose.isValidObjectId is too loose (it accepts any 12 character text)

// /* Login roles that can be a reporting manager. Add "hr" and "admin" here if they should be allowed too. */
// const MANAGER_ROLES = ["manager"];

// /* ----------------------------- helpers ----------------------------- */

// const str = (v) => (v === undefined || v === null ? "" : String(v).trim());
// const rawStr = (v) => (v === undefined || v === null ? "" : String(v)); // base64 and passwords (no trim)
// const lower = (v) => str(v).toLowerCase();
// const upper = (v) => str(v).toUpperCase();
// const digits = (v) => str(v).replace(/\D/g, "");

// // id ya {_id} object ho to usse plain string bana do
// const refString = (v) => {
//     if (v && typeof v === "object") return String(v._id || v.id || "").trim();
//     return str(v);
// };

// // ObjectId, populated object or text -> plain string (used to compare ids)
// const idStr = (v) => String(v?._id || v || "").trim();

// const toDate = (v) => {
//     if (!v) return null;
//     const d = new Date(v);
//     return Number.isNaN(d.getTime()) ? null : d;
// };

// const normalizeStatus = (v) => {
//     const s = str(v);
//     const l = s.toLowerCase();
//     return l === "exit" || l === "exited" ? "Exited" : s;
// };

// const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// /* Fields that managers must not see (admin and HR can) */
// const SENSITIVE_FIELDS = ["salary", "bankDetails", "documents", "idProofNumber", "aadhaarNumber", "panNumber"];

// /* ------------------------- role and access ------------------------- */

// const roleOf = (req) => lower(req.user?.role);
// const isAdmin = (req) => roleOf(req) === "admin"; // login access (login email, password, role) is admin only
// const canManage = (req) => ["admin", "hr"].includes(roleOf(req)); // profile: create, update, delete, exit
// const deny = (res, message = "You are not allowed to perform this action.") =>
//     res.status(403).json({ message });

// const requesterId = (req) => String(req.user?._id || req.user?.id || "");

// // Is this employee profile the logged-in user's own profile?
// const isSelf = (req, emp) => {
//     if (!emp) return false;
//     const linked = req.user?.employee ? String(req.user.employee._id || req.user.employee) : "";
//     if (linked && linked === String(emp._id)) return true;
//     const email = lower(req.user?.email);
//     return Boolean(email) && [emp.email, emp.loginEmail].some((e) => lower(e) === email);
// };

// // Logged-in user's own employee profile
// const findMyEmployee = async (req, select = "") => {
//     const linked = req.user?.employee ? req.user.employee._id || req.user.employee : null;
//     if (linked && mongoose.isValidObjectId(linked)) {
//         const byLink = await Employee.findById(linked).select(select);
//         if (byLink) return byLink;
//     }
//     const email = lower(req.user?.email);
//     if (!email) return null;
//     return Employee.findOne({ $or: [{ email }, { loginEmail: email }] }).select(select);
// };

// /* --------------------------- login account --------------------------- */

// const findUserByEmail = (email) => User.findOne({ email }).collation(CI);

// const loginEmailTaken = async (email, exceptUserId) => {
//     const found = await findUserByEmail(email).select("_id");
//     return Boolean(found && (!exceptUserId || String(found._id) !== String(exceptUserId)));
// };

// // The User (login account) that belongs to this employee profile
// const findLinkedUser = async (employee) => {
//     const byRef = await User.findOne({ employee: employee._id });
//     if (byRef) return byRef;

//     const emails = [employee.loginEmail, employee.email].map(lower).filter(Boolean);
//     for (const email of emails) {
//         const byEmail = await findUserByEmail(email);
//         if (byEmail && (!byEmail.employee || String(byEmail.employee) === String(employee._id))) {
//             return byEmail;
//         }
//     }
//     return null;
// };

// const hashPassword = (password) => bcrypt.hash(password, 10);
// const userRoleFrom = (role) => lower(role || "Employee");
// const isLoginActive = (status) => !["inactive", "exited"].includes(lower(status));

// /* ------------------------------ misc ------------------------------ */

// const logActivity = async (req, action) => {
//     try {
//         if (!ActivityLog) return;
//         await ActivityLog.create({
//             user: req.user?.id || req.user?._id || null,
//             action,
//             module: "Employee",
//         });
//     } catch (err) {
//         console.error("Activity log error:", err.message);
//     }
// };

// /* ----------------------------- reporting manager ----------------------------- */

// /* works whether the schema stores the manager as an ObjectId (recommended) or as text */
// const mgrIsObjectId = () => Employee.schema.path("reportingManager")?.instance === "ObjectId";
// const oid = (x) => new mongoose.Types.ObjectId(String(x));

// /* the manager, his manager, his manager's manager... used to stop loops (A reports to B, B reports to A) */
// async function ancestors(boss) {
//     const out = new Set();
//     let cur = boss;
//     for (let i = 0; i < 15 && cur; i++) {
//         out.add(String(cur._id));
//         const upId = idStr(cur.reportingManager);
//         // chain ends at an empty value or at an old text value like "Sanjay Sir" (it is not an id, so it is never looked up)
//         if (!mgrIsObjectId() || !OBJECT_ID.test(upId) || out.has(upId)) break;
//         cur = await Employee.findById(upId).select("reportingManager").lean();
//     }
//     return out;
// }

// /* accepts an id (normal), or an employee id / name (old forms). Returns { value, boss } to save, or { error }. */
// async function resolveManager(input, selfId) {
//     const raw = refString(input);
//     if (!raw || raw === "null" || raw === "undefined") return { value: mgrIsObjectId() ? null : "" };

//     const pick = "_id name employeeId email loginEmail employeeStatus reportingManager";
//     let boss = null;

//     if (OBJECT_ID.test(raw)) {
//         boss = await Employee.findById(raw).select(pick).lean();
//     } else {
//         const noTitle = raw.replace(/\s+(sir|madam|mam|ma'am)$/i, "");
//         const names = [...new Set([raw, noTitle])].map(escapeRegex).join("|");
//         const found = await Employee.find({
//             $or: [{ employeeId: raw.toUpperCase() }, { name: new RegExp(`^(${names})$`, "i") }],
//         })
//             .select(pick)
//             .limit(2)
//             .lean();
//         if (found.length > 1) return { error: `More than one person is called "${raw}". Please choose the manager from the list.` };
//         boss = found[0] || null;
//     }

//     if (!boss) return { error: "The selected reporting manager was not found." };
//     if (selfId && String(boss._id) === String(selfId)) return { error: "An employee cannot report to themselves." };
//     if (!isLoginActive(boss.employeeStatus)) return { error: `${boss.name} is inactive or has left the company.` };

//     const login = await findLinkedUser(boss);
//     if (!login) return { error: `${boss.name} has no login account yet. Ask the admin to create it first.` };
//     if (!MANAGER_ROLES.includes(lower(login.role))) {
//         return { error: `${boss.name} does not have the Manager role. Ask the admin to set his Access Role to Manager.` };
//     }
//     if (selfId && (await ancestors(boss)).has(String(selfId))) {
//         return { error: `${boss.name} already reports to this employee. That would make a loop.` };
//     }

//     return { value: mgrIsObjectId() ? boss._id : boss.name, boss };
// }

// /* when a manager leaves or is deleted his people must not keep pointing at him */
// async function releaseTeam(boss) {
//     const filter = mgrIsObjectId()
//         ? { reportingManager: boss._id }
//         : { reportingManager: new RegExp(`^\\s*(${escapeRegex(boss.name)}|${escapeRegex(boss.employeeId || "~")})\\s*$`, "i") };
//     const r = await Employee.updateMany(filter, { $set: { reportingManager: mgrIsObjectId() ? null : "" } });
//     return r.modifiedCount || 0;
// }

// /* ----------------------------- errors and ids ----------------------------- */

// const handleError = (res, error, fallbackMessage) => {
//     console.error(fallbackMessage, error);

//     if (error.name === "ValidationError") {
//         const message = Object.values(error.errors).map((e) => e.message).join(", ");
//         return res.status(400).json({ message });
//     }
//     if (error.name === "CastError") {
//         // for example an old text value saved in an id field
//         return res.status(400).json({ message: `Invalid value for "${error.path}". Please select it again.` });
//     }
//     if (error.code === 11000) {
//         const field = Object.keys(error.keyPattern || {})[0] || "field";
//         return res.status(409).json({ message: `A record with this ${field} already exists.` });
//     }
//     return res.status(500).json({ message: fallbackMessage });
// };

// /* Next employee id: FPS0001, FPS0002 ... (highest existing FPS number + 1). Old ids like EMP0001 are ignored. */
// const nextEmployeeId = async () => {
//     const rows = await Employee.find({ employeeId: new RegExp(`^${ID_PREFIX}\\d+$`, "i") })
//         .select("employeeId")
//         .lean();
//     let max = 0;
//     rows.forEach((r) => {
//         const n = Number(String(r.employeeId).slice(ID_PREFIX.length));
//         if (n > max) max = n;
//     });
//     return `${ID_PREFIX}${String(max + 1).padStart(4, "0")}`;
// };

// /**
//  * Request body -> schema fields (dot-path object).
//  * Only keys that were sent are returned, so a partial update never wipes other data.
//  * "password" is never copied here: it belongs to the User model, not Employee.
//  */
// const buildEmployeeData = (body = {}) => {
//     const data = {};
//     const bank = body.bankDetails || {};
//     const docs = body.documents || {};

//     const setIf = (path, value, fn = str, skipEmpty = false) => {
//         if (value === undefined) return;
//         const out = fn(value);
//         if (skipEmpty && (out === "" || out === null)) return;
//         data[path] = out;
//     };
//     const flatOrNested = (flat, nested) => (body[flat] !== undefined ? body[flat] : nested);

//     /* Personal */
//     setIf("employeeId", body.employeeId, upper, true);
//     setIf("firstName", body.firstName);
//     setIf("lastName", body.lastName);
//     setIf("name", body.name, str, true);
//     if (data.name === undefined && (body.firstName !== undefined || body.lastName !== undefined)) {
//         const full = `${str(body.firstName)} ${str(body.lastName)}`.trim();
//         if (full) data.name = full;
//     }
//     setIf("email", body.email, lower, true);
//     setIf("loginEmail", body.loginEmail, lower, true);
//     setIf("phone", body.phone);
//     setIf("gender", body.gender, lower, true);
//     if (data.gender && !GENDERS.includes(data.gender)) delete data.gender;
//     setIf("timeZone", body.timeZone);
//     setIf("avatar", body.avatar, rawStr);

//     /* Address */
//     setIf("address", body.address);
//     setIf("city", body.city);
//     setIf("state", body.state);
//     setIf("pincode", body.pincode);

//     /* Job */
//     setIf("designation", body.designation, refString, true);
//     setIf("department", body.department, refString, true);
//     setIf("reportingManager", body.reportingManager, refString); // checked and replaced by resolveManager in create / update
//     setIf("employmentType", body.employmentType, str, true);
//     setIf("employeeStatus", body.employeeStatus, normalizeStatus, true);
//     setIf("role", body.role, str, true);
//     if (data.role && !ROLES.includes(data.role)) delete data.role;
//     setIf("dateOfJoining", body.dateOfJoining, toDate);
//     setIf("salary", body.salary, (v) => Number(v) || 0);

//     /* Exit */
//     setIf("exitDate", body.exitDate, toDate);
//     setIf("exitReason", body.exitReason);

//     /* Identity */
//     setIf("nationalIdType", body.nationalIdType);
//     setIf("nationalIdOther", body.nationalIdOther);
//     setIf("aadhaarNumber", body.aadhaarNumber, digits);
//     setIf("panNumber", body.panNumber, upper);
//     setIf("idProofNumber", body.idProofNumber !== undefined ? body.idProofNumber : body.nationalId, upper);
//     // Older forms only sent one ID number. The Aadhaar number is the main ID.
//     if (data.aadhaarNumber && data.idProofNumber === undefined) data.idProofNumber = data.aadhaarNumber;

//     /* Bank */
//     ["accountName", "bankName", "branchName", "accountNumber"].forEach((k) =>
//         setIf(`bankDetails.${k}`, flatOrNested(k, bank[k]))
//     );
//     setIf("bankDetails.ifscCode", flatOrNested("ifscCode", bank.ifscCode), upper);

//     /* Documents (base64 images) */
//     [
//         "nationalIdFrontFileName",
//         "nationalIdFrontFileData",
//         "nationalIdBackFileName",
//         "nationalIdBackFileData",
//         "panCardFileName",
//         "panCardFileData",
//         "passportPhotoFileName",
//         "passportPhotoData",
//     ].forEach((k) => setIf(`documents.${k}`, docs[k] !== undefined ? docs[k] : body[k], rawStr));

//     return data;
// };

// /* Format checks done on the server, because the browser can be bypassed */
// const validateInput = (data, isCreate) => {
//     if (data.email && !EMAIL_REGEX.test(data.email)) return "Please enter a valid personal email address.";
//     if (data.loginEmail && !EMAIL_REGEX.test(data.loginEmail)) return "Please enter a valid login email address.";

//     if (isCreate || data.aadhaarNumber) {
//         if (!AADHAAR_REGEX.test(data.aadhaarNumber || "")) {
//             return "Aadhaar number must be 12 digits and cannot start with 0 or 1.";
//         }
//     }
//     if (isCreate || data.panNumber) {
//         if (!PAN_REGEX.test(data.panNumber || "")) {
//             return "Enter a valid PAN number (for example, ABCDE1234F).";
//         }
//     }
//     return null;
// };

// // employeeId / emails / Aadhaar / PAN duplicate check
// const findDuplicate = async (data, excludeId) => {
//     const notSelf = excludeId ? { _id: { $ne: excludeId } } : {};
//     const checks = [];

//     if (data.employeeId) checks.push([{ employeeId: data.employeeId }, "Employee ID", data.employeeId]);
//     if (data.email) checks.push([{ email: data.email }, "Personal email", data.email]);
//     if (data.loginEmail) {
//         checks.push([
//             { $or: [{ loginEmail: data.loginEmail }, { email: data.loginEmail }] },
//             "Login email",
//             data.loginEmail,
//         ]);
//     }
//     if (data.aadhaarNumber) {
//         checks.push([
//             { $or: [{ aadhaarNumber: data.aadhaarNumber }, { idProofNumber: data.aadhaarNumber }] },
//             "Aadhaar number",
//             data.aadhaarNumber,
//         ]);
//     } else if (data.idProofNumber) {
//         checks.push([{ idProofNumber: data.idProofNumber }, "Document ID number", data.idProofNumber]);
//     }
//     if (data.panNumber) {
//         checks.push([
//             { $or: [{ panNumber: data.panNumber }, { idProofNumber: data.panNumber }] },
//             "PAN number",
//             data.panNumber,
//         ]);
//     }

//     for (const [filter, label, value] of checks) {
//         const dup = await Employee.exists({ ...filter, ...notSelf });
//         if (dup) return `${label} "${value}" is already registered with another employee.`;
//     }
//     return null;
// };

// /* ----------------------------- handlers ----------------------------- */

// // @route POST /api/employees  (admin / hr)
// // Admin: profile + login account. HR: profile only (the admin adds the login later).
// const createEmployee = async (req, res) => {
//     let saved = null;
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can add employees.");
//         const admin = isAdmin(req);

//         const data = buildEmployeeData(req.body || {});

//         // Reporting manager: must be a real employee with the Manager role
//         if (req.body?.reportingManager !== undefined) {
//             const m = await resolveManager(req.body.reportingManager, null);
//             if (m.error) return res.status(400).json({ message: m.error });
//             data.reportingManager = m.value;
//         }

//         const password = admin ? rawStr(req.body?.password) : "";

//         if (req.files?.avatar?.[0]) data.avatar = `/uploads/${req.files.avatar[0].filename}`;
//         if (!data.employeeId) data.employeeId = await nextEmployeeId();

//         // Login access (login email, password, role) is created by the admin only
//         if (admin) {
//             if (!data.loginEmail && data.email) data.loginEmail = data.email;
//         } else {
//             delete data.loginEmail;
//             delete data.role;
//         }

//         const missing = ["name", "email", "designation", "department"].filter((k) => !data[k]);
//         if (missing.length) {
//             return res.status(400).json({ message: `Required fields missing: ${missing.join(", ")}` });
//         }

//         const invalid = validateInput(data, true);
//         if (invalid) return res.status(400).json({ message: invalid });

//         if (admin && !PASSWORD_REGEX.test(password)) {
//             return res.status(400).json({ message: PASSWORD_MESSAGE });
//         }

//         const dupMessage = await findDuplicate(data);
//         if (dupMessage) return res.status(409).json({ message: dupMessage });

//         if (admin && (await loginEmailTaken(data.loginEmail))) {
//             return res.status(409).json({ message: "A login account with this email already exists." });
//         }

//         const employee = new Employee();
//         for (const [path, value] of Object.entries(data)) employee.set(path, value);
//         saved = await employee.save();

//         // Only the admin creates the login account. If it fails, the profile is rolled back (no half-created data).
//         if (admin) {
//             try {
//                 await User.create({
//                     name: saved.name,
//                     email: saved.loginEmail,
//                     password: await hashPassword(password),
//                     role: userRoleFrom(saved.role),
//                     employee: saved._id,
//                     isActive: isLoginActive(saved.employeeStatus),
//                 });
//             } catch (userErr) {
//                 await Employee.deleteOne({ _id: saved._id }).catch(() => { });
//                 saved = null;
//                 throw userErr;
//             }
//         }

//         await logActivity(
//             req,
//             admin
//                 ? `Created new employee profile and login: ${saved.name} (${saved.employeeId})`
//                 : `Created new employee profile: ${saved.name} (${saved.employeeId})`
//         );

//         // The response does not need the heavy base64 documents
//         const out = saved.toObject();
//         delete out.documents;

//         return res.status(201).json({
//             success: true,
//             message: admin
//                 ? "Employee registered successfully. Login account created."
//                 : "Employee profile saved. An admin must add the login access before this employee can log in.",
//             loginCreated: admin,
//             employee: out,
//             data: out,
//         });
//     } catch (error) {
//         return handleError(res, error, "Failed to save employee.");
//     }
// };

// // @route PUT /api/employees/:id  (admin / hr)
// // Login email, password and role can be changed by the admin only.
// const updateEmployee = async (req, res) => {
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can update employees.");
//         const admin = isAdmin(req);

//         const { id } = req.params;
//         if (!mongoose.isValidObjectId(id)) {
//             return res.status(404).json({ message: "Employee record not found." });
//         }

//         // lean(): the raw saved values are read as they are (an old text manager value cannot break anything)
//         const current = await Employee.findById(id)
//             .select("_id name email loginEmail employeeId role employeeStatus reportingManager")
//             .lean();
//         if (!current) return res.status(404).json({ message: "Employee record not found." });

//         const data = buildEmployeeData(req.body || {});

//         // Reporting manager: only checked when it really changed
//         if (req.body?.reportingManager !== undefined) {
//             const sent = idStr(req.body.reportingManager);
//             if (sent && sent === idStr(current.reportingManager)) {
//                 delete data.reportingManager; // same as before: nothing to check, nothing to save
//             } else {
//                 const m = await resolveManager(req.body.reportingManager, id);
//                 if (m.error) return res.status(400).json({ message: m.error });
//                 data.reportingManager = m.value;
//             }
//         }

//         if (req.files?.avatar?.[0]) data.avatar = `/uploads/${req.files.avatar[0].filename}`;

//         if (!admin) {
//             // HR can never touch the login email or the role
//             delete data.loginEmail;
//             delete data.role;
//         } else if (!data.loginEmail && !current.loginEmail && (data.email || current.email)) {
//             // Old records without a login email: use the personal email
//             data.loginEmail = data.email || current.email;
//         }

//         const invalid = validateInput(data, false);
//         if (invalid) return res.status(400).json({ message: invalid });

//         const dupMessage = await findDuplicate(data, id);
//         if (dupMessage) return res.status(409).json({ message: dupMessage });

//         /* Check everything about the login account BEFORE saving anything */
//         const newPassword = admin ? rawStr(req.body?.password) : "";
//         if (newPassword && !PASSWORD_REGEX.test(newPassword)) {
//             return res.status(400).json({ message: PASSWORD_MESSAGE });
//         }

//         const linkedUser = await findLinkedUser(current);
//         const loginEmailChanged = Boolean(
//             admin &&
//             data.loginEmail &&
//             data.loginEmail !== lower(linkedUser?.email || current.loginEmail || current.email)
//         );

//         if (loginEmailChanged && (await loginEmailTaken(data.loginEmail, linkedUser?._id))) {
//             return res.status(409).json({ message: "A login account with this email already exists." });
//         }

//         const newLoginEmail = data.loginEmail || current.loginEmail || data.email || current.email;
//         if (!linkedUser && newPassword && (await loginEmailTaken(newLoginEmail))) {
//             return res.status(409).json({ message: "A login account with this email already exists." });
//         }

//         /* Save the profile */
//         const updated = await Employee.findByIdAndUpdate(
//             id,
//             { $set: data },
//             { returnDocument: "after", runValidators: true }
//         );

//         /* Keep the login account in sync */
//         let loginMessage = "";
//         if (linkedUser) {
//             const editingOwnLogin = String(linkedUser._id) === requesterId(req);
//             const statusChanged = Boolean(data.employeeStatus && data.employeeStatus !== current.employeeStatus);
//             const set = {};
//             const unset = {};

//             if (!linkedUser.employee) set.employee = updated._id;
//             if (data.name) set.name = data.name;
//             if (loginEmailChanged) set.email = data.loginEmail;
//             // Role is admin only (it is already removed from the data for HR)
//             if (data.role && !editingOwnLogin) set.role = userRoleFrom(data.role);

//             // The login follows the employee status only when the status really changed.
//             // HR can switch a login off (Inactive / Exited) but cannot switch it back on.
//             if (statusChanged && !editingOwnLogin) {
//                 const active = isLoginActive(data.employeeStatus);
//                 if (admin || !active) set.isActive = active;
//             }

//             if (newPassword) {
//                 set.password = await hashPassword(newPassword);
//                 set.passwordChangedAt = new Date(); // old logins stop working
//                 unset.passwordResetToken = "";
//                 unset.passwordResetExpires = "";
//                 unset.passwordResetRequestedAt = "";
//                 loginMessage = " Password updated.";
//             }

//             const update = {};
//             if (Object.keys(set).length) update.$set = set;
//             if (Object.keys(unset).length) update.$unset = unset;
//             if (Object.keys(update).length) await User.updateOne({ _id: linkedUser._id }, update);
//         } else if (newPassword) {
//             // Employee who never had a login (for example, added by HR): the admin creates it now
//             await User.create({
//                 name: updated.name,
//                 email: updated.loginEmail || updated.email,
//                 password: await hashPassword(newPassword),
//                 role: userRoleFrom(updated.role),
//                 employee: updated._id,
//                 isActive: isLoginActive(updated.employeeStatus),
//             });
//             loginMessage = " Login account created.";
//         }

//         await logActivity(req, `Updated employee profile: ${updated.name} (${updated.employeeId})`);

//         const out = updated.toObject();
//         delete out.documents;
//         if (!admin) delete out.loginEmail;

//         return res.status(200).json({
//             success: true,
//             message: `Employee updated successfully.${loginMessage}`,
//             employee: out,
//             data: out,
//         });
//     } catch (error) {
//         return handleError(res, error, "Failed to update employee profile.");
//     }
// };

// // @route GET /api/employees
// // const getEmployees = async (req, res, next) => {
// //     try {
// //         const role = roleOf(req);

// //         // Employee: only their own profile
// //         if (role === "employee") {
// //             const me = await findMyEmployee(req);
// //             if (!me) return res.status(200).json([]);
// //             const own = me.toObject();
// //             delete own.documents;
// //             delete own.bankDetails;
// //             return res.status(200).json([own]);
// //         }

// //         const { status, department, search } = req.query;
// //         const filter = {};

// //         if (status) filter.employeeStatus = String(status);
// //         if (department) filter.department = String(department);
// //         if (search && String(search).trim()) {
// //             const rx = new RegExp(escapeRegex(String(search).trim()), "i");
// //             filter.$or = [{ name: rx }, { email: rx }, { employeeId: rx }];
// //             if (isAdmin(req)) filter.$or.push({ loginEmail: rx }); // login email is searchable by the admin only
// //         }

// //         // Heavy base64 documents and bank details are never needed in the list.
// //         // Only the admin sees the login email. Managers also do not see salary, Aadhaar or PAN numbers.
// //         let hidden = "-documents -bankDetails";
// //         if (!isAdmin(req)) hidden += " -loginEmail";
// //         if (!canManage(req)) hidden += " -salary -idProofNumber -aadhaarNumber -panNumber";

// //         if (role === "manager") {
// //             // a manager sees only himself and the people who report to him
// //             const me = await myEmployee(req);
// //             const team = me ? await Employee.find(teamFilter(me)).select("_id").lean() : [];
// //             filter._id = { $in: me ? [me._id, ...team.map((t) => t._id)] : [] };
// //         }

// //         const employees = await Employee.find(filter).select(hidden).sort({ createdAt: -1 });

// //         return res.status(200).json(employees);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // @route GET /api/employees
// const getEmployees = async (req, res, next) => {
//     try {
//         const role = roleOf(req);

//         // Employee: only their own profile
//         if (role === "employee") {
//             const me = await findMyEmployee(req);
//             if (!me) return res.status(200).json([]);
//             const own = await attachManagerName(me); // reportingManager = the manager's name
//             delete own.documents;
//             delete own.bankDetails;
//             return res.status(200).json([own]);
//         }

//         const { status, department, search } = req.query;
//         const filter = {};

//         if (status) filter.employeeStatus = String(status);
//         if (department) filter.department = String(department);
//         if (search && String(search).trim()) {
//             const rx = new RegExp(escapeRegex(String(search).trim()), "i");
//             filter.$or = [{ name: rx }, { email: rx }, { employeeId: rx }];
//             if (isAdmin(req)) filter.$or.push({ loginEmail: rx }); // login email is searchable by the admin only
//         }

//         // Heavy base64 documents and bank details are never needed in the list.
//         // Only the admin sees the login email. Managers also do not see salary, Aadhaar or PAN numbers.
//         let hidden = "-documents -bankDetails";
//         if (!isAdmin(req)) hidden += " -loginEmail";
//         if (!canManage(req)) hidden += " -salary -idProofNumber -aadhaarNumber -panNumber";

//         if (role === "manager") {
//             // a manager sees only himself and the people who report to him
//             const me = await myEmployee(req);
//             const team = me ? await Employee.find(teamFilter(me)).select("_id").lean() : [];
//             filter._id = { $in: me ? [me._id, ...team.map((t) => t._id)] : [] };
//         }

//         const employees = await Employee.find(filter).select(hidden).sort({ createdAt: -1 });

//         // reportingManager keeps the id, reportingManagerName has the name (for tables and cards)
//         return res.status(200).json(await attachManagerNames(employees));
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/employees/profile and /api/employees/me  (logged-in user's own profile)
// // const getMyProfile = async (req, res, next) => {
// //     try {
// //         const employee = await findMyEmployee(req);
// //         if (employee) return res.status(200).json(employee);

// //         // No linked employee profile (admin, HR, or an account that is not linked yet):
// //         // return the login details instead of a 404, so the app keeps working.
// //         return res.status(200).json({
// //             _id: req.user._id,
// //             name: req.user.name,
// //             email: req.user.email,
// //             role: req.user.role,
// //             hasEmployeeProfile: false,
// //         });
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // @route GET /api/employees/profile  (logged-in user's own profile)
// const getMyProfile = async (req, res, next) => {
//     try {
//         const employee = await findMyEmployee(req);
//         if (employee) return res.status(200).json(await attachManagerName(employee));

//         // No linked employee profile (admin, HR, or an account that is not linked yet):
//         // return the login details instead of a 404, so the app keeps working.
//         return res.status(200).json({
//             _id: req.user._id,
//             name: req.user.name,
//             email: req.user.email,
//             role: req.user.role,
//             hasEmployeeProfile: false,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/employees/me   (a person edits their own contact details)
// const updateMyProfile = async (req, res, next) => {
//     try {
//         const me = await findMyEmployee(req);
//         if (!me) {
//             return res.status(404).json({ message: "Your employee profile is not linked yet. Please contact HR." });
//         }

//         const set = {};

//         if (req.body.phone !== undefined) {
//             const phone = digits(req.body.phone).slice(-10);
//             if (!/^[6-9]\d{9}$/.test(phone)) {
//                 return res.status(400).json({ message: "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9." });
//             }
//             set.phone = phone;
//         }
//         if (req.body.address !== undefined) {
//             const address = str(req.body.address);
//             if (address.length < 5 || address.length > 200) {
//                 return res.status(400).json({ message: "Address must be 5 to 200 characters." });
//             }
//             set.address = address;
//         }
//         ["city", "state"].forEach((key) => {
//             if (req.body[key] !== undefined) set[key] = str(req.body[key]);
//         });
//         if (req.body.pincode !== undefined) {
//             const pincode = digits(req.body.pincode);
//             if (!/^[1-9]\d{5}$/.test(pincode)) {
//                 return res.status(400).json({ message: "Pincode must be exactly 6 digits." });
//             }
//             set.pincode = pincode;
//         }

//         if (!Object.keys(set).length) return res.status(400).json({ message: "There is nothing to update." });

//         const updated = await Employee.findByIdAndUpdate(
//             me._id,
//             { $set: set },
//             { returnDocument: "after", runValidators: true }
//         ).select("-documents");

//         return res.status(200).json({ success: true, message: "Profile updated successfully.", employee: updated });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/employees/me  (dashboard ke liye halka: documents aur bank nahi)
// // const getMe = async (req, res, next) => {
// //     try {
// //         const employee = await findMyEmployee(req, "-documents -bankDetails");
// //         if (employee) return res.status(200).json(employee);

// //         return res.status(200).json({
// //             _id: req.user._id,
// //             name: req.user.name,
// //             email: req.user.email,
// //             role: req.user.role,
// //             hasEmployeeProfile: false,
// //         });
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // @route GET /api/employees/me  (dashboard ke liye halka: documents aur bank nahi)
// const getMe = async (req, res, next) => {
//     try {
//         const employee = await findMyEmployee(req, "-documents -bankDetails");
//         if (employee) return res.status(200).json(await attachManagerName(employee));

//         return res.status(200).json({
//             _id: req.user._id,
//             name: req.user.name,
//             email: req.user.email,
//             role: req.user.role,
//             hasEmployeeProfile: false,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/employees/:id
// const getEmployeeById = async (req, res, next) => {
//     try {
//         if (!mongoose.isValidObjectId(req.params.id)) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         const employee = await Employee.findById(req.params.id);
//         if (!employee) return res.status(404).json({ message: "Employee not found" });

//         const manage = canManage(req);
//         const self = isSelf(req, employee);

//         if (!manage && !self) {
//             if (roleOf(req) !== "manager") return deny(res, "You can only view your own profile.");
//             const me = await myEmployee(req);
//             const inTeam = me && (await Employee.exists({ $and: [teamFilter(me), { _id: employee._id }] }));
//             if (!inTeam) return deny(res, "This employee is not in your team.");
//         }

//         let out = employee;
//         if (!manage && !self) {
//             // A manager viewing someone else does not get salary, bank, ID details or documents
//             out = employee.toObject();
//             SENSITIVE_FIELDS.forEach((k) => delete out[k]);
//         }

//         // The login email is shown to the admin and to the employee themselves only
//         if (!isAdmin(req) && !self) {
//             if (out === employee) out = employee.toObject();
//             delete out.loginEmail;
//         }

//         // reportingManagerName: the edit page shows the manager by name (the id stays in reportingManager)
//         const mgrRaw = idStr(out.reportingManager);
//         let mgrName = "";
//         if (OBJECT_ID.test(mgrRaw)) mgrName = (await Employee.findById(mgrRaw).select("name").lean())?.name || "";
//         else mgrName = mgrRaw; // an old record that holds the name as text
//         if (out === employee) out = employee.toObject();
//         out.reportingManagerName = mgrName;

//         return res.status(200).json({ success: true, data: out, employee: out });
//     } catch (error) {
//         next(error);
//     }
// };

// // @route DELETE /api/employees/:id  (admin / hr, the route allows admin only)
// const deleteEmployee = async (req, res, next) => {
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can delete employees.");

//         if (!mongoose.isValidObjectId(req.params.id)) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         const employee = await Employee.findById(req.params.id);
//         if (!employee) return res.status(404).json({ message: "Employee not found" });

//         const linkedUser = await findLinkedUser(employee);
//         if (linkedUser) {
//             if (String(linkedUser._id) === requesterId(req)) {
//                 return deny(res, "You cannot delete your own account.");
//             }
//             if (linkedUser.role === "admin" && !isAdmin(req)) {
//                 return deny(res, "Only an admin can delete an admin account.");
//             }
//         }

//         await Employee.deleteOne({ _id: employee._id });
//         const released = await releaseTeam(employee);
//         if (linkedUser) await User.deleteOne({ _id: linkedUser._id }); // login stops immediately

//         await logActivity(req, `Deleted employee profile: ${employee.name}`);

//         return res.status(200).json({
//             message: released
//                 ? `Employee removed. ${released} people had this manager. Please assign them a new one.`
//                 : "Employee removed successfully",
//             teamReleased: released,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/employees/:id/exit  (admin / hr)
// const exitEmployee = async (req, res, next) => {
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can process an exit.");

//         if (!mongoose.isValidObjectId(req.params.id)) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         const current = await Employee.findById(req.params.id).select("_id email loginEmail");
//         if (!current) return res.status(404).json({ message: "Employee not found" });

//         const linkedUser = await findLinkedUser(current);
//         if (linkedUser && String(linkedUser._id) === requesterId(req)) {
//             return deny(res, "You cannot process an exit for your own account.");
//         }

//         const employee = await Employee.findByIdAndUpdate(
//             req.params.id,
//             {
//                 $set: {
//                     employeeStatus: "Exited",
//                     exitDate: toDate(req.body?.exitDate) || new Date(),
//                     exitReason:
//                         str(req.body?.exitReason || req.body?.reason) || "Separated from organization",
//                 },
//             },
//             { returnDocument: "after" }
//         ).select(isAdmin(req) ? "-documents" : "-documents -loginEmail");

//         // Login is switched off, the history stays
//         if (linkedUser) await User.updateOne({ _id: linkedUser._id }, { $set: { isActive: false } });

//         const released = await releaseTeam(employee);
//         const out = employee.toObject();
//         out.teamReleased = released;

//         await logActivity(req, `Processed exit for employee: ${employee.name}`);

//         return res.status(200).json(out);
//     } catch (err) {
//         next(err);
//     }
// };

// /* ----------------------------- team ----------------------------- */

// const EMPTY = { members: 0, withLogin: 0, openTasks: 0, submitted: 0, overdue: 0, avgGoalProgress: 0 };
// const nameOf = (map, v) => {
//     if (!v) return "";
//     const s = String(v._id || v);
//     return map.get(s) || (mongoose.isValidObjectId(s) ? "" : s);
// };

// // @route GET /api/employees/team?manager=<employeeId>  (manager: own team. admin/hr: any manager's team)
// const getTeam = async (req, res, next) => {
//     try {
//         if (!["admin", "hr", "manager"].includes(roleOf(req))) return deny(res, "Only managers, HR and admin can open a team.");

//         let boss;
//         if (canManage(req) && req.query.manager) {
//             if (!mongoose.isValidObjectId(req.query.manager)) return res.status(400).json({ message: "Please select a valid manager." });
//             boss = await Employee.findById(req.query.manager).select("_id name employeeId email");
//         } else boss = await myEmployee(req);
//         if (!boss) return res.json({ success: true, manager: null, summary: EMPTY, members: [], message: "No employee profile is linked to this login yet." });

//         const list = await Employee.find(teamFilter(boss))
//             .select("name employeeId email phone designation department employeeStatus dateOfJoining").sort({ name: 1 }).lean();
//         const ids = list.map((e) => e._id);
//         const emails = list.map((e) => lower(e.email)).filter(Boolean);

//         const [users, deps, desigs] = await Promise.all([
//             ids.length ? User.find({ $or: [{ employee: { $in: ids } }, { email: { $in: emails } }] }).select("_id employee email isActive").lean() : [],
//             Department.find().select("name").lean(),
//             Designation.find().select("title").lean(),
//         ]);
//         const byEmp = new Map(users.filter((u) => u.employee).map((u) => [String(u.employee), u]));
//         const byMail = new Map(users.map((u) => [lower(u.email), u]));
//         const userFor = (e) => byEmp.get(String(e._id)) || byMail.get(lower(e.email));
//         const userIds = users.map((u) => u._id);

//         const now = new Date();
//         const [taskRows, goalRows] = await Promise.all([
//             userIds.length
//                 ? Task.aggregate([
//                     { $match: { assignedTo: { $in: userIds.map(oid) } } },
//                     {
//                         $group: {
//                             _id: { u: "$assignedTo", s: "$status" }, n: { $sum: 1 },
//                             late: { $sum: { $cond: [{ $and: [{ $eq: [{ $type: "$dueDate" }, "date"] }, { $lt: ["$dueDate", now] }, { $not: [{ $in: ["$status", ["completed", "cancelled"]] }] }] }, 1, 0] } }
//                         }
//                     },
//                 ])
//                 : [],
//             ids.length
//                 ? Goal.aggregate([
//                     { $match: { employee: { $in: ids } } },
//                     { $group: { _id: "$employee", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }, avg: { $avg: "$progress" } } },
//                 ])
//                 : [],
//         ]);

//         const tasks = new Map();
//         taskRows.forEach((r) => {
//             const k = String(r._id.u);
//             const t = tasks.get(k) || { open: 0, submitted: 0, completed: 0, overdue: 0 };
//             if (["pending", "in-progress"].includes(r._id.s)) t.open += r.n;
//             else if (r._id.s === "submitted") t.submitted += r.n;
//             else if (r._id.s === "completed") t.completed += r.n;
//             t.overdue += r.late;
//             tasks.set(k, t);
//         });
//         const goals = new Map(goalRows.map((g) => [String(g._id), { total: g.total, completed: g.done, avgProgress: Math.round(g.avg || 0) }]));
//         const dMap = new Map(deps.map((d) => [String(d._id), d.name]));
//         const gMap = new Map(desigs.map((d) => [String(d._id), d.title]));

//         const members = list.map((e) => {
//             const u = userFor(e);
//             return {
//                 _id: e._id, name: e.name, employeeId: e.employeeId, email: e.email, phone: e.phone, dateOfJoining: e.dateOfJoining,
//                 employeeStatus: e.employeeStatus || "Active",
//                 designation: nameOf(gMap, e.designation), department: nameOf(dMap, e.department),
//                 userId: u ? u._id : null, hasLogin: Boolean(u), loginActive: u ? u.isActive !== false : false,
//                 tasks: (u && tasks.get(String(u._id))) || { open: 0, submitted: 0, completed: 0, overdue: 0 },
//                 goals: goals.get(String(e._id)) || { total: 0, completed: 0, avgProgress: 0 },
//             };
//         });

//         const sum = (f) => members.reduce((s, m) => s + f(m), 0);
//         const withGoals = members.filter((m) => m.goals.total > 0);
//         res.json({
//             success: true, manager: { _id: boss._id, name: boss.name, employeeId: boss.employeeId },
//             summary: {
//                 members: members.length, withLogin: members.filter((m) => m.hasLogin).length,
//                 openTasks: sum((m) => m.tasks.open), submitted: sum((m) => m.tasks.submitted), overdue: sum((m) => m.tasks.overdue),
//                 avgGoalProgress: withGoals.length ? Math.round(withGoals.reduce((s, m) => s + m.goals.avgProgress, 0) / withGoals.length) : 0,
//             },
//             members,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/employees/manager-options  (admin / hr)
// // People who can be a reporting manager = employees whose login role is in MANAGER_ROLES (name, id, reportee count)
// const getManagerOptions = async (req, res, next) => {
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can view the manager list.");

//         const roleMatch = MANAGER_ROLES.map((r) => new RegExp(`^${r}$`, "i")); // "manager" and "Manager" both match
//         const users = await User.find({ role: { $in: roleMatch }, isActive: { $ne: false } })
//             .select("role email employee")
//             .lean();
//         if (!users.length) return res.json({ success: true, managers: [] });

//         const refIds = users.map((u) => u.employee).filter(Boolean);
//         const emails = users.map((u) => lower(u.email)).filter(Boolean);

//         const employees = await Employee.find({
//             $or: [{ _id: { $in: refIds } }, { email: { $in: emails } }, { loginEmail: { $in: emails } }],
//         })
//             .select("name employeeId email loginEmail employeeStatus")
//             .lean();

//         const roleByEmp = new Map();
//         const roleByMail = new Map();
//         users.forEach((u) => {
//             if (u.employee) roleByEmp.set(String(u.employee), lower(u.role));
//             if (u.email) roleByMail.set(lower(u.email), lower(u.role));
//         });

//         const managers = await Promise.all(
//             employees
//                 .filter((e) => e.name && isLoginActive(e.employeeStatus))
//                 .map(async (e) => ({
//                     _id: e._id,
//                     name: e.name,
//                     employeeId: e.employeeId || "",
//                     role: roleByEmp.get(String(e._id)) || roleByMail.get(lower(e.loginEmail)) || roleByMail.get(lower(e.email)) || "",
//                     reportees: await Employee.countDocuments(teamFilter(e)),
//                 }))
//         );

//         managers.sort((a, b) => a.name.localeCompare(b.name));
//         res.json({ success: true, managers });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/employees/next-id  (admin / hr)  ->  { employeeId: "FPS0001" }
// const getNextEmployeeId = async (req, res, next) => {
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can generate an employee ID.");
//         res.json({ employeeId: await nextEmployeeId() });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/employees/assign-team  body: { manager: employeeId | "" , employees: [employeeId] }  (admin / hr)
// const assignTeam = async (req, res, next) => {
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can assign a team.");
//         const ids = [...new Set((req.body?.employees || []).map(String))].filter((i) => mongoose.isValidObjectId(i));
//         if (!ids.length) return res.status(400).json({ message: "Please select at least one employee." });
//         if (ids.length > 200) return res.status(400).json({ message: "Please select up to 200 employees at a time." });

//         const m = await resolveManager(req.body?.manager, null);
//         if (m.error) return res.status(400).json({ message: m.error });
//         if (m.boss) {
//             if (ids.includes(String(m.boss._id))) return res.status(400).json({ message: "A manager cannot be in his own team." });
//             const up = await ancestors(m.boss);
//             if (ids.some((i) => up.has(i))) return res.status(400).json({ message: "One of the selected people is above this manager. That would make a loop." });
//         }

//         const r = await Employee.updateMany({ _id: { $in: ids } }, { $set: { reportingManager: m.value } });
//         await logActivity(req, m.boss ? `Assigned ${r.modifiedCount} employees to manager ${m.boss.name}` : `Removed the reporting manager of ${r.modifiedCount} employees`);
//         res.json({ success: true, updated: r.modifiedCount, message: m.boss ? `${r.modifiedCount} employees now report to ${m.boss.name}.` : `${r.modifiedCount} employees have no manager now.` });
//     } catch (err) {
//         next(err);
//     }
// };

// module.exports = {
//     getEmployees,
//     getMyProfile,
//     updateMyProfile,
//     getMe,
//     getEmployeeById,
//     getEmployee: getEmployeeById,
//     createEmployee,
//     updateEmployee,
//     deleteEmployee,
//     exitEmployee,
//     getTeam,
//     getManagerOptions,
//     getNextEmployeeId,
//     assignTeam,
// };













// const mongoose = require("mongoose");
// const bcrypt = require("bcryptjs");
// const Employee = require("../models/Employee");
// const User = require("../models/User");
// const ActivityLog = require("../models/activityLogModel");
// const Task = require("../models/Task");
// const Goal = require("../models/Goal");
// const Department = require("../models/Department");
// const Designation = require("../models/Designation");
// const { myEmployee, teamFilter } = require("../utils/teamScope");


// const INACTIVE = /^(inactive|exited|exit)$/i;
// const OBJECT_ID = /^[a-f\d]{24}$/i; // mongoose.isValidObjectId is too loose (it accepts any 12 character text)
// const lower = (v) => String(v || "").trim().toLowerCase();
// const personName = (e) => e.name || e.fullName || [e.firstName, e.lastName].filter(Boolean).join(" ") || "";

// /*
//   Checks the reporting manager that came from the form.
//     { skip: true }    -> field was not sent, keep the old value
//     { id: null }      -> no manager
//     { id: ObjectId }  -> valid manager
//     { error: "..." }  -> send this message with status 400
// */
// async function resolveReportingManager(value, selfId = null) {
//     if (value === undefined) return { skip: true };

//     const raw = String(value?._id || value || "").trim();
//     if (!raw || raw === "null" || raw === "undefined") return { id: null };

//     if (!OBJECT_ID.test(raw)) return { error: "Please select the reporting manager from the list." };
//     if (selfId && raw === String(selfId)) return { error: "An employee cannot report to themselves." };

//     const manager = await Employee.findById(raw).select("_id reportingManager employeeStatus").lean();
//     if (!manager) return { error: "The selected reporting manager was not found." };
//     if (INACTIVE.test(manager.employeeStatus || "")) return { error: "The selected reporting manager is not active." };

//     /* loop check: A reports to B and B reports to A is not allowed */
//     if (selfId) {
//         const seen = new Set([raw]);
//         let next = manager.reportingManager;
//         for (let hops = 0; hops < 20; hops++) {
//             const nextId = String(next?._id || next || "");
//             if (!OBJECT_ID.test(nextId)) break; // chain ends here (empty, or an old text value like "Sanjay Sir")
//             if (nextId === String(selfId)) return { error: "This would create a reporting loop. Please choose another manager." };
//             if (seen.has(nextId)) break;
//             seen.add(nextId);
//             const up = await Employee.findById(nextId).select("reportingManager").lean();
//             next = up?.reportingManager;
//         }
//     }
//     return { id: manager._id };
// }

// /* GET /employees/manager-options -> only employees whose login role is Manager */
// exports.getManagerOptions = async (req, res, next) => {
//     try {
//         const users = await User.find({ role: /^manager$/i, isActive: { $ne: false } }).select("name email employee").lean();
//         if (!users.length) return res.status(200).json({ managers: [] });

//         const refIds = users.map((u) => u.employee).filter(Boolean);
//         const emails = users.map((u) => lower(u.email)).filter(Boolean);

//         const employees = await Employee.find({
//             employeeStatus: { $not: INACTIVE },
//             $or: [{ _id: { $in: refIds } }, { email: { $in: emails } }, { loginEmail: { $in: emails } }],
//         })
//             .select("name fullName firstName lastName employeeId")
//             .lean();

//         const managers = employees
//             .map((e) => ({ _id: e._id, name: personName(e), employeeId: e.employeeId || "" }))
//             .filter((m) => m.name)
//             .sort((a, b) => a.name.localeCompare(b.name));

//         res.status(200).json({ managers });
//     } catch (err) {
//         next(err);
//     }
// };

// /* Next employee id: FPS0001, FPS0002, ... (highest existing FPS number + 1) */
// const ID_PREFIX = "FPS";
// async function nextEmployeeId() {
//     const rows = await Employee.find({ employeeId: /^FPS\d+$/i }).select("employeeId").lean();
//     let max = 0;
//     rows.forEach((r) => {
//         const n = Number(String(r.employeeId).slice(ID_PREFIX.length));
//         if (n > max) max = n;
//     });
//     return `${ID_PREFIX}${String(max + 1).padStart(4, "0")}`;
// }

// /* GET /employees/next-id -> { employeeId: "FPS0001" } */
// exports.getNextEmployeeId = async (req, res, next) => {
//     try {
//         res.status(200).json({ employeeId: await nextEmployeeId() });
//     } catch (err) {
//         next(err);
//     }
// };

// const GENDERS = ["male", "female", "other"];
// const ROLES = ["Employee", "Manager", "HR", "Admin"];
// const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
// const PASSWORD_MESSAGE =
//     "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number.";
// const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
// const AADHAAR_REGEX = /^[2-9]\d{11}$/;
// const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
// const CI = { locale: "en", strength: 2 }; // case-insensitive email match

// /* ----------------------------- helpers ----------------------------- */

// const str = (v) => (v === undefined || v === null ? "" : String(v).trim());
// const rawStr = (v) => (v === undefined || v === null ? "" : String(v)); // base64 and passwords (no trim)
// // const lower = (v) => str(v).toLowerCase();
// const upper = (v) => str(v).toUpperCase();
// const digits = (v) => str(v).replace(/\D/g, "");

// // id ya {_id} object ho to usse plain string bana do
// const refString = (v) => {
//     if (v && typeof v === "object") return String(v._id || v.id || "").trim();
//     return str(v);
// };

// const toDate = (v) => {
//     if (!v) return null;
//     const d = new Date(v);
//     return Number.isNaN(d.getTime()) ? null : d;
// };

// const normalizeStatus = (v) => {
//     const s = str(v);
//     const l = s.toLowerCase();
//     return l === "exit" || l === "exited" ? "Exited" : s;
// };

// const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// /* Fields that managers must not see (admin and HR can) */
// const SENSITIVE_FIELDS = ["salary", "bankDetails", "documents", "idProofNumber", "aadhaarNumber", "panNumber"];

// /* ------------------------- role and access ------------------------- */

// const roleOf = (req) => lower(req.user?.role);
// const isAdmin = (req) => roleOf(req) === "admin"; // login access (login email, password, role) is admin only
// const canManage = (req) => ["admin", "hr"].includes(roleOf(req)); // profile: create, update, delete, exit
// const deny = (res, message = "You are not allowed to perform this action.") =>
//     res.status(403).json({ message });

// const requesterId = (req) => String(req.user?._id || req.user?.id || "");

// // Is this employee profile the logged-in user's own profile?
// const isSelf = (req, emp) => {
//     if (!emp) return false;
//     const linked = req.user?.employee ? String(req.user.employee._id || req.user.employee) : "";
//     if (linked && linked === String(emp._id)) return true;
//     const email = lower(req.user?.email);
//     return Boolean(email) && [emp.email, emp.loginEmail].some((e) => lower(e) === email);
// };

// // Logged-in user's own employee profile
// // const findMyEmployee = async (req) => {
// //     const linked = req.user?.employee ? req.user.employee._id || req.user.employee : null;
// //     if (linked && mongoose.isValidObjectId(linked)) {
// //         const byLink = await Employee.findById(linked);
// //         if (byLink) return byLink;
// //     }
// //     const email = lower(req.user?.email);
// //     if (!email) return null;
// //     return Employee.findOne({ $or: [{ email }, { loginEmail: email }] });
// // };

// const findMyEmployee = async (req, select = "") => {
//     const linked = req.user?.employee ? req.user.employee._id || req.user.employee : null;
//     if (linked && mongoose.isValidObjectId(linked)) {
//         const byLink = await Employee.findById(linked).select(select);
//         if (byLink) return byLink;
//     }
//     const email = lower(req.user?.email);
//     if (!email) return null;
//     return Employee.findOne({ $or: [{ email }, { loginEmail: email }] }).select(select);
// };

// /* --------------------------- login account --------------------------- */

// const findUserByEmail = (email) => User.findOne({ email }).collation(CI);

// const loginEmailTaken = async (email, exceptUserId) => {
//     const found = await findUserByEmail(email).select("_id");
//     return Boolean(found && (!exceptUserId || String(found._id) !== String(exceptUserId)));
// };

// // The User (login account) that belongs to this employee profile
// const findLinkedUser = async (employee) => {
//     const byRef = await User.findOne({ employee: employee._id });
//     if (byRef) return byRef;

//     const emails = [employee.loginEmail, employee.email].map(lower).filter(Boolean);
//     for (const email of emails) {
//         const byEmail = await findUserByEmail(email);
//         if (byEmail && (!byEmail.employee || String(byEmail.employee) === String(employee._id))) {
//             return byEmail;
//         }
//     }
//     return null;
// };

// const hashPassword = (password) => bcrypt.hash(password, 10);
// const userRoleFrom = (role) => lower(role || "Employee");
// const isLoginActive = (status) => !["inactive", "exited"].includes(lower(status));

// /* ------------------------------ misc ------------------------------ */

// const logActivity = async (req, action) => {
//     try {
//         if (!ActivityLog) return;
//         await ActivityLog.create({
//             user: req.user?.id || req.user?._id || null,
//             action,
//             module: "Employee",
//         });
//     } catch (err) {
//         console.error("Activity log error:", err.message);
//     }
// };



// /* ----------------------------- reporting manager ----------------------------- */

// const MANAGER_ROLES = ["manager", "hr", "admin"];
// const mgrIsObjectId = () => Employee.schema.path("reportingManager")?.instance === "ObjectId";
// const oid = (x) => new mongoose.Types.ObjectId(String(x));

// /* the manager, his manager, his manager's manager... used to stop loops (A reports to B, B reports to A) */
// async function ancestors(boss) {
//     const out = new Set();
//     let cur = boss;
//     for (let i = 0; i < 15 && cur; i++) {
//         out.add(String(cur._id));
//         if (!mgrIsObjectId() || !cur.reportingManager) break;
//         cur = await Employee.findById(cur.reportingManager).select("reportingManager");
//     }
//     return out;
// }

// /* accepts an id, an employee id or a name. Returns { value, boss } to save, or { error }. */
// async function resolveManager(input, selfId) {
//     const raw = refString(input);
//     if (!raw) return { value: mgrIsObjectId() ? null : "" };

//     const pick = "_id name employeeId email loginEmail employeeStatus reportingManager";
//     let boss = mongoose.isValidObjectId(raw) ? await Employee.findById(raw).select(pick) : null;
//     if (!boss) {
//         const found = await Employee.find({ $or: [{ employeeId: raw.toUpperCase() }, { name: new RegExp(`^${escapeRegex(raw)}$`, "i") }] }).select(pick).limit(2);
//         if (found.length > 1) return { error: `More than one person is called "${raw}". Please choose the manager from the list.` };
//         boss = found[0] || null;
//     }
//     if (!boss) return { error: "The selected reporting manager was not found." };
//     if (selfId && String(boss._id) === String(selfId)) return { error: "An employee cannot report to themselves." };
//     if (!isLoginActive(boss.employeeStatus)) return { error: `${boss.name} is inactive or has left the company.` };

//     const login = await findLinkedUser(boss);
//     if (!login) return { error: `${boss.name} has no login account yet. Ask the admin to create it first.` };
//     if (!MANAGER_ROLES.includes(lower(login.role))) return { error: `${boss.name} is an ${login.role}. Choose someone with the Manager, HR or Admin role.` };
//     if (selfId && (await ancestors(boss)).has(String(selfId))) return { error: `${boss.name} already reports to this employee. That would make a loop.` };

//     return { value: mgrIsObjectId() ? boss._id : boss.name, boss };
// }

// /* when a manager leaves or is deleted his people must not keep pointing at him */
// async function releaseTeam(boss) {
//     const filter = mgrIsObjectId()
//         ? { reportingManager: boss._id }
//         : { reportingManager: new RegExp(`^\\s*(${escapeRegex(boss.name)}|${escapeRegex(boss.employeeId || "~")})\\s*$`, "i") };
//     const r = await Employee.updateMany(filter, { $set: { reportingManager: mgrIsObjectId() ? null : "" } });
//     return r.modifiedCount || 0;
// }









// const handleError = (res, error, fallbackMessage) => {
//     console.error(fallbackMessage, error);

//     if (error.name === "ValidationError") {
//         const message = Object.values(error.errors).map((e) => e.message).join(", ");
//         return res.status(400).json({ message });
//     }
//     if (error.code === 11000) {
//         const field = Object.keys(error.keyPattern || {})[0] || "field";
//         return res.status(409).json({ message: `A record with this ${field} already exists.` });
//     }
//     return res.status(500).json({ message: fallbackMessage });
// };

// const generateEmployeeId = async () => {
//     let counter = (await Employee.countDocuments()) + 1;
//     let employeeId = `EMP${String(counter).padStart(4, "0")}`;
//     while (await Employee.exists({ employeeId })) {
//         counter++;
//         employeeId = `EMP${String(counter).padStart(4, "0")}`;
//     }
//     return employeeId;
// };

// /**
//  * Request body -> schema fields (dot-path object).
//  * Only keys that were sent are returned, so a partial update never wipes other data.
//  * "password" is never copied here: it belongs to the User model, not Employee.
//  */
// const buildEmployeeData = (body = {}) => {
//     const data = {};
//     const bank = body.bankDetails || {};
//     const docs = body.documents || {};

//     const setIf = (path, value, fn = str, skipEmpty = false) => {
//         if (value === undefined) return;
//         const out = fn(value);
//         if (skipEmpty && (out === "" || out === null)) return;
//         data[path] = out;
//     };
//     const flatOrNested = (flat, nested) => (body[flat] !== undefined ? body[flat] : nested);

//     /* Personal */
//     setIf("employeeId", body.employeeId, upper, true);
//     setIf("firstName", body.firstName);
//     setIf("lastName", body.lastName);
//     setIf("name", body.name, str, true);
//     if (data.name === undefined && (body.firstName !== undefined || body.lastName !== undefined)) {
//         const full = `${str(body.firstName)} ${str(body.lastName)}`.trim();
//         if (full) data.name = full;
//     }
//     setIf("email", body.email, lower, true);
//     setIf("loginEmail", body.loginEmail, lower, true);
//     setIf("phone", body.phone);
//     setIf("gender", body.gender, lower, true);
//     if (data.gender && !GENDERS.includes(data.gender)) delete data.gender;
//     setIf("timeZone", body.timeZone);
//     setIf("avatar", body.avatar, rawStr);

//     /* Address */
//     setIf("address", body.address);
//     setIf("city", body.city);
//     setIf("state", body.state);
//     setIf("pincode", body.pincode);

//     /* Job */
//     setIf("designation", body.designation, refString, true);
//     setIf("department", body.department, refString, true);
//     setIf("reportingManager", body.reportingManager, refString);
//     setIf("employmentType", body.employmentType, str, true);
//     setIf("employeeStatus", body.employeeStatus, normalizeStatus, true);
//     setIf("role", body.role, str, true);
//     if (data.role && !ROLES.includes(data.role)) delete data.role;
//     setIf("dateOfJoining", body.dateOfJoining, toDate);
//     setIf("salary", body.salary, (v) => Number(v) || 0);

//     /* Exit */
//     setIf("exitDate", body.exitDate, toDate);
//     setIf("exitReason", body.exitReason);

//     /* Identity */
//     setIf("nationalIdType", body.nationalIdType);
//     setIf("nationalIdOther", body.nationalIdOther);
//     setIf("aadhaarNumber", body.aadhaarNumber, digits);
//     setIf("panNumber", body.panNumber, upper);
//     setIf("idProofNumber", body.idProofNumber !== undefined ? body.idProofNumber : body.nationalId, upper);
//     // Older forms only sent one ID number. The Aadhaar number is the main ID.
//     if (data.aadhaarNumber && data.idProofNumber === undefined) data.idProofNumber = data.aadhaarNumber;

//     /* Bank */
//     ["accountName", "bankName", "branchName", "accountNumber"].forEach((k) =>
//         setIf(`bankDetails.${k}`, flatOrNested(k, bank[k]))
//     );
//     setIf("bankDetails.ifscCode", flatOrNested("ifscCode", bank.ifscCode), upper);

//     /* Documents (base64 images) */
//     [
//         "nationalIdFrontFileName",
//         "nationalIdFrontFileData",
//         "nationalIdBackFileName",
//         "nationalIdBackFileData",
//         "panCardFileName",
//         "panCardFileData",
//         "passportPhotoFileName",
//         "passportPhotoData",
//     ].forEach((k) => setIf(`documents.${k}`, docs[k] !== undefined ? docs[k] : body[k], rawStr));

//     return data;
// };

// /* Format checks done on the server, because the browser can be bypassed */
// const validateInput = (data, isCreate) => {
//     if (data.email && !EMAIL_REGEX.test(data.email)) return "Please enter a valid personal email address.";
//     if (data.loginEmail && !EMAIL_REGEX.test(data.loginEmail)) return "Please enter a valid login email address.";

//     if (isCreate || data.aadhaarNumber) {
//         if (!AADHAAR_REGEX.test(data.aadhaarNumber || "")) {
//             return "Aadhaar number must be 12 digits and cannot start with 0 or 1.";
//         }
//     }
//     if (isCreate || data.panNumber) {
//         if (!PAN_REGEX.test(data.panNumber || "")) {
//             return "Enter a valid PAN number (for example, ABCDE1234F).";
//         }
//     }
//     return null;
// };

// // employeeId / emails / Aadhaar / PAN duplicate check
// const findDuplicate = async (data, excludeId) => {
//     const notSelf = excludeId ? { _id: { $ne: excludeId } } : {};
//     const checks = [];

//     if (data.employeeId) checks.push([{ employeeId: data.employeeId }, "Employee ID", data.employeeId]);
//     if (data.email) checks.push([{ email: data.email }, "Personal email", data.email]);
//     if (data.loginEmail) {
//         checks.push([
//             { $or: [{ loginEmail: data.loginEmail }, { email: data.loginEmail }] },
//             "Login email",
//             data.loginEmail,
//         ]);
//     }
//     if (data.aadhaarNumber) {
//         checks.push([
//             { $or: [{ aadhaarNumber: data.aadhaarNumber }, { idProofNumber: data.aadhaarNumber }] },
//             "Aadhaar number",
//             data.aadhaarNumber,
//         ]);
//     } else if (data.idProofNumber) {
//         checks.push([{ idProofNumber: data.idProofNumber }, "Document ID number", data.idProofNumber]);
//     }
//     if (data.panNumber) {
//         checks.push([
//             { $or: [{ panNumber: data.panNumber }, { idProofNumber: data.panNumber }] },
//             "PAN number",
//             data.panNumber,
//         ]);
//     }

//     for (const [filter, label, value] of checks) {
//         const dup = await Employee.exists({ ...filter, ...notSelf });
//         if (dup) return `${label} "${value}" is already registered with another employee.`;
//     }
//     return null;
// };

// /* ----------------------------- handlers ----------------------------- */

// // @route POST /api/employees  (admin / hr)
// // Admin: profile + login account. HR: profile only (the admin adds the login later).
// const createEmployee = async (req, res) => {
//     let saved = null;
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can add employees.");
//         const admin = isAdmin(req);

//         const data = buildEmployeeData(req.body || {});
//         if (req.body?.reportingManager !== undefined) {
//             // const m = await resolveManager(req.body.reportingManager, null);
//             // if (m.error) return res.status(400).json({ message: m.error });
//             const rm = await resolveReportingManager(req.body.reportingManager);
//             if (rm.error) return res.status(400).json({ message: rm.error });

//             // create karte waqt:
//             // Employee.create({ ...req.body, reportingManager: rm.id ?? null, ... })
//             data.reportingManager = m.value;
//         }
//         const password = admin ? rawStr(req.body?.password) : "";

//         if (req.files?.avatar?.[0]) data.avatar = `/uploads/${req.files.avatar[0].filename}`;
//         if (!data.employeeId) data.employeeId = await generateEmployeeId();

//         // Login access (login email, password, role) is created by the admin only
//         if (admin) {
//             if (!data.loginEmail && data.email) data.loginEmail = data.email;
//         } else {
//             delete data.loginEmail;
//             delete data.role;
//         }

//         const missing = ["name", "email", "designation", "department"].filter((k) => !data[k]);
//         if (missing.length) {
//             return res.status(400).json({ message: `Required fields missing: ${missing.join(", ")}` });
//         }

//         const invalid = validateInput(data, true);
//         if (invalid) return res.status(400).json({ message: invalid });

//         if (admin && !PASSWORD_REGEX.test(password)) {
//             return res.status(400).json({ message: PASSWORD_MESSAGE });
//         }

//         const dupMessage = await findDuplicate(data);
//         if (dupMessage) return res.status(409).json({ message: dupMessage });

//         if (admin && (await loginEmailTaken(data.loginEmail))) {
//             return res.status(409).json({ message: "A login account with this email already exists." });
//         }

//         const employee = new Employee();
//         for (const [path, value] of Object.entries(data)) employee.set(path, value);
//         saved = await employee.save();

//         // Only the admin creates the login account. If it fails, the profile is rolled back (no half-created data).
//         if (admin) {
//             try {
//                 await User.create({
//                     name: saved.name,
//                     email: saved.loginEmail,
//                     password: await hashPassword(password),
//                     role: userRoleFrom(saved.role),
//                     employee: saved._id,
//                     isActive: isLoginActive(saved.employeeStatus),
//                 });
//             } catch (userErr) {
//                 await Employee.deleteOne({ _id: saved._id }).catch(() => { });
//                 saved = null;
//                 throw userErr;
//             }
//         }

//         await logActivity(
//             req,
//             admin
//                 ? `Created new employee profile and login: ${saved.name} (${saved.employeeId})`
//                 : `Created new employee profile: ${saved.name} (${saved.employeeId})`
//         );

//         // The response does not need the heavy base64 documents
//         const out = saved.toObject();
//         delete out.documents;

//         return res.status(201).json({
//             success: true,
//             message: admin
//                 ? "Employee registered successfully. Login account created."
//                 : "Employee profile saved. An admin must add the login access before this employee can log in.",
//             loginCreated: admin,
//             employee: out,
//             data: out,
//         });
//     } catch (error) {
//         return handleError(res, error, "Failed to save employee.");
//     }
// };

// // @route PUT /api/employees/:id  (admin / hr)
// // Login email, password and role can be changed by the admin only.
// const updateEmployee = async (req, res) => {
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can update employees.");
//         const admin = isAdmin(req);

//         const { id } = req.params;
//         if (!mongoose.isValidObjectId(id)) {
//             return res.status(404).json({ message: "Employee record not found." });
//         }

//         const current = await Employee.findById(id).select(
//             "_id name email loginEmail employeeId role employeeStatus"
//         );
//         if (!current) return res.status(404).json({ message: "Employee record not found." });

//         const data = buildEmployeeData(req.body || {});
//         if (req.body?.reportingManager !== undefined) {
//             const rm = await resolveReportingManager(req.body.reportingManager, req.params.id);
//             if (rm.error) return res.status(400).json({ message: rm.error });

//             if (rm.skip) delete update.reportingManager;      // `update` = tumhara update object
//             else update.reportingManager = rm.id ?? null;
//             // const m = await resolveManager(req.body.reportingManager, id);
//             // if (m.error) return res.status(400).json({ message: m.error });
//             // data.reportingManager = m.value;
//         }
//         if (req.files?.avatar?.[0]) data.avatar = `/uploads/${req.files.avatar[0].filename}`;

//         if (!admin) {
//             // HR can never touch the login email or the role
//             delete data.loginEmail;
//             delete data.role;
//         } else if (!data.loginEmail && !current.loginEmail && (data.email || current.email)) {
//             // Old records without a login email: use the personal email
//             data.loginEmail = data.email || current.email;
//         }

//         const invalid = validateInput(data, false);
//         if (invalid) return res.status(400).json({ message: invalid });

//         const dupMessage = await findDuplicate(data, id);
//         if (dupMessage) return res.status(409).json({ message: dupMessage });

//         /* Check everything about the login account BEFORE saving anything */
//         const newPassword = admin ? rawStr(req.body?.password) : "";
//         if (newPassword && !PASSWORD_REGEX.test(newPassword)) {
//             return res.status(400).json({ message: PASSWORD_MESSAGE });
//         }

//         const linkedUser = await findLinkedUser(current);
//         const loginEmailChanged = Boolean(
//             admin &&
//             data.loginEmail &&
//             data.loginEmail !== lower(linkedUser?.email || current.loginEmail || current.email)
//         );

//         if (loginEmailChanged && (await loginEmailTaken(data.loginEmail, linkedUser?._id))) {
//             return res.status(409).json({ message: "A login account with this email already exists." });
//         }

//         const newLoginEmail = data.loginEmail || current.loginEmail || data.email || current.email;
//         if (!linkedUser && newPassword && (await loginEmailTaken(newLoginEmail))) {
//             return res.status(409).json({ message: "A login account with this email already exists." });
//         }

//         /* Save the profile */
//         const updated = await Employee.findByIdAndUpdate(
//             id,
//             { $set: data },
//             { returnDocument: "after", runValidators: true }
//         );

//         /* Keep the login account in sync */
//         let loginMessage = "";
//         if (linkedUser) {
//             const editingOwnLogin = String(linkedUser._id) === requesterId(req);
//             const statusChanged = Boolean(data.employeeStatus && data.employeeStatus !== current.employeeStatus);
//             const set = {};
//             const unset = {};

//             if (!linkedUser.employee) set.employee = updated._id;
//             if (data.name) set.name = data.name;
//             if (loginEmailChanged) set.email = data.loginEmail;
//             // Role is admin only (it is already removed from the data for HR)
//             if (data.role && !editingOwnLogin) set.role = userRoleFrom(data.role);

//             // The login follows the employee status only when the status really changed.
//             // HR can switch a login off (Inactive / Exited) but cannot switch it back on.
//             if (statusChanged && !editingOwnLogin) {
//                 const active = isLoginActive(data.employeeStatus);
//                 if (admin || !active) set.isActive = active;
//             }

//             if (newPassword) {
//                 set.password = await hashPassword(newPassword);
//                 set.passwordChangedAt = new Date(); // old logins stop working
//                 unset.passwordResetToken = "";
//                 unset.passwordResetExpires = "";
//                 unset.passwordResetRequestedAt = "";
//                 loginMessage = " Password updated.";
//             }

//             const update = {};
//             if (Object.keys(set).length) update.$set = set;
//             if (Object.keys(unset).length) update.$unset = unset;
//             if (Object.keys(update).length) await User.updateOne({ _id: linkedUser._id }, update);
//         } else if (newPassword) {
//             // Employee who never had a login (for example, added by HR): the admin creates it now
//             await User.create({
//                 name: updated.name,
//                 email: updated.loginEmail || updated.email,
//                 password: await hashPassword(newPassword),
//                 role: userRoleFrom(updated.role),
//                 employee: updated._id,
//                 isActive: isLoginActive(updated.employeeStatus),
//             });
//             loginMessage = " Login account created.";
//         }

//         await logActivity(req, `Updated employee profile: ${updated.name} (${updated.employeeId})`);

//         const out = updated.toObject();
//         delete out.documents;
//         if (!admin) delete out.loginEmail;

//         return res.status(200).json({
//             success: true,
//             message: `Employee updated successfully.${loginMessage}`,
//             employee: out,
//             data: out,
//         });
//     } catch (error) {
//         return handleError(res, error, "Failed to update employee profile.");
//     }
// };

// // @route GET /api/employees
// const getEmployees = async (req, res, next) => {
//     try {
//         const role = roleOf(req);

//         // Employee: only their own profile
//         if (role === "employee") {
//             const me = await findMyEmployee(req);
//             if (!me) return res.status(200).json([]);
//             const own = me.toObject();
//             delete own.documents;
//             delete own.bankDetails;
//             return res.status(200).json([own]);
//         }

//         const { status, department, search } = req.query;
//         const filter = {};

//         if (status) filter.employeeStatus = String(status);
//         if (department) filter.department = String(department);
//         if (search && String(search).trim()) {
//             const rx = new RegExp(escapeRegex(String(search).trim()), "i");
//             filter.$or = [{ name: rx }, { email: rx }, { employeeId: rx }];
//             if (isAdmin(req)) filter.$or.push({ loginEmail: rx }); // login email is searchable by the admin only
//         }

//         // Heavy base64 documents and bank details are never needed in the list.
//         // Only the admin sees the login email. Managers also do not see salary, Aadhaar or PAN numbers.
//         let hidden = "-documents -bankDetails";
//         if (!isAdmin(req)) hidden += " -loginEmail";
//         if (!canManage(req)) hidden += " -salary -idProofNumber -aadhaarNumber -panNumber";


//         if (role === "manager") {
//             // a manager sees only himself and the people who report to him
//             const me = await myEmployee(req);
//             const team = me ? await Employee.find(teamFilter(me)).select("_id").lean() : [];
//             filter._id = { $in: me ? [me._id, ...team.map((t) => t._id)] : [] };
//         }

//         const employees = await Employee.find(filter).select(hidden).sort({ createdAt: -1 });

//         return res.status(200).json(employees);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/employees/profile and /api/employees/me  (logged-in user's own profile)
// const getMyProfile = async (req, res, next) => {
//     try {
//         const employee = await findMyEmployee(req);
//         if (employee) return res.status(200).json(employee);

//         // No linked employee profile (admin, HR, or an account that is not linked yet):
//         // return the login details instead of a 404, so the app keeps working.
//         return res.status(200).json({
//             _id: req.user._id,
//             name: req.user.name,
//             email: req.user.email,
//             role: req.user.role,
//             hasEmployeeProfile: false,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/employees/me   (a person edits their own contact details)
// const updateMyProfile = async (req, res, next) => {
//     try {
//         const me = await findMyEmployee(req);
//         if (!me) {
//             return res.status(404).json({ message: "Your employee profile is not linked yet. Please contact HR." });
//         }

//         const set = {};

//         if (req.body.phone !== undefined) {
//             const phone = digits(req.body.phone).slice(-10);
//             if (!/^[6-9]\d{9}$/.test(phone)) {
//                 return res.status(400).json({ message: "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9." });
//             }
//             set.phone = phone;
//         }
//         if (req.body.address !== undefined) {
//             const address = str(req.body.address);
//             if (address.length < 5 || address.length > 200) {
//                 return res.status(400).json({ message: "Address must be 5 to 200 characters." });
//             }
//             set.address = address;
//         }
//         ["city", "state"].forEach((key) => {
//             if (req.body[key] !== undefined) set[key] = str(req.body[key]);
//         });
//         if (req.body.pincode !== undefined) {
//             const pincode = digits(req.body.pincode);
//             if (!/^[1-9]\d{5}$/.test(pincode)) {
//                 return res.status(400).json({ message: "Pincode must be exactly 6 digits." });
//             }
//             set.pincode = pincode;
//         }

//         if (!Object.keys(set).length) return res.status(400).json({ message: "There is nothing to update." });

//         const updated = await Employee.findByIdAndUpdate(
//             me._id,
//             { $set: set },
//             { returnDocument: "after", runValidators: true }
//         ).select("-documents");

//         return res.status(200).json({ success: true, message: "Profile updated successfully.", employee: updated });
//     } catch (err) {
//         next(err);
//     }
// };
// // @route GET /api/employees/me  (dashboard ke liye halka: documents aur bank nahi)
// const getMe = async (req, res, next) => {
//     try {
//         const employee = await findMyEmployee(req, "-documents -bankDetails");
//         if (employee) return res.status(200).json(employee);

//         return res.status(200).json({
//             _id: req.user._id,
//             name: req.user.name,
//             email: req.user.email,
//             role: req.user.role,
//             hasEmployeeProfile: false,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/employees/:id
// const getEmployeeById = async (req, res, next) => {
//     try {
//         if (!mongoose.isValidObjectId(req.params.id)) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         const employee = await Employee.findById(req.params.id);
//         if (!employee) return res.status(404).json({ message: "Employee not found" });

//         const manage = canManage(req);
//         const self = isSelf(req, employee);

//         // if (!manage && !self && roleOf(req) !== "manager") {
//         //     return deny(res, "You can only view your own profile.");
//         // }

//         if (!manage && !self) {
//             if (roleOf(req) !== "manager") return deny(res, "You can only view your own profile.");
//             const me = await myEmployee(req);
//             const inTeam = me && (await Employee.exists({ $and: [teamFilter(me), { _id: employee._id }] }));
//             if (!inTeam) return deny(res, "This employee is not in your team.");
//         }

//         let out = employee;
//         if (!manage && !self) {
//             // A manager viewing someone else does not get salary, bank, ID details or documents
//             out = employee.toObject();
//             SENSITIVE_FIELDS.forEach((k) => delete out[k]);
//         }

//         // The login email is shown to the admin and to the employee themselves only
//         if (!isAdmin(req) && !self) {
//             if (out === employee) out = employee.toObject();
//             delete out.loginEmail;
//         }

//         return res.status(200).json({ success: true, data: out, employee: out });
//     } catch (error) {
//         next(error);
//     }
// };

// // @route DELETE /api/employees/:id  (admin / hr, the route allows admin only)
// const deleteEmployee = async (req, res, next) => {
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can delete employees.");

//         if (!mongoose.isValidObjectId(req.params.id)) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         const employee = await Employee.findById(req.params.id);
//         if (!employee) return res.status(404).json({ message: "Employee not found" });

//         const linkedUser = await findLinkedUser(employee);
//         if (linkedUser) {
//             if (String(linkedUser._id) === requesterId(req)) {
//                 return deny(res, "You cannot delete your own account.");
//             }
//             if (linkedUser.role === "admin" && !isAdmin(req)) {
//                 return deny(res, "Only an admin can delete an admin account.");
//             }
//         }

//         await Employee.deleteOne({ _id: employee._id });
//         const released = await releaseTeam(employee);
//         if (linkedUser) await User.deleteOne({ _id: linkedUser._id }); // login stops immediately

//         await logActivity(req, `Deleted employee profile: ${employee.name}`);

//         // return res.status(200).json({ message: "Employee removed successfully" });
//         return res.status(200).json({ message: released ? `Employee removed. ${released} people had this manager. Please assign them a new one.` : "Employee removed successfully", teamReleased: released });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/employees/:id/exit  (admin / hr)
// const exitEmployee = async (req, res, next) => {
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can process an exit.");

//         if (!mongoose.isValidObjectId(req.params.id)) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         const current = await Employee.findById(req.params.id).select("_id email loginEmail");
//         if (!current) return res.status(404).json({ message: "Employee not found" });

//         const linkedUser = await findLinkedUser(current);
//         if (linkedUser && String(linkedUser._id) === requesterId(req)) {
//             return deny(res, "You cannot process an exit for your own account.");
//         }

//         const employee = await Employee.findByIdAndUpdate(
//             req.params.id,
//             {
//                 $set: {
//                     employeeStatus: "Exited",
//                     exitDate: toDate(req.body?.exitDate) || new Date(),
//                     exitReason:
//                         str(req.body?.exitReason || req.body?.reason) || "Separated from organization",
//                 },
//             },
//             { returnDocument: "after" }
//         ).select(isAdmin(req) ? "-documents" : "-documents -loginEmail");

//         // Login is switched off, the history stays
//         if (linkedUser) await User.updateOne({ _id: linkedUser._id }, { $set: { isActive: false } });

//         const released = await releaseTeam(employee);
//         const out = employee.toObject();
//         out.teamReleased = released;

//         await logActivity(req, `Processed exit for employee: ${employee.name}`);

//         return res.status(200).json(out);
//     } catch (err) {
//         next(err);
//     }
// };


// /* ----------------------------- team ----------------------------- */

// const EMPTY = { members: 0, withLogin: 0, openTasks: 0, submitted: 0, overdue: 0, avgGoalProgress: 0 };
// const nameOf = (map, v) => {
//     if (!v) return "";
//     const s = String(v._id || v);
//     return map.get(s) || (mongoose.isValidObjectId(s) ? "" : s);
// };

// // @route GET /api/employees/team?manager=<employeeId>  (manager: own team. admin/hr: any manager's team)
// const getTeam = async (req, res, next) => {
//     try {
//         if (!["admin", "hr", "manager"].includes(roleOf(req))) return deny(res, "Only managers, HR and admin can open a team.");

//         let boss;
//         if (canManage(req) && req.query.manager) {
//             if (!mongoose.isValidObjectId(req.query.manager)) return res.status(400).json({ message: "Please select a valid manager." });
//             boss = await Employee.findById(req.query.manager).select("_id name employeeId email");
//         } else boss = await myEmployee(req);
//         if (!boss) return res.json({ success: true, manager: null, summary: EMPTY, members: [], message: "No employee profile is linked to this login yet." });

//         const list = await Employee.find(teamFilter(boss))
//             .select("name employeeId email phone designation department employeeStatus dateOfJoining").sort({ name: 1 }).lean();
//         const ids = list.map((e) => e._id);
//         const emails = list.map((e) => lower(e.email)).filter(Boolean);

//         const [users, deps, desigs] = await Promise.all([
//             ids.length ? User.find({ $or: [{ employee: { $in: ids } }, { email: { $in: emails } }] }).select("_id employee email isActive").lean() : [],
//             Department.find().select("name").lean(),
//             Designation.find().select("title").lean(),
//         ]);
//         const byEmp = new Map(users.filter((u) => u.employee).map((u) => [String(u.employee), u]));
//         const byMail = new Map(users.map((u) => [lower(u.email), u]));
//         const userFor = (e) => byEmp.get(String(e._id)) || byMail.get(lower(e.email));
//         const userIds = users.map((u) => u._id);

//         const now = new Date();
//         const [taskRows, goalRows] = await Promise.all([
//             userIds.length
//                 ? Task.aggregate([
//                     { $match: { assignedTo: { $in: userIds.map(oid) } } },
//                     {
//                         $group: {
//                             _id: { u: "$assignedTo", s: "$status" }, n: { $sum: 1 },
//                             late: { $sum: { $cond: [{ $and: [{ $eq: [{ $type: "$dueDate" }, "date"] }, { $lt: ["$dueDate", now] }, { $not: [{ $in: ["$status", ["completed", "cancelled"]] }] }] }, 1, 0] } }
//                         }
//                     },
//                 ])
//                 : [],
//             ids.length
//                 ? Goal.aggregate([
//                     { $match: { employee: { $in: ids } } },
//                     { $group: { _id: "$employee", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }, avg: { $avg: "$progress" } } },
//                 ])
//                 : [],
//         ]);

//         const tasks = new Map();
//         taskRows.forEach((r) => {
//             const k = String(r._id.u);
//             const t = tasks.get(k) || { open: 0, submitted: 0, completed: 0, overdue: 0 };
//             if (["pending", "in-progress"].includes(r._id.s)) t.open += r.n;
//             else if (r._id.s === "submitted") t.submitted += r.n;
//             else if (r._id.s === "completed") t.completed += r.n;
//             t.overdue += r.late;
//             tasks.set(k, t);
//         });
//         const goals = new Map(goalRows.map((g) => [String(g._id), { total: g.total, completed: g.done, avgProgress: Math.round(g.avg || 0) }]));
//         const dMap = new Map(deps.map((d) => [String(d._id), d.name]));
//         const gMap = new Map(desigs.map((d) => [String(d._id), d.title]));

//         const members = list.map((e) => {
//             const u = userFor(e);
//             return {
//                 _id: e._id, name: e.name, employeeId: e.employeeId, email: e.email, phone: e.phone, dateOfJoining: e.dateOfJoining,
//                 employeeStatus: e.employeeStatus || "Active",
//                 designation: nameOf(gMap, e.designation), department: nameOf(dMap, e.department),
//                 userId: u ? u._id : null, hasLogin: Boolean(u), loginActive: u ? u.isActive !== false : false,
//                 tasks: (u && tasks.get(String(u._id))) || { open: 0, submitted: 0, completed: 0, overdue: 0 },
//                 goals: goals.get(String(e._id)) || { total: 0, completed: 0, avgProgress: 0 },
//             };
//         });

//         const sum = (f) => members.reduce((s, m) => s + f(m), 0);
//         const withGoals = members.filter((m) => m.goals.total > 0);
//         res.json({
//             success: true, manager: { _id: boss._id, name: boss.name, employeeId: boss.employeeId },
//             summary: {
//                 members: members.length, withLogin: members.filter((m) => m.hasLogin).length,
//                 openTasks: sum((m) => m.tasks.open), submitted: sum((m) => m.tasks.submitted), overdue: sum((m) => m.tasks.overdue),
//                 avgGoalProgress: withGoals.length ? Math.round(withGoals.reduce((s, m) => s + m.goals.avgProgress, 0) / withGoals.length) : 0,
//             },
//             members,
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/employees/manager-options  (admin / hr: people who can be a reporting manager)
// const getManagerOptions = async (req, res, next) => {
//     try {
//         const users = await User.find({ role: { $in: MANAGER_ROLES }, isActive: { $ne: false }, employee: { $ne: null } })
//             .select("role employee").populate("employee", "name employeeId email").lean();
//         const managers = await Promise.all(
//             users.filter((u) => u.employee?.name).map(async (u) => ({
//                 _id: u.employee._id, name: u.employee.name, employeeId: u.employee.employeeId, role: u.role,
//                 reportees: await Employee.countDocuments(teamFilter(u.employee)),
//             }))
//         );
//         managers.sort((a, b) => a.name.localeCompare(b.name));
//         res.json({ success: true, managers });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/employees/assign-team  body: { manager: employeeId | "" , employees: [employeeId] }  (admin / hr)
// const assignTeam = async (req, res, next) => {
//     try {
//         if (!canManage(req)) return deny(res, "Only admin or HR can assign a team.");
//         const ids = [...new Set((req.body?.employees || []).map(String))].filter((i) => mongoose.isValidObjectId(i));
//         if (!ids.length) return res.status(400).json({ message: "Please select at least one employee." });
//         if (ids.length > 200) return res.status(400).json({ message: "Please select up to 200 employees at a time." });

//         const m = await resolveManager(req.body?.manager, null);
//         if (m.error) return res.status(400).json({ message: m.error });
//         if (m.boss) {
//             if (ids.includes(String(m.boss._id))) return res.status(400).json({ message: "A manager cannot be in his own team." });
//             const up = await ancestors(m.boss);
//             if (ids.some((i) => up.has(i))) return res.status(400).json({ message: "One of the selected people is above this manager. That would make a loop." });
//         }

//         const r = await Employee.updateMany({ _id: { $in: ids } }, { $set: { reportingManager: m.value } });
//         await logActivity(req, m.boss ? `Assigned ${r.modifiedCount} employees to manager ${m.boss.name}` : `Removed the reporting manager of ${r.modifiedCount} employees`);
//         res.json({ success: true, updated: r.modifiedCount, message: m.boss ? `${r.modifiedCount} employees now report to ${m.boss.name}.` : `${r.modifiedCount} employees have no manager now.` });
//     } catch (err) {
//         next(err);
//     }
// };

// module.exports = {
//     getEmployees,
//     getMyProfile,
//     updateMyProfile,
//     // getMe: getMyProfile,
//     getMe,
//     getEmployeeById,
//     getEmployee: getEmployeeById,
//     createEmployee,
//     updateEmployee,
//     deleteEmployee,
//     exitEmployee,
//     getTeam,
//     getManagerOptions,
//     assignTeam,
// };





