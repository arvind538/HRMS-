const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Employee = require("../models/Employee");
const User = require("../models/User");
const ActivityLog = require("../models/activityLogModel");

const GENDERS = ["male", "female", "other"];
const ROLES = ["Employee", "Manager", "HR", "Admin"];
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
const PASSWORD_MESSAGE =
    "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number.";
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const AADHAAR_REGEX = /^[2-9]\d{11}$/;
const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
const CI = { locale: "en", strength: 2 }; // case-insensitive email match

/* ----------------------------- helpers ----------------------------- */

const str = (v) => (v === undefined || v === null ? "" : String(v).trim());
const rawStr = (v) => (v === undefined || v === null ? "" : String(v)); // base64 and passwords (no trim)
const lower = (v) => str(v).toLowerCase();
const upper = (v) => str(v).toUpperCase();
const digits = (v) => str(v).replace(/\D/g, "");

// id ya {_id} object ho to usse plain string bana do
const refString = (v) => {
    if (v && typeof v === "object") return String(v._id || v.id || "").trim();
    return str(v);
};

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
// const findMyEmployee = async (req) => {
//     const linked = req.user?.employee ? req.user.employee._id || req.user.employee : null;
//     if (linked && mongoose.isValidObjectId(linked)) {
//         const byLink = await Employee.findById(linked);
//         if (byLink) return byLink;
//     }
//     const email = lower(req.user?.email);
//     if (!email) return null;
//     return Employee.findOne({ $or: [{ email }, { loginEmail: email }] });
// };

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

const handleError = (res, error, fallbackMessage) => {
    console.error(fallbackMessage, error);

    if (error.name === "ValidationError") {
        const message = Object.values(error.errors).map((e) => e.message).join(", ");
        return res.status(400).json({ message });
    }
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || "field";
        return res.status(409).json({ message: `A record with this ${field} already exists.` });
    }
    return res.status(500).json({ message: fallbackMessage });
};

const generateEmployeeId = async () => {
    let counter = (await Employee.countDocuments()) + 1;
    let employeeId = `EMP${String(counter).padStart(4, "0")}`;
    while (await Employee.exists({ employeeId })) {
        counter++;
        employeeId = `EMP${String(counter).padStart(4, "0")}`;
    }
    return employeeId;
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
    setIf("phone", body.phone);
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
    setIf("reportingManager", body.reportingManager, refString);
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

/* Format checks done on the server, because the browser can be bypassed */
const validateInput = (data, isCreate) => {
    if (data.email && !EMAIL_REGEX.test(data.email)) return "Please enter a valid personal email address.";
    if (data.loginEmail && !EMAIL_REGEX.test(data.loginEmail)) return "Please enter a valid login email address.";

    if (isCreate || data.aadhaarNumber) {
        if (!AADHAAR_REGEX.test(data.aadhaarNumber || "")) {
            return "Aadhaar number must be 12 digits and cannot start with 0 or 1.";
        }
    }
    if (isCreate || data.panNumber) {
        if (!PAN_REGEX.test(data.panNumber || "")) {
            return "Enter a valid PAN number (for example, ABCDE1234F).";
        }
    }
    return null;
};

// employeeId / emails / Aadhaar / PAN duplicate check
const findDuplicate = async (data, excludeId) => {
    const notSelf = excludeId ? { _id: { $ne: excludeId } } : {};
    const checks = [];

    if (data.employeeId) checks.push([{ employeeId: data.employeeId }, "Employee ID", data.employeeId]);
    if (data.email) checks.push([{ email: data.email }, "Personal email", data.email]);
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

// @route POST /api/employees  (admin / hr)
// Admin: profile + login account. HR: profile only (the admin adds the login later).
const createEmployee = async (req, res) => {
    let saved = null;
    try {
        if (!canManage(req)) return deny(res, "Only admin or HR can add employees.");
        const admin = isAdmin(req);

        const data = buildEmployeeData(req.body || {});
        const password = admin ? rawStr(req.body?.password) : "";

        if (req.files?.avatar?.[0]) data.avatar = `/uploads/${req.files.avatar[0].filename}`;
        if (!data.employeeId) data.employeeId = await generateEmployeeId();

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

        const invalid = validateInput(data, true);
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
// Login email, password and role can be changed by the admin only.
const updateEmployee = async (req, res) => {
    try {
        if (!canManage(req)) return deny(res, "Only admin or HR can update employees.");
        const admin = isAdmin(req);

        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(404).json({ message: "Employee record not found." });
        }

        const current = await Employee.findById(id).select(
            "_id name email loginEmail employeeId role employeeStatus"
        );
        if (!current) return res.status(404).json({ message: "Employee record not found." });

        const data = buildEmployeeData(req.body || {});
        if (req.files?.avatar?.[0]) data.avatar = `/uploads/${req.files.avatar[0].filename}`;

        if (!admin) {
            // HR can never touch the login email or the role
            delete data.loginEmail;
            delete data.role;
        } else if (!data.loginEmail && !current.loginEmail && (data.email || current.email)) {
            // Old records without a login email: use the personal email
            data.loginEmail = data.email || current.email;
        }

        const invalid = validateInput(data, false);
        if (invalid) return res.status(400).json({ message: invalid });

        const dupMessage = await findDuplicate(data, id);
        if (dupMessage) return res.status(409).json({ message: dupMessage });

        /* Check everything about the login account BEFORE saving anything */
        const newPassword = admin ? rawStr(req.body?.password) : "";
        if (newPassword && !PASSWORD_REGEX.test(newPassword)) {
            return res.status(400).json({ message: PASSWORD_MESSAGE });
        }

        const linkedUser = await findLinkedUser(current);
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

        /* Save the profile */
        const updated = await Employee.findByIdAndUpdate(
            id,
            { $set: data },
            { returnDocument: "after", runValidators: true }
        );

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

            const update = {};
            if (Object.keys(set).length) update.$set = set;
            if (Object.keys(unset).length) update.$unset = unset;
            if (Object.keys(update).length) await User.updateOne({ _id: linkedUser._id }, update);
        } else if (newPassword) {
            // Employee who never had a login (for example, added by HR): the admin creates it now
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

        await logActivity(req, `Updated employee profile: ${updated.name} (${updated.employeeId})`);

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
            const own = me.toObject();
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

        const employees = await Employee.find(filter).select(hidden).sort({ createdAt: -1 });

        return res.status(200).json(employees);
    } catch (err) {
        next(err);
    }
};

// @route GET /api/employees/profile and /api/employees/me  (logged-in user's own profile)
const getMyProfile = async (req, res, next) => {
    try {
        const employee = await findMyEmployee(req);
        if (employee) return res.status(200).json(employee);

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
            const phone = digits(req.body.phone).slice(-10);
            if (!/^[6-9]\d{9}$/.test(phone)) {
                return res.status(400).json({ message: "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9." });
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
        if (employee) return res.status(200).json(employee);

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

        if (!manage && !self && roleOf(req) !== "manager") {
            return deny(res, "You can only view your own profile.");
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
        if (linkedUser) await User.deleteOne({ _id: linkedUser._id }); // login stops immediately

        await logActivity(req, `Deleted employee profile: ${employee.name}`);

        return res.status(200).json({ message: "Employee removed successfully" });
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

        await logActivity(req, `Processed exit for employee: ${employee.name}`);

        return res.status(200).json(employee);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getEmployees,
    getMyProfile,
    updateMyProfile,
    // getMe: getMyProfile,
    getMe,
    getEmployeeById,
    getEmployee: getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    exitEmployee,
};





// const mongoose = require("mongoose");
// const Employee = require("../models/Employee");
// const ActivityLog = require("../models/activityLogModel");

// const GENDERS = ["male", "female", "other"];
// const ROLES = ["Employee", "Manager", "HR", "Admin"];

// /* ----------------------------- helpers ----------------------------- */

// const str = (v) => (v === undefined || v === null ? "" : String(v).trim());
// const rawStr = (v) => (v === undefined || v === null ? "" : String(v)); // base64 ke liye (trim nahi)

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
//  * Sirf wahi keys aati hain jo body me bheji gayi hain,
//  * isliye partial update (jaise sirf avatar ya status) baaki data nahi mitata.
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
//     setIf("employeeId", body.employeeId, (v) => str(v).toUpperCase(), true);
//     setIf("firstName", body.firstName);
//     setIf("lastName", body.lastName);
//     setIf("name", body.name, str, true);
//     if (data.name === undefined && (body.firstName !== undefined || body.lastName !== undefined)) {
//         const full = `${str(body.firstName)} ${str(body.lastName)}`.trim();
//         if (full) data.name = full;
//     }
//     setIf("email", body.email, (v) => str(v).toLowerCase(), true);
//     setIf("loginEmail", body.loginEmail, (v) => str(v).toLowerCase());
//     setIf("phone", body.phone);
//     setIf("gender", body.gender, (v) => str(v).toLowerCase(), true);
//     if (data.gender && !GENDERS.includes(data.gender)) delete data.gender;
//     setIf("timeZone", body.timeZone);
//     setIf("avatar", body.avatar, rawStr);

//     /* Address (flat) */
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
//     setIf("idProofNumber", body.idProofNumber !== undefined ? body.idProofNumber : body.nationalId);

//     /* Bank */
//     ["accountName", "bankName", "branchName", "accountNumber"].forEach((k) =>
//         setIf(`bankDetails.${k}`, flatOrNested(k, bank[k]))
//     );
//     setIf("bankDetails.ifscCode", flatOrNested("ifscCode", bank.ifscCode), (v) => str(v).toUpperCase());

//     /* Documents (base64 images) */
//     [
//         "nationalIdFrontFileName",
//         "nationalIdFrontFileData",
//         "nationalIdBackFileName",
//         "nationalIdBackFileData",
//         "passportPhotoFileName",
//         "passportPhotoData",
//     ].forEach((k) => setIf(`documents.${k}`, docs[k] !== undefined ? docs[k] : body[k], rawStr));

//     return data;
// };

// // employeeId / email / ID document number duplicate check
// const findDuplicate = async (data, excludeId) => {
//     const notSelf = excludeId ? { _id: { $ne: excludeId } } : {};
//     const checks = [
//         ["employeeId", "Employee ID"],
//         ["email", "Email"],
//         ["idProofNumber", "Document ID number"],
//     ];
//     for (const [field, label] of checks) {
//         if (!data[field]) continue;
//         const dup = await Employee.exists({ [field]: data[field], ...notSelf });
//         if (dup) return `${label} "${data[field]}" is already registered with another employee.`;
//     }
//     return null;
// };

// /* ----------------------------- handlers ----------------------------- */

// // @route POST /api/employees
// const createEmployee = async (req, res) => {
//     try {
//         const data = buildEmployeeData(req.body || {});

//         if (req.files?.avatar?.[0]) data.avatar = `/uploads/${req.files.avatar[0].filename}`;
//         if (!data.employeeId) data.employeeId = await generateEmployeeId();
//         if (!data.loginEmail && data.email) data.loginEmail = data.email;

//         const missing = ["name", "email", "designation", "department"].filter((k) => !data[k]);
//         if (missing.length) {
//             return res.status(400).json({ message: `Required fields missing: ${missing.join(", ")}` });
//         }

//         const dupMessage = await findDuplicate(data);
//         if (dupMessage) return res.status(409).json({ message: dupMessage });

//         const employee = new Employee();
//         for (const [path, value] of Object.entries(data)) employee.set(path, value);
//         const saved = await employee.save();

//         await logActivity(req, `Created new employee profile: ${saved.name} (${saved.employeeId})`);

//         return res.status(201).json({
//             success: true,
//             message: "Employee registered successfully",
//             employee: saved,
//             data: saved,
//         });
//     } catch (error) {
//         return handleError(res, error, "Failed to save employee.");
//     }
// };

// // @route PUT /api/employees/:id
// const updateEmployee = async (req, res) => {
//     try {
//         const { id } = req.params;
//         if (!mongoose.isValidObjectId(id)) {
//             return res.status(404).json({ message: "Employee record not found." });
//         }

//         const existing = await Employee.exists({ _id: id });
//         if (!existing) return res.status(404).json({ message: "Employee record not found." });

//         const data = buildEmployeeData(req.body || {});
//         if (req.files?.avatar?.[0]) data.avatar = `/uploads/${req.files.avatar[0].filename}`;

//         const dupMessage = await findDuplicate(data, id);
//         if (dupMessage) return res.status(409).json({ message: dupMessage });

//         const updated = await Employee.findByIdAndUpdate(
//             id,
//             { $set: data },
//             { returnDocument: "after", runValidators: true }
//         );

//         await logActivity(req, `Updated employee profile: ${updated.name} (${updated.employeeId})`);

//         return res.status(200).json({
//             success: true,
//             message: "Employee updated successfully",
//             employee: updated,
//             data: updated,
//         });
//     } catch (error) {
//         return handleError(res, error, "Failed to update employee profile.");
//     }
// };

// // @route GET /api/employees
// const getEmployees = async (req, res, next) => {
//     try {
//         const { status, department, search } = req.query;
//         const filter = {};

//         if (status) filter.employeeStatus = status;
//         if (department) filter.department = department;
//         if (search && String(search).trim()) {
//             const rx = new RegExp(escapeRegex(String(search).trim()), "i");
//             filter.$or = [{ name: rx }, { email: rx }, { employeeId: rx }];
//         }

//         // list me heavy base64 documents aur bank details ki zaroorat nahi
//         const employees = await Employee.find(filter)
//             .select("-documents -bankDetails")
//             .sort({ createdAt: -1 });

//         return res.status(200).json(employees);
//     } catch (err) {
//         next(err);
//     }
// };



// // @route GET /api/employees/profile  (logged-in user ka profile)
// const getMyProfile = async (req, res, next) => {
//     try {
//         const email = str(req.user?.email).toLowerCase();

//         if (!email) {
//             return res.status(404).json({
//                 message: "Employee profile not found. Please contact HR to link your profile.",
//             });
//         }

//         const employee = await Employee.findOne({ $or: [{ email }, { loginEmail: email }] });

//         if (!employee) {
//             return res.status(404).json({
//                 message: "Employee profile not found. Please contact HR to link your profile.",
//             });
//         }

//         return res.status(200).json(employee);
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

//         return res.status(200).json({ success: true, data: employee, employee });
//     } catch (error) {
//         next(error);
//     }
// };

// // @route DELETE /api/employees/:id
// const deleteEmployee = async (req, res, next) => {
//     try {
//         if (!mongoose.isValidObjectId(req.params.id)) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         const employee = await Employee.findByIdAndDelete(req.params.id);
//         if (!employee) return res.status(404).json({ message: "Employee not found" });

//         await logActivity(req, `Deleted employee profile: ${employee.name}`);

//         return res.status(200).json({ message: "Employee removed successfully" });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/employees/:id/exit
// const exitEmployee = async (req, res, next) => {
//     try {
//         if (!mongoose.isValidObjectId(req.params.id)) {
//             return res.status(404).json({ message: "Employee not found" });
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
//         );

//         if (!employee) return res.status(404).json({ message: "Employee not found" });

//         await logActivity(req, `Processed exit for employee: ${employee.name}`);

//         return res.status(200).json(employee);
//     } catch (err) {
//         next(err);
//     }
// };

// module.exports = {
//     getEmployees,
//     getMyProfile,
//     getEmployeeById,
//     getEmployee: getEmployeeById,
//     createEmployee,
//     updateEmployee,
//     deleteEmployee,
//     exitEmployee,
// };



// const mongoose = require("mongoose");
// const Employee = require("../models/Employee");
// const ActivityLog = require("../models/activityLogModel");

// // Helper: Generate next unique Employee ID if not provided
// const generateEmployeeId = async () => {
//     const count = await Employee.countDocuments();
//     let counter = count + 1;
//     let employeeId = `EMP${String(counter).padStart(4, "0")}`;
//     let exists = await Employee.findOne({ employeeId });
//     while (exists) {
//         counter++;
//         employeeId = `EMP${String(counter).padStart(4, "0")}`;
//         exists = await Employee.findOne({ employeeId });
//     }
//     return employeeId;
// };

// // Helper: Safely resolve reportingManager to prevent Cast to ObjectId error
// const sanitizeManager = (val) => {
//     if (!val || typeof val !== "string" || val.trim() === "") return null;
//     const str = val.trim();
//     if (mongoose.Types.ObjectId.isValid(str) && str.length === 24) {
//         return new mongoose.Types.ObjectId(str);
//     }
//     return str;
// };

// // Helper: Safely cast valid ObjectId or return null
// const sanitizeObjectId = (val) => {
//     if (!val || typeof val !== "string" || val.trim() === "") return null;
//     const str = val.trim();
//     return mongoose.Types.ObjectId.isValid(str) && str.length === 24 ? new mongoose.Types.ObjectId(str) : null;
// };

// // @route POST /api/employees
// const createEmployee = async (req, res, next) => {
//     try {
//         const body = req.body;

//         const employeeId = body.employeeId?.trim() || (await generateEmployeeId());
//         const email = body.email?.trim().toLowerCase();
//         const panNumber = body.panNumber?.trim().toUpperCase() || undefined;
//         const idProofNumber = body.idProofNumber?.trim() || undefined;

//         // 1. Check duplicate Employee ID
//         const existingEmpId = await Employee.findOne({ employeeId });
//         if (existingEmpId) {
//             return res.status(409).json({
//                 message: `Employee ID "${employeeId}" already exists. Please provide a unique ID.`,
//             });
//         }

//         // 2. Check duplicate Email
//         const existingEmail = await Employee.findOne({ email });
//         if (existingEmail) {
//             return res.status(409).json({
//                 message: `Email "${email}" is already registered with another employee.`,
//             });
//         }

//         // 3. Check duplicate PAN Number
//         if (panNumber) {
//             const existingPan = await Employee.findOne({ panNumber });
//             if (existingPan) {
//                 return res.status(409).json({
//                     message: `PAN Number "${panNumber}" already exists in records.`,
//                 });
//             }
//         }

//         // 4. Check duplicate Government / Identity Proof Number
//         if (idProofNumber) {
//             const existingDocId = await Employee.findOne({ idProofNumber });
//             if (existingDocId) {
//                 return res.status(409).json({
//                     message: `Document ID Number "${idProofNumber}" is already registered with another employee.`,
//                 });
//             }
//         }

//         // File upload paths (Multer vs Body fallback)
//         const avatar = req.files?.avatar ? `/uploads/${req.files.avatar[0].filename}` : body.avatar || "";
//         const resumeUrl = req.files?.resume ? `/uploads/${req.files.resume[0].filename}` : body.resumeFileData || "";
//         const resumeFileName = req.files?.resume ? req.files.resume[0].originalname : body.resumeFileName || "";
//         const idProofUrl = req.files?.idProof ? `/uploads/${req.files.idProof[0].filename}` : body.idProofFileData || "";
//         const idProofFileName = req.files?.idProof ? req.files.idProof[0].originalname : body.idProofFileName || "";

//         const newEmployee = new Employee({
//             employeeId,
//             name: body.name?.trim(),
//             email,
//             loginEmail: (body.loginEmail || email).trim().toLowerCase(),
//             phone: body.phone?.trim() || "",
//             gender: body.gender || "male",
//             dateOfBirth: body.dateOfBirth || null,
//             bloodGroup: body.bloodGroup || "",
//             maritalStatus: body.maritalStatus || "",
//             avatar,

//             designation: sanitizeObjectId(body.designation) || body.designation,
//             department: sanitizeObjectId(body.department) || body.department,
//             branch: body.branch?.trim() || "Main Campus",
//             employmentType: body.employmentType || "Full-time",
//             reportingManager: sanitizeManager(body.reportingManager),
//             dateOfJoining: body.dateOfJoining || null,
//             employeeStatus: body.employeeStatus || "Active",
//             role: body.role || "Employee",

//             salary: Number(body.salary) || 0,
//             bankDetails: {
//                 bankName: body.bankName?.trim() || body.bankDetails?.bankName?.trim() || "",
//                 accountNumber: body.accountNumber?.trim() || body.bankDetails?.accountNumber?.trim() || "",
//                 ifscCode: (body.ifscCode || body.bankDetails?.ifscCode || "").trim().toUpperCase(),
//                 paymentMode: body.paymentMode || body.bankDetails?.paymentMode || "Bank Transfer",
//             },
//             panNumber,
//             uanNumber: body.uanNumber?.trim() || "",

//             emergencyContact: {
//                 name: body.emergencyContactName?.trim() || body.emergencyContact?.name?.trim() || "",
//                 relation: body.emergencyContactRelation?.trim() || body.emergencyContact?.relation?.trim() || "",
//                 phone: body.emergencyContactPhone?.trim() || body.emergencyContact?.phone?.trim() || "",
//             },

//             residentialAddress: {
//                 street: body.address?.trim() || body.residentialAddress?.street?.trim() || "",
//                 city: body.city?.trim() || body.residentialAddress?.city?.trim() || "",
//                 state: body.state?.trim() || body.residentialAddress?.state?.trim() || "",
//                 pincode: body.pincode?.trim() || body.residentialAddress?.pincode?.trim() || "",
//             },

//             education: {
//                 highestQualification: body.highestQualification?.trim() || body.education?.highestQualification?.trim() || "",
//                 instituteName: body.instituteName?.trim() || body.education?.instituteName?.trim() || "",
//                 yearOfPassing: body.yearOfPassing ? Number(body.yearOfPassing) : null,
//             },

//             experience: {
//                 previousCompany: body.previousCompany?.trim() || body.experience?.previousCompany?.trim() || "",
//                 previousDesignation: body.previousDesignation?.trim() || body.experience?.previousDesignation?.trim() || "",
//                 years: body.previousExperienceYears ? Number(body.previousExperienceYears) : 0,
//             },

//             idProofType: body.idProofType?.trim() || "",
//             idProofNumber,
//             documents: {
//                 resumeUrl,
//                 resumeFileName,
//                 idProofUrl,
//                 idProofFileName,
//             },
//         });

//         const saved = await newEmployee.save();

//         try {
//             const userId = req.user?.id || req.user?._id || null;
//             if (ActivityLog) {
//                 await ActivityLog.create({
//                     user: userId,
//                     action: `Created new employee profile: ${saved.name} (${saved.employeeId})`,
//                     module: "Employee",
//                 });
//             }
//         } catch (logErr) {
//             console.error("Activity log error:", logErr.message);
//         }

//         return res.status(201).json({
//             success: true,
//             message: "Employee registered successfully",
//             employee: saved,
//         });
//     } catch (error) {
//         console.error("Employee Creation Error:", error);
//         if (error.code === 11000) {
//             const field = Object.keys(error.keyPattern || {})[0] || "field";
//             return res.status(409).json({
//                 message: `A record with this ${field} already exists. It must be unique.`,
//             });
//         }
//         return res.status(500).json({ message: "Internal server error. Failed to save employee." });
//     }
// };

// // @route PUT /api/employees/:id
// const updateEmployee = async (req, res, next) => {
//     try {
//         const { id } = req.params;
//         const body = req.body;

//         const existing = await Employee.findById(id);
//         if (!existing) {
//             return res.status(404).json({ message: "Employee record not found." });
//         }

//         // Validate uniqueness on update
//         if (body.employeeId && body.employeeId !== existing.employeeId) {
//             const dup = await Employee.findOne({ employeeId: body.employeeId, _id: { $ne: id } });
//             if (dup) return res.status(409).json({ message: `Employee ID "${body.employeeId}" is already taken.` });
//         }

//         if (body.email && body.email.toLowerCase() !== existing.email) {
//             const dup = await Employee.findOne({ email: body.email.toLowerCase(), _id: { $ne: id } });
//             if (dup) return res.status(409).json({ message: `Email "${body.email}" is already used by another employee.` });
//         }

//         if (body.panNumber && body.panNumber.toUpperCase() !== existing.panNumber) {
//             const dup = await Employee.findOne({ panNumber: body.panNumber.toUpperCase(), _id: { $ne: id } });
//             if (dup) return res.status(409).json({ message: `PAN Number "${body.panNumber}" is already in use.` });
//         }

//         if (body.idProofNumber && body.idProofNumber !== existing.idProofNumber) {
//             const dup = await Employee.findOne({ idProofNumber: body.idProofNumber, _id: { $ne: id } });
//             if (dup) return res.status(409).json({ message: `Document ID Number "${body.idProofNumber}" is already registered.` });
//         }

//         const updateData = {
//             ...body,
//             reportingManager: body.reportingManager ? sanitizeManager(body.reportingManager) : existing.reportingManager,
//             department: body.department ? (sanitizeObjectId(body.department) || body.department) : existing.department,
//             designation: body.designation ? (sanitizeObjectId(body.designation) || body.designation) : existing.designation,
//         };

//         // Preserve and merge nested documents if files are uploaded
//         if (req.files?.avatar) updateData.avatar = `/uploads/${req.files.avatar[0].filename}`;
//         if (req.files?.resume) {
//             updateData["documents.resumeUrl"] = `/uploads/${req.files.resume[0].filename}`;
//             updateData["documents.resumeFileName"] = req.files.resume[0].originalname;
//         }
//         if (req.files?.idProof) {
//             updateData["documents.idProofUrl"] = `/uploads/${req.files.idProof[0].filename}`;
//             updateData["documents.idProofFileName"] = req.files.idProof[0].originalname;
//         }

//         const updated = await Employee.findByIdAndUpdate(
//             id,
//             { $set: updateData },
//             { new: true, runValidators: true }
//         )
//             .populate("department", "name")
//             .populate({
//                 path: "reportingManager",
//                 select: "name firstName lastName designation",
//                 match: { _id: { $exists: true } },
//             })
//             .populate("designation", "title name");

//         try {
//             const userId = req.user?.id || req.user?._id || null;
//             if (ActivityLog) {
//                 await ActivityLog.create({
//                     user: userId,
//                     action: `Updated employee profile: ${updated.name} (${updated.employeeId})`,
//                     module: "Employee",
//                 });
//             }
//         } catch (logErr) {
//             console.error("Activity log error:", logErr.message);
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Employee updated successfully",
//             employee: updated,
//             data: updated,
//         });
//     } catch (error) {
//         if (error.code === 11000) {
//             const field = Object.keys(error.keyPattern || {})[0] || "field";
//             return res.status(409).json({ message: `${field} must be unique across all employees.` });
//         }
//         return res.status(500).json({ message: "Failed to update employee profile." });
//     }
// };

// // @route GET /api/employees
// const getEmployees = async (req, res, next) => {
//     try {
//         const { status, department, search } = req.query;
//         let filter = {};

//         if (status) filter.employeeStatus = status;
//         if (department) filter.department = department;
//         if (search) filter.name = { $regex: search, $options: "i" };

//         const employees = await Employee.find(filter)
//             .populate("department", "name")
//             .populate({
//                 path: "reportingManager",
//                 select: "name firstName lastName designation",
//                 match: { _id: { $exists: true } },
//             })
//             .populate("designation", "title name")
//             .sort({ createdAt: -1 });

//         return res.status(200).json(employees);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/employees/profile
// const getMyProfile = async (req, res, next) => {
//     try {
//         const userId = req.user?.id || req.user?._id;
//         const userEmail = req.user?.email;
//         const userName = req.user?.name || req.user?.username || "Staff Member";

//         let employee = null;

//         if (userId || userEmail) {
//             employee = await Employee.findOne({
//                 $or: [
//                     ...(userId ? [{ user: userId }, { userId: userId }, { _id: userId }] : []),
//                     ...(userEmail ? [{ email: userEmail }] : [])
//                 ]
//             })
//                 .populate("department", "name")
//                 .populate({
//                     path: "reportingManager",
//                     select: "name firstName lastName designation",
//                     match: { _id: { $exists: true } },
//                 })
//                 .populate("designation", "title name");
//         }

//         if (!employee && userId) {
//             try {
//                 const employeeId = await generateEmployeeId();
//                 const uniqueEmail = userEmail || `employee_${userId}_${Date.now()}@company.com`;

//                 employee = await Employee.create({
//                     user: userId,
//                     name: userName,
//                     email: uniqueEmail,
//                     employeeId: employeeId,
//                     designation: req.user?.role || "Staff Member",
//                     employeeStatus: "Active",
//                     dateOfJoining: new Date()
//                 });
//             } catch (createErr) {
//                 if (createErr.code === 11000) {
//                     const fallbackEmail = userEmail || `employee_${userId}@company.com`;
//                     employee = await Employee.findOneAndUpdate(
//                         { email: fallbackEmail },
//                         { user: userId, name: userName },
//                         { new: true, upsert: false }
//                     );
//                 } else {
//                     throw createErr;
//                 }
//             }
//         }

//         if (!employee) {
//             return res.status(404).json({
//                 message: "Employee profile not found. Please contact HR to link your profile."
//             });
//         }

//         return res.status(200).json(employee);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/employees/:id
// const getEmployeeById = async (req, res, next) => {
//     try {
//         const employee = await Employee.findById(req.params.id)
//             .populate("department", "name")
//             .populate({
//                 path: "reportingManager",
//                 select: "name firstName lastName designation",
//                 match: { _id: { $exists: true } },
//             })
//             .populate("designation", "title name");

//         if (!employee) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         return res.status(200).json({
//             success: true,
//             data: employee,
//             employee: employee,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// // @route DELETE /api/employees/:id
// const deleteEmployee = async (req, res, next) => {
//     try {
//         const employee = await Employee.findByIdAndDelete(req.params.id);

//         if (!employee) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         try {
//             const userId = req.user?.id || req.user?._id || null;
//             if (ActivityLog) {
//                 await ActivityLog.create({
//                     user: userId,
//                     action: `Deleted employee profile: ${employee.name}`,
//                     module: "Employee",
//                 });
//             }
//         } catch (logErr) {
//             console.error("Activity log error:", logErr.message);
//         }

//         return res.status(200).json({ message: "Employee removed successfully" });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/employees/:id/exit
// const exitEmployee = async (req, res, next) => {
//     try {
//         const exitDate = req.body.exitDate || new Date();
//         const exitReason = req.body.exitReason || req.body.reason || "Separated from organization";

//         const employee = await Employee.findByIdAndUpdate(
//             req.params.id,
//             {
//                 status: "Exited",               // Frontend aur general queries ke liye
//                 employeeStatus: "Exited",       // Legacy schema ke liye
//                 isActive: false,              // Status flag
//                 isExited: true,               // Boolean flag
//                 exitDate: exitDate,
//                 exitReason: exitReason,
//             },
//             { returnDocument: "after" }       // Deprecation warning fix
//         ).populate("department designation");

//         if (!employee) {
//             return res.status(404).json({ message: "Employee not found" });
//         }

//         try {
//             const userId = req.user?.id || req.user?._id || null;
//             if (typeof ActivityLog !== "undefined" && ActivityLog) {
//                 await ActivityLog.create({
//                     user: userId,
//                     action: `Processed exit for employee: ${employee.name || employee.firstName || "Staff Member"}`,
//                     module: "Employee",
//                 });
//             }
//         } catch (logErr) {
//             console.error("Activity log error:", logErr.message);
//         }

//         return res.status(200).json(employee);
//     } catch (err) {
//         next(err);
//     }
// };

// module.exports = {
//     getEmployees,
//     getMyProfile,
//     getEmployeeById,
//     getEmployee: getEmployeeById,
//     createEmployee,
//     updateEmployee,
//     deleteEmployee,
//     exitEmployee,
// };






// // const Employee = require("../models/employeeModel");
// // const ActivityLog = require("../models/activityLogModel");

// // // @route GET /api/employees
// // exports.getEmployees = async (req, res, next) => {
// //     try {
// //         const { status, department, search } = req.query;
// //         let filter = {};

// //         if (status) filter.status = status;
// //         if (department) filter.department = department;
// //         if (search) filter.name = { $regex: search, $options: "i" };

// //         const employees = await Employee.find(filter)
// //             .populate("department", "name")
// //             .populate("reportingManager", "name")
// //             .sort({ createdAt: -1 });

// //         res.json(employees);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route GET /api/employees/profile
// // exports.getMyProfile = async (req, res, next) => {
// //     try {
// //         // Pehle ID se dhoondo, agar na mile toh email se try karo
// //         let employee = await Employee.findById(req.user?.id)
// //             .populate("department", "name")
// //             .populate("reportingManager", "name");

// //         if (!employee && req.user?.email) {
// //             employee = await Employee.findOne({ email: req.user.email })
// //                 .populate("department", "name")
// //                 .populate("reportingManager", "name");
// //         }

// //         if (!employee) {
// //             // Agar employee profile bani hi nahi hai, toh 404 ki jagah ek basic object ya message dein
// //             return res.status(404).json({
// //                 message: "Employee profile not found. Please contact HR to create your profile."
// //             });
// //         }

// //         res.json(employee);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route GET /api/employees/:id
// // exports.getEmployee = async (req, res, next) => {
// //     try {
// //         const employee = await Employee.findById(req.params.id)
// //             .populate("department", "name")
// //             .populate("reportingManager", "name");

// //         if (!employee) {
// //             return res.status(404).json({ message: "Employee not found" });
// //         }
// //         res.json(employee);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route POST /api/employees
// // exports.createEmployee = async (req, res, next) => {
// //     try {
// //         const count = await Employee.countDocuments();
// //         const employeeId = `EMP${String(count + 1).padStart(4, "0")}`;

// //         const employee = await Employee.create({ ...req.body, employeeId });

// //         // ✅ Safe Activity Log Saving
// //         try {
// //             const userId = req.user?.id || req.body.userId || null;

// //             await ActivityLog.create({
// //                 user: userId,
// //                 action: `Created new employee profile: ${employee.name} (${employee.employeeId})`,
// //                 module: "Employee",
// //             });
// //             console.log("Activity log saved successfully!");
// //         } catch (logErr) {
// //             console.error("❌ ACTIVITY LOG SAVE ERROR:", logErr.message);
// //         }

// //         res.status(201).json(employee);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route PUT /api/employees/:id
// // exports.updateEmployee = async (req, res, next) => {
// //     try {
// //         const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
// //             new: true,
// //             runValidators: true,
// //         });

// //         if (!employee) {
// //             return res.status(404).json({ message: "Employee not found" });
// //         }

// //         // ✅ Safe Activity Log Saving
// //         try {
// //             await ActivityLog.create({
// //                 user: req.user?.id || null,
// //                 action: `Updated employee record: ${employee.name}`,
// //                 module: "Employee",
// //             });
// //         } catch (logErr) {
// //             console.error("Failed to save activity log:", logErr.message);
// //         }

// //         res.json(employee);
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route DELETE /api/employees/:id
// // exports.deleteEmployee = async (req, res, next) => {
// //     try {
// //         const employee = await Employee.findByIdAndDelete(req.params.id);

// //         if (!employee) {
// //             return res.status(404).json({ message: "Employee not found" });
// //         }

// //         // ✅ Safe Activity Log Saving
// //         try {
// //             await ActivityLog.create({
// //                 user: req.user?.id || null,
// //                 action: `Deleted employee profile: ${employee.name}`,
// //                 module: "Employee",
// //             });
// //         } catch (logErr) {
// //             console.error("Failed to save activity log:", logErr.message);
// //         }

// //         res.json({ message: "Employee removed" });
// //     } catch (err) {
// //         next(err);
// //     }
// // };

// // // @route PUT /api/employees/:id/exit
// // exports.exitEmployee = async (req, res, next) => {
// //     try {
// //         const employee = await Employee.findByIdAndUpdate(
// //             req.params.id,
// //             { status: "exit", exitDate: req.body.exitDate || new Date() },
// //             { new: true }
// //         );

// //         if (!employee) {
// //             return res.status(404).json({ message: "Employee not found" });
// //         }

// //         // ✅ Safe Activity Log Saving
// //         try {
// //             await ActivityLog.create({
// //                 user: req.user?.id || null,
// //                 action: `Processed exit for employee: ${employee.name}`,
// //                 module: "Employee",
// //             });
// //         } catch (logErr) {
// //             console.error("Failed to save activity log:", logErr.message);
// //         }

// //         res.json(employee);
// //     } catch (err) {
// //         next(err);
// //     }
// // };






// // // const Employee = require("../models/Employee");

// // // // @route GET /api/employees
// // // exports.getEmployees = async (req, res, next) => {
// // //     try {
// // //         const { status, department, search } = req.query;
// // //         const filter = {};
// // //         if (status) filter.status = status;
// // //         if (department) filter.department = department;
// // //         if (search) filter.name = { $regex: search, $options: "i" };

// // //         const employees = await Employee.find(filter)
// // //             .populate("department", "name")
// // //             .populate("reportingManager", "name")
// // //             .sort({ createdAt: -1 });

// // //         res.json(employees);
// // //     } catch (err) {
// // //         next(err);
// // //     }
// // // };

// // // // @route GET /api/employees/:id
// // // exports.getEmployee = async (req, res, next) => {
// // //     try {
// // //         const employee = await Employee.findById(req.params.id)
// // //             .populate("department", "name")
// // //             .populate("reportingManager", "name");

// // //         if (!employee) return res.status(404).json({ message: "Employee not found" });
// // //         res.json(employee);
// // //     } catch (err) {
// // //         next(err);
// // //     }
// // // };

// // // // @route POST /api/employees
// // // exports.createEmployee = async (req, res, next) => {
// // //     try {
// // //         const count = await Employee.countDocuments();
// // //         const employeeId = `EMP${String(count + 1).padStart(4, "0")}`;

// // //         const employee = await Employee.create({ ...req.body, employeeId });
// // //         res.status(201).json(employee);
// // //     } catch (err) {
// // //         next(err);
// // //     }
// // // };

// // // // @route PUT /api/employees/:id
// // // exports.updateEmployee = async (req, res, next) => {
// // //     try {
// // //         const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
// // //             new: true,
// // //             runValidators: true,
// // //         });
// // //         if (!employee) return res.status(404).json({ message: "Employee not found" });
// // //         res.json(employee);
// // //     } catch (err) {
// // //         next(err);
// // //     }
// // // };

// // // // @route DELETE /api/employees/:id
// // // exports.deleteEmployee = async (req, res, next) => {
// // //     try {
// // //         const employee = await Employee.findByIdAndDelete(req.params.id);
// // //         if (!employee) return res.status(404).json({ message: "Employee not found" });
// // //         res.json({ message: "Employee removed" });
// // //     } catch (err) {
// // //         next(err);
// // //     }
// // // };

// // // // @route PUT /api/employees/:id/exit
// // // exports.exitEmployee = async (req, res, next) => {
// // //     try {
// // //         const employee = await Employee.findByIdAndUpdate(
// // //             req.params.id,
// // //             { status: "exit", exitDate: req.body.exitDate || new Date() },
// // //             { new: true }
// // //         );
// // //         if (!employee) return res.status(404).json({ message: "Employee not found" });
// // //         res.json(employee);
// // //     } catch (err) {
// // //         next(err);
// // //     }
// // // };