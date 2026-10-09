const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Employee = require("../models/Employee");
const LoginHistory = require("../models/LoginHistory");
const { sendEmail, resetPasswordEmail } = require("../utils/sendEmail");

const RESET_MINUTES = 15;
const RESEND_COOLDOWN_MS = 60 * 1000;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,32}$/;
const PASSWORD_MESSAGE =
    "Password must be 8-32 characters with an uppercase letter, a lowercase letter and a number.";
const GENERIC_MESSAGE = "If this email is registered, a password reset link has been sent.";
const CI = { locale: "en", strength: 2 }; // case-insensitive email match
const EMPLOYEE_FIELDS = "_id name employeeId designation department";

// Used when the email does not exist, so a wrong email and a wrong password take the same time
const DUMMY_HASH = bcrypt.hashSync("timing-protection-only", 10);

const generateToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

const cleanEmail = (v) => String(v ?? "").trim().slice(0, 254);

const findUserByEmail = (email) => User.findOne({ email }).collation(CI);

/* Finds the login account for an email. Also checks the employee profile email. */
async function findAccountByEmail(email) {
    const user = await findUserByEmail(email);
    if (user) return user;

    const emp = await Employee.findOne({ $or: [{ email }, { loginEmail: email }] }).select("_id");
    if (!emp) return null;
    return User.findOne({ employee: emp._id });
}

// @route POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const email = cleanEmail(req.body?.email);
        const password = String(req.body?.password ?? "");

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await findUserByEmail(email).populate("employee", EMPLOYEE_FIELDS);

        // Always run one bcrypt compare, even for unknown emails
        const tooLong = password.length > 128;
        const isMatch = await bcrypt.compare(password.slice(0, 128), user?.password || DUMMY_HASH);

        if (!user || !user.password || tooLong || !isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (user.isActive === false) {
            return res.status(403).json({ message: "Your account is disabled. Please contact admin." });
        }

        try {
            await LoginHistory.create({
                user: user._id,
                ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
                userAgent: req.headers["user-agent"] || "Unknown",
            });
        } catch (historyErr) {
            console.error("Failed to save login history:", historyErr.message);
        }

        let employeeProfile = user.employee;

        // Older accounts that are not linked yet: link the existing profile by email.
        // A new profile is NOT created here, because only admin/HR add employees.
        if (user.role === "employee" && !employeeProfile) {
            try {
                const mail = String(user.email || "").toLowerCase();
                const emp = await Employee.findOne({
                    $or: [{ email: mail }, { loginEmail: mail }],
                }).select(EMPLOYEE_FIELDS);

                if (emp) {
                    await User.updateOne({ _id: user._id }, { $set: { employee: emp._id } });
                    employeeProfile = emp;
                }
            } catch (linkErr) {
                console.error("Failed to link employee profile:", linkErr.message);
            }
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            employee: employeeProfile || null,
            token: generateToken(user._id, user.role),
        });
    } catch (err) {
        next(err);
    }
};

// @route GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .select("-password")
            .populate("employee", EMPLOYEE_FIELDS);

        if (!user) return res.status(404).json({ message: "User not found." });
        res.json(user);
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

        const user = await findAccountByEmail(email.toLowerCase());

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

            const baseUrl = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
            const link = `${baseUrl}/reset-password/${rawToken}`;
            const mail = resetPasswordEmail({ name: user.name, link, minutes: RESET_MINUTES });

            // Not awaited on purpose: response time is the same whether the email exists or not
            sendEmail({ to: user.email, ...mail }).catch(async (mailErr) => {
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


// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");
// const LoginHistory = require("../models/LoginHistory");

// const generateToken = (id, role) =>
//     jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// // @route POST /api/auth/register
// exports.register = async (req, res, next) => {
//     try {
//         const { name, email, password, role } = req.body;

//         const exists = await User.findOne({ email });
//         if (exists) return res.status(400).json({ message: "User already exists" });

//         const hashedPassword = await bcrypt.hash(password, 10);
//         const user = await User.create({ name, email, password: hashedPassword, role });

//         // Save login history record on new account registration
//         try {
//             await LoginHistory.create({
//                 user: user._id,
//                 ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
//                 userAgent: req.headers["user-agent"] || "Unknown",
//             });
//         } catch (historyErr) {
//             console.error("Failed to save login history on register:", historyErr);
//         }

//         res.status(201).json({
//             _id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//             employee: null, // New registration ke paas employee profile nahi hoti initially
//             token: generateToken(user._id, user.role),
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/auth/login
// exports.login = async (req, res, next) => {
//     try {
//         const { email, password } = req.body;

//         const user = await User.findOne({ email }).populate("employee", "_id name employeeId designation department");
//         if (!user) return res.status(401).json({ message: "Invalid email or password" });

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

//         // Save login history on successful login
//         try {
//             await LoginHistory.create({
//                 user: user._id,
//                 ipAddress: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1",
//                 userAgent: req.headers["user-agent"] || "Unknown",
//             });
//         } catch (historyErr) {
//             console.error("Failed to save login history:", historyErr);
//         }

//         let employeeProfile = user.employee;

//         // FIX: Agar user role employee hai aur profile nahi bani, toh create karte waqt
//         // department ko skip kar dein taaki ObjectId cast error na aaye.
//         if (user.role === 'employee' && !employeeProfile) {
//             const Employee = require("../models/Employee");
//             try {
//                 employeeProfile = await Employee.create({
//                     user: user._id,
//                     name: user.name,
//                     employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
//                     // department field ko yahan se hata diya hai taaki ObjectId validation error na aaye
//                 });

//                 user.employee = employeeProfile._id;
//                 await user.save();
//             } catch (createErr) {
//                 console.error("Failed to auto-create employee profile:", createErr.message);
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
//         const user = await User.findById(req.user.id)
//             .select("-password")
//             .populate("employee", "_id name employeeId designation department");
//         res.json(user);
//     } catch (err) {
//         next(err);
//     }
// };


// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// const generateToken = (id, role) =>
//     jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// // @route POST /api/auth/register
// exports.register = async (req, res, next) => {
//     try {
//         const { name, email, password, role } = req.body;

//         const exists = await User.findOne({ email });
//         if (exists) return res.status(400).json({ message: "User already exists" });

//         const hashedPassword = await bcrypt.hash(password, 10);
//         const user = await User.create({ name, email, password: hashedPassword, role });

//         res.status(201).json({
//             _id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//             token: generateToken(user._id, user.role),
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route POST /api/auth/login
// exports.login = async (req, res, next) => {
//     try {
//         const { email, password } = req.body;

//         const user = await User.findOne({ email });
//         if (!user) return res.status(401).json({ message: "Invalid email or password" });

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

//         res.json({
//             _id: user._id,
//             name: user.name,
//             email: user.email,
//             role: user.role,
//             token: generateToken(user._id, user.role),
//         });
//     } catch (err) {
//         next(err);
//     }
// };

// // @route GET /api/auth/me
// exports.getMe = async (req, res, next) => {
//     try {
//         const user = await User.findById(req.user.id).select("-password");
//         res.json(user);
//     } catch (err) {
//         next(err);
//     }
// };
