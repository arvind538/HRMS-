const jwt = require("jsonwebtoken");
const User = require("../models/User"); // ⚠️ path apne project ke hisaab se check kar lena
// (User/Employee jo bhi model name ho)

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ✅ ab poora user fetch karo DB se, sirf decoded token pe mat ruko
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found, token invalid" });
        }

        req.user = user; // ✅ ab req.user.name, req.user.email sab available honge
        next();
    } catch (err) {
        res.status(401).json({ message: "Token invalid or expired" });
    }
};

// role-based access — usage: authorize("admin", "hr")
const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied for this role" });
    }
    next();
};

module.exports = { protect, authorize };