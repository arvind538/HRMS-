// server/controllers/authController.js
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Employee = require("../models/Employee");
const LoginHistory = require("../models/LoginHistory");
const cloudinary = require("../config/cloudinary");
const { sendEmail, resetPasswordEmail } = require("../utils/sendEmail");
const { signSession, setSessionCookie, clearSessionCookie, publicUser } = require("../utils/authSession");

const RESET_MINUTES = 15;
const RESEND_COOLDOWN_MS = 60 * 1000;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
const PASSWORD_MESSAGE =
    "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number.";
const GENERIC_MESSAGE = "If this email is registered, a password reset link has been sent.";
const CI = { locale: "en", strength: 2 }; // case-insensitive email match
const EMPLOYEE_FIELDS = "_id name employeeId designation department avatar";

// Used when the email does not exist, so a wrong email and a wrong password take the same time
const DUMMY_HASH = bcrypt.hashSync("timing-protection-only", 10);

const lower = (v) => String(v ?? "").trim().toLowerCase();
// const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const generateToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

const cleanEmail = (v) => String(v ?? "").trim().slice(0, 254);

// a***@gmail.com : safe to write in logs
const maskEmail = (e) => String(e || "").replace(/^(.).*(@.*)$/, "$1***$2");

const findUserByEmail = (email) => User.findOne({ email }).collation(CI);

/* Profile ki saari fields jo frontend ko chahiye (password/token kabhi nahi) */
const profileFields = (user) => ({
    phone: user.phone || "",
    countryCode: user.countryCode || "+91",
    gender: user.gender || "",
    address: user.address || "",
    timezone: user.timezone || "Asia/Kolkata",
    avatar: user.avatar || "",
});

/* Employee profile me name/avatar sync rakho, taaki dashboard/employee list me bhi wahi dikhe */
const syncEmployee = async (user, fields) => {
    try {
        const employeeId = user.employee?._id || user.employee;
        if (!employeeId) return;
        await Employee.updateOne({ _id: employeeId }, { $set: fields });
    } catch (e) {
        console.error("Employee sync failed:", e.message);
    }
};

/* Buffer ko Cloudinary par upload karo, secure https URL milta hai */
const uploadToCloudinary = (buffer, userId) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "hrms/avatars",
                public_id: `${userId}-${Date.now()}`,
                resource_type: "image",
                transformation: [{ width: 300, height: 300, crop: "fill", gravity: "face" }],
            },
            (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(buffer);
    });

/*
 * Finds the login account for an email and the employee profile that belongs to it.
 * The email can be the company login email or the personal email.
 */
async function findAccount(email) {
    let user = await findUserByEmail(email);
    let employee = null;

    if (!user) {
        employee = await Employee.findOne({ $or: [{ email }, { loginEmail: email }] }).select("_id name email");
        if (!employee) return null;
        user = await User.findOne({ employee: employee._id });
        return user ? { user, employee } : null;
    }

    if (user.employee) {
        employee = await Employee.findById(user.employee).select("_id name email");
    }
    if (!employee) {
        const mail = String(user.email || "").toLowerCase();
        employee = await Employee.findOne({ $or: [{ email: mail }, { loginEmail: mail }] }).select("_id name email");
    }
    return { user, employee };
}

// @route POST /api/auth/login
// exports.login = async (req, res, next) => {
//     try {
//         const email = cleanEmail(req.body?.email);
//         const password = String(req.body?.password ?? "");

//         if (!email || !password) {
//             return res.status(400).json({ message: "Email and password are required." });
//         }

//         const user = await findUserByEmail(email).populate("employee", EMPLOYEE_FIELDS);

//         // Always run one bcrypt compare, even for unknown emails
//         const tooLong = password.length > 128;
//         const isMatch = await bcrypt.compare(password.slice(0, 128), user?.password || DUMMY_HASH);

//         if (!user || !user.password || tooLong || !isMatch) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }

//         if (user.isActive === false) {
//             return res.status(403).json({ message: "Your account is disabled. Please contact admin." });
//         }

//         try {
//             await LoginHistory.create({
//                 user: user._id,
//                 ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
//                 userAgent: req.headers["user-agent"] || "Unknown",
//             });
//         } catch (historyErr) {
//             console.error("Failed to save login history:", historyErr.message);
//         }

//         let employeeProfile = user.employee;

//         // Older accounts that are not linked yet: link the existing profile by email.
//         // A new profile is NOT created here, because only admin/HR add employees.
//         if (user.role === "employee" && !employeeProfile) {
//             try {
//                 const mail = String(user.email || "").toLowerCase();
//                 const emp = await Employee.findOne({
//                     $or: [{ email: mail }, { loginEmail: mail }],
//                 }).select(EMPLOYEE_FIELDS);

//                 if (emp) {
//                     await User.updateOne({ _id: user._id }, { $set: { employee: emp._id } });
//                     employeeProfile = emp;
//                 }
//             } catch (linkErr) {
//                 console.error("Failed to link employee profile:", linkErr.message);
//             }
//         }

//         res.json({
//             _id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//             ...profileFields(user),
//             employee: employeeProfile || null,
//             token: generateToken(user._id, user.role),
//         });
//     } catch (err) {
//         next(err);
//     }
// };

exports.login = async (req, res, next) => {
    try {
        const email = lower(req.body?.email);
        const password = String(req.body?.password ?? "");
        if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

        const user = await User.findOne({ email })
            .collation({ locale: "en", strength: 2 })
            .select("+password")
            .populate("employee", "employeeId name email");

        const valid = await bcrypt.compare(password, user?.password || DUMMY_HASH);
        if (!user || !valid) return res.status(401).json({ message: "Invalid email or password." });
        if (user.isActive === false) return res.status(403).json({ message: "Your account is inactive. Please contact HR." });

        setSessionCookie(res, signSession(user)); // the token goes into the httpOnly cookie, NOT into the response body
        return res.status(200).json({ success: true, user: publicUser(user) });
    } catch (err) {
        next(err);
    }
};

exports.logout = (req, res) => {
    clearSessionCookie(res);
    res.status(200).json({ success: true, message: "Logged out." });
};



// @route GET /api/auth/me
// exports.getMe = async (req, res, next) => {
//     try {
//         const user = await User.findById(req.user._id)
//             .select("-password -passwordResetToken -passwordResetExpires -passwordResetRequestedAt")
//             .populate("employee", EMPLOYEE_FIELDS);

//         if (!user) return res.status(404).json({ message: "User not found." });

//         // Purane users jinke naye fields DB me nahi hain, unko bhi default values milengi
//         res.json({ ...user.toObject(), ...profileFields(user) });
//     } catch (err) {
//         next(err);
//     }
// };

// exports.getMe = async (req, res, next) => {
//     try {
//         const user = await User.findById(req.user._id).populate("employee", "employeeId name email");
//         res.set("Cache-Control", "no-store");
//         if (!user) {
//             clearSessionCookie(res);
//             return res.status(401).json({ message: "Please log in again." });
//         }
//         res.status(200).json({ success: true, user: publicUser(user) });
//     } catch (err) {
//         next(err);
//     }
// };


exports.getMe = async (req, res, next) => {
    try {
        res.set("Cache-Control", "no-store");

        const user = await User.findById(req.user._id)
            .select("-password -passwordResetToken -passwordResetExpires -passwordResetRequestedAt")
            .populate("employee", "_id employeeId name email designation department avatar");

        if (!user) {
            clearSessionCookie(res);
            return res.status(401).json({ message: "Please log in again." });
        }

        // Frontend seedha user object expect karta hai (data._id)
        res.status(200).json({
            ...user.toObject(),
            phone: user.phone || "",
            countryCode: user.countryCode || "+91",
            gender: user.gender || "",
            address: user.address || "",
            timezone: user.timezone || "Asia/Kolkata",
            avatar: user.avatar || "",
        });
    } catch (err) {
        next(err);
    }
};

exports.logoutAll = async (req, res, next) => {
    try {
        await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
        clearSessionCookie(res);
        res.status(200).json({ success: true, message: "Logged out from all devices." });
    } catch (err) {
        next(err);
    }
};


exports.revokeUserSessions = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.userId)) return res.status(404).json({ message: "User not found." });
        const r = await User.updateOne({ _id: req.params.userId }, { $inc: { tokenVersion: 1 } });
        if (!r.matchedCount) return res.status(404).json({ message: "User not found." });
        res.status(200).json({ success: true, message: "All sessions of this user were ended." });
    } catch (err) {
        next(err);
    }
};



// @route POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
    try {
        const email = cleanEmail(req.body?.email);
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address." });
        }

        const found = await findAccount(email.toLowerCase());
        const user = found?.user;

        if (!user) console.log("Forgot password: no account found for", maskEmail(email));

        const disabled = user && user.isActive === false;
        const sentRecently =
            user?.passwordResetRequestedAt &&
            Date.now() - new Date(user.passwordResetRequestedAt).getTime() < RESEND_COOLDOWN_MS;

        if (user && !disabled && !sentRecently) {
            const rawToken = crypto.randomBytes(32).toString("hex");

            await User.updateOne(
                { _id: user._id },
                {
                    $set: {
                        passwordResetToken: hashToken(rawToken),
                        passwordResetExpires: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
                        passwordResetRequestedAt: new Date(),
                    },
                }
            );

            // The link goes to the personal email. If there is none, the login email is used.
            const recipient = found.employee?.email || user.email;

            const baseUrl = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
            const link = `${baseUrl}/reset-password/${rawToken}`;
            const mail = resetPasswordEmail({ name: user.name, link, minutes: RESET_MINUTES });

            // Not awaited on purpose: response time is the same whether the email exists or not
            sendEmail({ to: recipient, ...mail })
                .then(() => console.log("Reset email accepted for", maskEmail(recipient), "| link base:", baseUrl))
                .catch(async (mailErr) => {
                    console.error("Reset email failed:", mailErr.message);
                    // Mail was not sent, so the token is useless and the user can retry immediately
                    await User.updateOne(
                        { _id: user._id },
                        {
                            $unset: {
                                passwordResetToken: "",
                                passwordResetExpires: "",
                                passwordResetRequestedAt: "",
                            },
                        }
                    ).catch(() => { });
                });
        }

        // Same response for every case
        res.json({ message: GENERIC_MESSAGE });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/auth/reset-password/:token/verify
exports.verifyResetToken = async (req, res, next) => {
    try {
        const user = await User.findOne({
            passwordResetToken: hashToken(req.params.token),
            passwordResetExpires: { $gt: new Date() },
            isActive: { $ne: false },
        }).select("_id");

        if (!user) {
            return res.status(400).json({
                valid: false,
                code: "INVALID_TOKEN",
                message: "This reset link is invalid or has expired.",
            });
        }
        res.json({ valid: true });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
    try {
        const password = String(req.body?.password ?? "");
        const confirmPassword = String(req.body?.confirmPassword ?? "");

        if (!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({ message: PASSWORD_MESSAGE });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match." });
        }

        const user = await User.findOne({
            passwordResetToken: hashToken(req.params.token),
            passwordResetExpires: { $gt: new Date() },
            isActive: { $ne: false },
        }).select("_id");

        if (!user) {
            return res.status(400).json({
                code: "INVALID_TOKEN",
                message: "This reset link is invalid or has expired.",
            });
        }

        const hashed = await bcrypt.hash(password, 10);
        await User.updateOne(
            { _id: user._id },
            {
                $set: { password: hashed, passwordChangedAt: new Date() },
                $unset: { passwordResetToken: "", passwordResetExpires: "", passwordResetRequestedAt: "" },
            }
        );

        res.json({ message: "Password reset successfully. Please login with your new password." });
    } catch (err) {
        next(err);
    }
};

// @route PUT /api/auth/me   (personal info)
exports.updateMe = async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Sirf admin personal details badal sakta hai." });
    }
    try {
        const { name, email, phone, countryCode, gender, address, timezone } = req.body;
        const updates = {};

        if (name !== undefined) {
            const cleanName = String(name).trim();
            if (cleanName.length < 2) {
                return res.status(400).json({ message: "Name must be at least 2 characters" });
            }
            updates.name = cleanName.slice(0, 80);
        }

        // Email sirf admin badal sakta hai (baaki users ko admin ne login email diya hai)
        if (email !== undefined && req.user.role === "admin") {
            const mail = String(email).trim().toLowerCase();
            if (!/^\S+@\S+\.\S+$/.test(mail)) {
                return res.status(400).json({ message: "Invalid email address" });
            }
            if (mail !== String(req.user.email).toLowerCase()) {
                const exists = await User.findOne({ email: mail, _id: { $ne: req.user._id } }).collation(CI);
                if (exists) {
                    return res.status(400).json({ message: "Email already in use" });
                }
                updates.email = mail;
            }
        }

        if (phone !== undefined) {
            const digits = String(phone).replace(/\D/g, "");
            if (digits && (digits.length < 6 || digits.length > 15)) {
                return res.status(400).json({ message: "Enter a valid phone number" });
            }
            updates.phone = digits;
        }

        if (countryCode !== undefined) {
            const cc = String(countryCode).trim();
            if (!/^\+\d{1,4}$/.test(cc)) {
                return res.status(400).json({ message: "Invalid country code" });
            }
            updates.countryCode = cc;
        }

        if (gender !== undefined) {
            const g = String(gender).toLowerCase();
            updates.gender = ["male", "female"].includes(g) ? g : "";
        }

        if (address !== undefined) updates.address = String(address).trim().slice(0, 300);
        if (timezone !== undefined) updates.timezone = String(timezone).trim().slice(0, 64);

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "Nothing to update" });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        )
            .select("-password")
            .populate("employee", EMPLOYEE_FIELDS);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (updates.name) await syncEmployee(user, { name: updates.name });

        res.json({
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                ...profileFields(user),
            },
        });
    } catch (err) {
        console.error("updateMe error:", err);
        res.status(500).json({ message: "Failed to update profile" });
    }
};

// @route PUT /api/auth/me/avatar   (multer memoryStorage, field name "avatar")
exports.updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please select an image" });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const result = await uploadToCloudinary(req.file.buffer, String(user._id));
        const newAvatar = result.secure_url; // https://res.cloudinary.com/...

        await User.updateOne({ _id: user._id }, { $set: { avatar: newAvatar } });
        await syncEmployee(user, { avatar: newAvatar });

        res.json({
            message: "Avatar updated successfully",
            user: { _id: user._id, avatar: newAvatar },
        });
    } catch (err) {
        console.error("updateAvatar error:", err);
        res.status(500).json({ message: "Failed to update avatar" });
    }
};

// @route PUT /api/auth/change-password   (admin, hr, manager, employee sab ke liye)
exports.changePassword = async (req, res) => {
    try {
        const currentPassword = String(req.body?.currentPassword ?? "");
        const newPassword = String(req.body?.newPassword ?? "");
        const confirmPassword = String(req.body?.confirmPassword ?? "");

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required." });
        }
        if (!PASSWORD_REGEX.test(newPassword)) {
            return res.status(400).json({ message: PASSWORD_MESSAGE });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New password and confirm password do not match." });
        }
        if (newPassword === currentPassword) {
            return res.status(400).json({ message: "New password must be different from the current password." });
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!user || !user.password) {
            return res.status(404).json({ message: "User not found." });
        }

        const ok = await bcrypt.compare(currentPassword.slice(0, 128), user.password);
        if (!ok) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await User.updateOne(
            { _id: user._id },
            {
                $set: { password: hashed, passwordChangedAt: new Date() },
                $unset: { passwordResetToken: "", passwordResetExpires: "", passwordResetRequestedAt: "" },
            }
        );

        res.json({ message: "Password changed successfully." });
    } catch (err) {
        console.error("changePassword error:", err);
        res.status(500).json({ message: "Failed to change password" });
    }
};











// const crypto = require("crypto");
// const fs = require("fs");
// const path = require("path");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");
// const Employee = require("../models/Employee");
// const LoginHistory = require("../models/LoginHistory");
// const { sendEmail, resetPasswordEmail } = require("../utils/sendEmail");

// const RESET_MINUTES = 15;
// const RESEND_COOLDOWN_MS = 60 * 1000;
// const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
// const PASSWORD_MESSAGE =
//     "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number.";
// const GENERIC_MESSAGE = "If this email is registered, a password reset link has been sent.";
// const CI = { locale: "en", strength: 2 }; // case-insensitive email match
// const EMPLOYEE_FIELDS = "_id name employeeId designation department avatar";

// const DUMMY_HASH = bcrypt.hashSync("timing-protection-only", 10);

// const generateToken = (id, role) =>
//     jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

// const cleanEmail = (v) => String(v ?? "").trim().slice(0, 254);

// const maskEmail = (e) => String(e || "").replace(/^(.).*(@.*)$/, "$1***$2");

// const findUserByEmail = (email) => User.findOne({ email }).collation(CI);

// /* Profile ki saari fields jo frontend ko chahiye (password/token kabhi nahi) */
// const profileFields = (user) => ({
//     phone: user.phone || "",
//     countryCode: user.countryCode || "+91",
//     gender: user.gender || "",
//     address: user.address || "",
//     timezone: user.timezone || "Asia/Kolkata",
//     avatar: user.avatar || "",
// });

// /* Local upload ki purani image delete (Cloudinary/http URL ko touch nahi karta) */
// const removeOldAvatar = (avatarPath) => {
//     if (!avatarPath || !avatarPath.startsWith("/uploads/")) return;
//     const full = path.join(__dirname, "..", avatarPath);
//     fs.unlink(full, () => { });
// };

// /* Employee profile me name/avatar sync rakho, taaki dashboard/employee list me bhi wahi dikhe */
// const syncEmployee = async (user, fields) => {
//     try {
//         const employeeId = user.employee?._id || user.employee;
//         if (!employeeId) return;
//         await Employee.updateOne({ _id: employeeId }, { $set: fields });
//     } catch (e) {
//         console.error("Employee sync failed:", e.message);
//     }
// };

// async function findAccount(email) {
//     let user = await findUserByEmail(email);
//     let employee = null;

//     if (!user) {
//         employee = await Employee.findOne({ $or: [{ email }, { loginEmail: email }] }).select("_id name email");
//         if (!employee) return null;
//         user = await User.findOne({ employee: employee._id });
//         return user ? { user, employee } : null;
//     }

//     if (user.employee) {
//         employee = await Employee.findById(user.employee).select("_id name email");
//     }
//     if (!employee) {
//         const mail = String(user.email || "").toLowerCase();
//         employee = await Employee.findOne({ $or: [{ email: mail }, { loginEmail: mail }] }).select("_id name email");
//     }
//     return { user, employee };
// }

// // @route POST /api/auth/login
// exports.login = async (req, res, next) => {
//     try {
//         const email = cleanEmail(req.body?.email);
//         const password = String(req.body?.password ?? "");

//         if (!email || !password) {
//             return res.status(400).json({ message: "Email and password are required." });
//         }

//         const user = await findUserByEmail(email).populate("employee", EMPLOYEE_FIELDS);

//         const tooLong = password.length > 128;
//         const isMatch = await bcrypt.compare(password.slice(0, 128), user?.password || DUMMY_HASH);

//         if (!user || !user.password || tooLong || !isMatch) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }

//         if (user.isActive === false) {
//             return res.status(403).json({ message: "Your account is disabled. Please contact admin." });
//         }

//         try {
//             await LoginHistory.create({
//                 user: user._id,
//                 ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
//                 userAgent: req.headers["user-agent"] || "Unknown",
//             });
//         } catch (historyErr) {
//             console.error("Failed to save login history:", historyErr.message);
//         }

//         let employeeProfile = user.employee;

//         if (user.role === "employee" && !employeeProfile) {
//             try {
//                 const mail = String(user.email || "").toLowerCase();
//                 const emp = await Employee.findOne({
//                     $or: [{ email: mail }, { loginEmail: mail }],
//                 }).select(EMPLOYEE_FIELDS);

//                 if (emp) {
//                     await User.updateOne({ _id: user._id }, { $set: { employee: emp._id } });
//                     employeeProfile = emp;
//                 }
//             } catch (linkErr) {
//                 console.error("Failed to link employee profile:", linkErr.message);
//             }
//         }

//         res.json({
//             _id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//             ...profileFields(user),
//             employee: employeeProfile || null,
//             token: generateToken(user._id, user.role),
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/auth/me
// exports.getMe = async (req, res, next) => {
//     try {
//         const user = await User.findById(req.user._id)
//             .select("-password -passwordResetToken -passwordResetExpires -passwordResetRequestedAt")
//             .populate("employee", EMPLOYEE_FIELDS);

//         if (!user) return res.status(404).json({ message: "User not found." });

//         // Purane users jinke naye fields DB me nahi hain, unko bhi default values milengi
//         res.json({ ...user.toObject(), ...profileFields(user) });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/auth/forgot-password
// exports.forgotPassword = async (req, res, next) => {
//     try {
//         const email = cleanEmail(req.body?.email);
//         if (!/^\S+@\S+\.\S+$/.test(email)) {
//             return res.status(400).json({ message: "Please enter a valid email address." });
//         }

//         const found = await findAccount(email.toLowerCase());
//         const user = found?.user;

//         if (!user) console.log("Forgot password: no account found for", maskEmail(email));

//         const disabled = user && user.isActive === false;
//         const sentRecently =
//             user?.passwordResetRequestedAt &&
//             Date.now() - new Date(user.passwordResetRequestedAt).getTime() < RESEND_COOLDOWN_MS;

//         if (user && !disabled && !sentRecently) {
//             const rawToken = crypto.randomBytes(32).toString("hex");

//             await User.updateOne(
//                 { _id: user._id },
//                 {
//                     $set: {
//                         passwordResetToken: hashToken(rawToken),
//                         passwordResetExpires: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
//                         passwordResetRequestedAt: new Date(),
//                     },
//                 }
//             );

//             const recipient = found.employee?.email || user.email;

//             const baseUrl = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
//             const link = `${baseUrl}/reset-password/${rawToken}`;
//             const mail = resetPasswordEmail({ name: user.name, link, minutes: RESET_MINUTES });

//             sendEmail({ to: recipient, ...mail })
//                 .then(() => console.log("Reset email accepted for", maskEmail(recipient), "| link base:", baseUrl))
//                 .catch(async (mailErr) => {
//                     console.error("Reset email failed:", mailErr.message);
//                     await User.updateOne(
//                         { _id: user._id },
//                         {
//                             $unset: {
//                                 passwordResetToken: "",
//                                 passwordResetExpires: "",
//                                 passwordResetRequestedAt: "",
//                             },
//                         }
//                     ).catch(() => { });
//                 });
//         }

//         res.json({ message: GENERIC_MESSAGE });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/auth/reset-password/:token/verify
// exports.verifyResetToken = async (req, res, next) => {
//     try {
//         const user = await User.findOne({
//             passwordResetToken: hashToken(req.params.token),
//             passwordResetExpires: { $gt: new Date() },
//             isActive: { $ne: false },
//         }).select("_id");

//         if (!user) {
//             return res.status(400).json({
//                 valid: false,
//                 code: "INVALID_TOKEN",
//                 message: "This reset link is invalid or has expired.",
//             });
//         }
//         res.json({ valid: true });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/auth/reset-password/:token
// exports.resetPassword = async (req, res, next) => {
//     try {
//         const password = String(req.body?.password ?? "");
//         const confirmPassword = String(req.body?.confirmPassword ?? "");

//         if (!PASSWORD_REGEX.test(password)) {
//             return res.status(400).json({ message: PASSWORD_MESSAGE });
//         }
//         if (password !== confirmPassword) {
//             return res.status(400).json({ message: "Passwords do not match." });
//         }

//         const user = await User.findOne({
//             passwordResetToken: hashToken(req.params.token),
//             passwordResetExpires: { $gt: new Date() },
//             isActive: { $ne: false },
//         }).select("_id");

//         if (!user) {
//             return res.status(400).json({
//                 code: "INVALID_TOKEN",
//                 message: "This reset link is invalid or has expired.",
//             });
//         }

//         const hashed = await bcrypt.hash(password, 10);
//         await User.updateOne(
//             { _id: user._id },
//             {
//                 $set: { password: hashed, passwordChangedAt: new Date() },
//                 $unset: { passwordResetToken: "", passwordResetExpires: "", passwordResetRequestedAt: "" },
//             }
//         );

//         res.json({ message: "Password reset successfully. Please login with your new password." });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route PUT /api/auth/me   (personal info)
// exports.updateMe = async (req, res) => {
//     try {
//         const { name, email, phone, countryCode, gender, address, timezone } = req.body;
//         const updates = {};

//         if (name !== undefined) {
//             const cleanName = String(name).trim();
//             if (cleanName.length < 2) {
//                 return res.status(400).json({ message: "Name must be at least 2 characters" });
//             }
//             updates.name = cleanName.slice(0, 80);
//         }

//         // Email sirf admin badal sakta hai (baaki users ko admin ne login email diya hai)
//         if (email !== undefined && req.user.role === "admin") {
//             const mail = String(email).trim().toLowerCase();
//             if (!/^\S+@\S+\.\S+$/.test(mail)) {
//                 return res.status(400).json({ message: "Invalid email address" });
//             }
//             if (mail !== String(req.user.email).toLowerCase()) {
//                 const exists = await User.findOne({ email: mail, _id: { $ne: req.user._id } }).collation(CI);
//                 if (exists) {
//                     return res.status(400).json({ message: "Email already in use" });
//                 }
//                 updates.email = mail;
//             }
//         }

//         if (phone !== undefined) {
//             const digits = String(phone).replace(/\D/g, "");
//             if (digits && (digits.length < 6 || digits.length > 15)) {
//                 return res.status(400).json({ message: "Enter a valid phone number" });
//             }
//             updates.phone = digits;
//         }

//         if (countryCode !== undefined) {
//             const cc = String(countryCode).trim();
//             if (!/^\+\d{1,4}$/.test(cc)) {
//                 return res.status(400).json({ message: "Invalid country code" });
//             }
//             updates.countryCode = cc;
//         }

//         if (gender !== undefined) {
//             const g = String(gender).toLowerCase();
//             updates.gender = ["male", "female"].includes(g) ? g : "";
//         }

//         if (address !== undefined) updates.address = String(address).trim().slice(0, 300);
//         if (timezone !== undefined) updates.timezone = String(timezone).trim().slice(0, 64);

//         if (Object.keys(updates).length === 0) {
//             return res.status(400).json({ message: "Nothing to update" });
//         }

//         const user = await User.findByIdAndUpdate(
//             req.user._id,
//             { $set: updates },
//             { new: true, runValidators: true }
//         )
//             .select("-password")
//             .populate("employee", EMPLOYEE_FIELDS);

//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         if (updates.name) await syncEmployee(user, { name: updates.name });

//         res.json({
//             message: "Profile updated successfully",
//             user: {
//                 _id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 role: user.role,
//                 ...profileFields(user),
//             },
//         });
//     } catch (err) {
//         console.error("updateMe error:", err);
//         res.status(500).json({ message: "Failed to update profile" });
//     }
// };

// // @route PUT /api/auth/me/avatar   (multer: field name "avatar")
// exports.updateAvatar = async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({ message: "Please select an image" });
//         }

//         const user = await User.findById(req.user._id);
//         if (!user) return res.status(404).json({ message: "User not found" });

//         const oldAvatar = user.avatar;
//         const newAvatar = `/uploads/avatars/${req.file.filename}`;

//         await User.updateOne({ _id: user._id }, { $set: { avatar: newAvatar } });
//         await syncEmployee(user, { avatar: newAvatar });
//         removeOldAvatar(oldAvatar);

//         res.json({
//             message: "Avatar updated successfully",
//             user: { _id: user._id, avatar: newAvatar },
//         });
//     } catch (err) {
//         console.error("updateAvatar error:", err);
//         res.status(500).json({ message: "Failed to update avatar" });
//     }
// };

// // @route PUT /api/auth/change-password   (admin, hr, manager, employee sab ke liye)
// exports.changePassword = async (req, res) => {
//     try {
//         const currentPassword = String(req.body?.currentPassword ?? "");
//         const newPassword = String(req.body?.newPassword ?? "");
//         const confirmPassword = String(req.body?.confirmPassword ?? "");

//         if (!currentPassword || !newPassword || !confirmPassword) {
//             return res.status(400).json({ message: "All fields are required." });
//         }
//         if (!PASSWORD_REGEX.test(newPassword)) {
//             return res.status(400).json({ message: PASSWORD_MESSAGE });
//         }
//         if (newPassword !== confirmPassword) {
//             return res.status(400).json({ message: "New password and confirm password do not match." });
//         }
//         if (newPassword === currentPassword) {
//             return res.status(400).json({ message: "New password must be different from the current password." });
//         }

//         const user = await User.findById(req.user._id).select("+password");
//         if (!user || !user.password) {
//             return res.status(404).json({ message: "User not found." });
//         }

//         const ok = await bcrypt.compare(currentPassword.slice(0, 128), user.password);
//         if (!ok) {
//             return res.status(400).json({ message: "Current password is incorrect." });
//         }

//         const hashed = await bcrypt.hash(newPassword, 10);
//         await User.updateOne(
//             { _id: user._id },
//             {
//                 $set: { password: hashed, passwordChangedAt: new Date() },
//                 $unset: { passwordResetToken: "", passwordResetExpires: "", passwordResetRequestedAt: "" },
//             }
//         );

//         res.json({ message: "Password changed successfully." });
//     } catch (err) {
//         console.error("changePassword error:", err);
//         res.status(500).json({ message: "Failed to change password" });
//     }
// };












// const crypto = require("crypto");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");
// const Employee = require("../models/Employee");
// const LoginHistory = require("../models/LoginHistory");
// const { sendEmail, resetPasswordEmail } = require("../utils/sendEmail");

// const RESET_MINUTES = 15;
// const RESEND_COOLDOWN_MS = 60 * 1000;
// const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
// const PASSWORD_MESSAGE =
//     "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number.";
// const GENERIC_MESSAGE = "If this email is registered, a password reset link has been sent.";
// const CI = { locale: "en", strength: 2 }; // case-insensitive email match
// const EMPLOYEE_FIELDS = "_id name employeeId designation department";

// // Used when the email does not exist, so a wrong email and a wrong password take the same time
// const DUMMY_HASH = bcrypt.hashSync("timing-protection-only", 10);

// const generateToken = (id, role) =>
//     jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

// const cleanEmail = (v) => String(v ?? "").trim().slice(0, 254);

// // a***@gmail.com : safe to write in logs
// const maskEmail = (e) => String(e || "").replace(/^(.).*(@.*)$/, "$1***$2");

// const findUserByEmail = (email) => User.findOne({ email }).collation(CI);

// /*
//  * Finds the login account for an email and the employee profile that belongs to it.
//  * The email can be the company login email or the personal email.
//  */
// async function findAccount(email) {
//     let user = await findUserByEmail(email);
//     let employee = null;

//     if (!user) {
//         employee = await Employee.findOne({ $or: [{ email }, { loginEmail: email }] }).select("_id name email");
//         if (!employee) return null;
//         user = await User.findOne({ employee: employee._id });
//         return user ? { user, employee } : null;
//     }

//     if (user.employee) {
//         employee = await Employee.findById(user.employee).select("_id name email");
//     }
//     if (!employee) {
//         const mail = String(user.email || "").toLowerCase();
//         employee = await Employee.findOne({ $or: [{ email: mail }, { loginEmail: mail }] }).select("_id name email");
//     }
//     return { user, employee };
// }

// // @route POST /api/auth/login
// exports.login = async (req, res, next) => {
//     try {
//         const email = cleanEmail(req.body?.email);
//         const password = String(req.body?.password ?? "");

//         if (!email || !password) {
//             return res.status(400).json({ message: "Email and password are required." });
//         }

//         const user = await findUserByEmail(email).populate("employee", EMPLOYEE_FIELDS);

//         // Always run one bcrypt compare, even for unknown emails
//         const tooLong = password.length > 128;
//         const isMatch = await bcrypt.compare(password.slice(0, 128), user?.password || DUMMY_HASH);

//         if (!user || !user.password || tooLong || !isMatch) {
//             return res.status(401).json({ message: "Invalid email or password" });
//         }

//         if (user.isActive === false) {
//             return res.status(403).json({ message: "Your account is disabled. Please contact admin." });
//         }

//         try {
//             await LoginHistory.create({
//                 user: user._id,
//                 ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
//                 userAgent: req.headers["user-agent"] || "Unknown",
//             });
//         } catch (historyErr) {
//             console.error("Failed to save login history:", historyErr.message);
//         }

//         let employeeProfile = user.employee;

//         // Older accounts that are not linked yet: link the existing profile by email.
//         // A new profile is NOT created here, because only admin/HR add employees.
//         if (user.role === "employee" && !employeeProfile) {
//             try {
//                 const mail = String(user.email || "").toLowerCase();
//                 const emp = await Employee.findOne({
//                     $or: [{ email: mail }, { loginEmail: mail }],
//                 }).select(EMPLOYEE_FIELDS);

//                 if (emp) {
//                     await User.updateOne({ _id: user._id }, { $set: { employee: emp._id } });
//                     employeeProfile = emp;
//                 }
//             } catch (linkErr) {
//                 console.error("Failed to link employee profile:", linkErr.message);
//             }
//         }

//         res.json({
//             _id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//             employee: employeeProfile || null,
//             token: generateToken(user._id, user.role),
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/auth/me
// exports.getMe = async (req, res, next) => {
//     try {
//         const user = await User.findById(req.user._id)
//             .select("-password")
//             .populate("employee", EMPLOYEE_FIELDS);

//         if (!user) return res.status(404).json({ message: "User not found." });
//         res.json(user);
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/auth/forgot-password
// exports.forgotPassword = async (req, res, next) => {
//     try {
//         const email = cleanEmail(req.body?.email);
//         if (!/^\S+@\S+\.\S+$/.test(email)) {
//             return res.status(400).json({ message: "Please enter a valid email address." });
//         }

//         const found = await findAccount(email.toLowerCase());
//         const user = found?.user;

//         if (!user) console.log("Forgot password: no account found for", maskEmail(email));

//         const disabled = user && user.isActive === false;
//         const sentRecently =
//             user?.passwordResetRequestedAt &&
//             Date.now() - new Date(user.passwordResetRequestedAt).getTime() < RESEND_COOLDOWN_MS;

//         if (user && !disabled && !sentRecently) {
//             const rawToken = crypto.randomBytes(32).toString("hex");

//             await User.updateOne(
//                 { _id: user._id },
//                 {
//                     $set: {
//                         passwordResetToken: hashToken(rawToken),
//                         passwordResetExpires: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
//                         passwordResetRequestedAt: new Date(),
//                     },
//                 }
//             );

//             // The link goes to the personal email. If there is none, the login email is used.
//             const recipient = found.employee?.email || user.email;

//             const baseUrl = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
//             const link = `${baseUrl}/reset-password/${rawToken}`;
//             const mail = resetPasswordEmail({ name: user.name, link, minutes: RESET_MINUTES });

//             // Not awaited on purpose: response time is the same whether the email exists or not
//             sendEmail({ to: recipient, ...mail })
//                 .then(() => console.log("Reset email accepted for", maskEmail(recipient), "| link base:", baseUrl))
//                 .catch(async (mailErr) => {
//                     console.error("Reset email failed:", mailErr.message);
//                     // Mail was not sent, so the token is useless and the user can retry immediately
//                     await User.updateOne(
//                         { _id: user._id },
//                         {
//                             $unset: {
//                                 passwordResetToken: "",
//                                 passwordResetExpires: "",
//                                 passwordResetRequestedAt: "",
//                             },
//                         }
//                     ).catch(() => { });
//                 });
//         }

//         // Same response for every case
//         res.json({ message: GENERIC_MESSAGE });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/auth/reset-password/:token/verify
// exports.verifyResetToken = async (req, res, next) => {
//     try {
//         const user = await User.findOne({
//             passwordResetToken: hashToken(req.params.token),
//             passwordResetExpires: { $gt: new Date() },
//             isActive: { $ne: false },
//         }).select("_id");

//         if (!user) {
//             return res.status(400).json({
//                 valid: false,
//                 code: "INVALID_TOKEN",
//                 message: "This reset link is invalid or has expired.",
//             });
//         }
//         res.json({ valid: true });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/auth/reset-password/:token
// exports.resetPassword = async (req, res, next) => {
//     try {
//         const password = String(req.body?.password ?? "");
//         const confirmPassword = String(req.body?.confirmPassword ?? "");

//         if (!PASSWORD_REGEX.test(password)) {
//             return res.status(400).json({ message: PASSWORD_MESSAGE });
//         }
//         if (password !== confirmPassword) {
//             return res.status(400).json({ message: "Passwords do not match." });
//         }

//         const user = await User.findOne({
//             passwordResetToken: hashToken(req.params.token),
//             passwordResetExpires: { $gt: new Date() },
//             isActive: { $ne: false },
//         }).select("_id");

//         if (!user) {
//             return res.status(400).json({
//                 code: "INVALID_TOKEN",
//                 message: "This reset link is invalid or has expired.",
//             });
//         }

//         const hashed = await bcrypt.hash(password, 10);
//         await User.updateOne(
//             { _id: user._id },
//             {
//                 $set: { password: hashed, passwordChangedAt: new Date() },
//                 $unset: { passwordResetToken: "", passwordResetExpires: "", passwordResetRequestedAt: "" },
//             }
//         );

//         res.json({ message: "Password reset successfully. Please login with your new password." });
//     } catch (err) {
//         next(err);
//     }
// };

// exports.updateMe = async (req, res) => {
//     try {
//         const { name, email } = req.body;
//         const updates = {};

//         if (name !== undefined) {
//             const cleanName = String(name).trim();
//             if (cleanName.length < 2) {
//                 return res.status(400).json({ message: "Name must be at least 2 characters" });
//             }
//             updates.name = cleanName;
//         }

//         if (email !== undefined) {
//             const cleanEmail = String(email).trim().toLowerCase();
//             if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
//                 return res.status(400).json({ message: "Invalid email address" });
//             }
//             const exists = await User.findOne({ email: cleanEmail, _id: { $ne: req.user._id } });
//             if (exists) {
//                 return res.status(400).json({ message: "Email already in use" });
//             }
//             updates.email = cleanEmail;
//         }

//         if (Object.keys(updates).length === 0) {
//             return res.status(400).json({ message: "Nothing to update" });
//         }

//         const user = await User.findByIdAndUpdate(
//             req.user._id,
//             { $set: updates },
//             { new: true, runValidators: true }
//         ).select("-password");

//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         res.json(user);
//     } catch (err) {
//         console.error("updateMe error:", err);
//         res.status(500).json({ message: "Failed to update profile" });
//     }
// };


