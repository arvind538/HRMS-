const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { COOKIE_NAME, clearSessionCookie } = require("../utils/authSession");

const lower = (v) => String(v ?? "").trim().toLowerCase();

/* checks the session cookie on every request */
exports.protect = async (req, res, next) => {
    try {
        let token = req.cookies?.[COOKIE_NAME];

        // only for Postman or old scripts, and only when you switch it on (ALLOW_BEARER=true). Keep it OFF in production.
        if (!token && process.env.ALLOW_BEARER === "true") {
            const header = req.headers.authorization || "";
            if (header.startsWith("Bearer ")) token = header.slice(7);
        }

        if (!token) return res.status(401).json({ message: "Please log in to continue." });

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            clearSessionCookie(res);
            return res.status(401).json({ message: "Your session has expired. Please log in again." });
        }

        const user = await User.findById(payload.id).select("-password");
        if (!user || user.isActive === false) {
            clearSessionCookie(res);
            return res.status(401).json({ message: "This account is not active." });
        }

        // force logout: the token version is older than the one in the database
        if ((payload.tv || 0) !== (user.tokenVersion || 0)) {
            clearSessionCookie(res);
            return res.status(401).json({ message: "Your session was ended. Please log in again." });
        }

        // the password was changed after this token was made: the old token must stop working
        if (user.passwordChangedAt && payload.iat < Math.floor(new Date(user.passwordChangedAt).getTime() / 1000)) {
            clearSessionCookie(res);
            return res.status(401).json({ message: "Your password was changed. Please log in again." });
        }

        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
};

/* authorize("admin", "hr") */
exports.authorize = (...roles) => (req, res, next) => {
    const allowed = roles.map(lower);
    if (!req.user || !allowed.includes(lower(req.user.role))) {
        return res.status(403).json({ message: "You are not allowed to perform this action." });
    }
    next();
};






// const jwt = require("jsonwebtoken");
// const User = require("../models/User");

// const protect = async (req, res, next) => {
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer")) {
//         return res.status(401).json({ message: "Not authorized, no token" });
//     }
//     try {
//         const token = authHeader.split(" ")[1];
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         const user = await User.findById(decoded.id).select("-password");
//         if (!user) {
//             return res.status(401).json({ message: "User not found, token invalid" });
//         }
//         if (user.isActive === false) {
//             return res.status(403).json({ message: "Your account is disabled. Please contact admin." });
//         }
//         if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime()) {
//             return res.status(401).json({ message: "Password was changed. Please login again." });
//         }

//         req.user = user;
//         next();
//     } catch (err) {
//         res.status(401).json({ message: "Token invalid or expired" });
//     }
// };

// // usage: authorize("admin", "hr")
// const authorize = (...roles) => (req, res, next) => {
//     if (!roles.includes(req.user.role)) {
//         return res.status(403).json({ message: "Access denied for this role" });
//     }
//     next();
// };

// module.exports = { protect, authorize };


