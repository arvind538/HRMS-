const { COOKIE_NAME } = require("../utils/authSession");

const allowedOrigins = () =>
    (process.env.CLIENT_ORIGINS || "http://localhost:3000").split(",").map((s) => s.trim()).filter(Boolean);

/* every request that changes data (POST, PUT, PATCH, DELETE) must come from your own site */
module.exports = function csrfGuard(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

    let origin = req.headers.origin || "";
    if (!origin && req.headers.referer) {
        try {
            origin = new URL(req.headers.referer).origin;
        } catch {
            origin = "";
        }
    }

    if (origin) {
        if (allowedOrigins().includes(origin)) return next();
        return res.status(403).json({ message: "This request was blocked for security reasons." });
    }

    // no Origin header at all: a browser always sends one for these methods, so a request that carries the session cookie is refused
    if (req.cookies?.[COOKIE_NAME]) return res.status(403).json({ message: "This request was blocked for security reasons." });
    next();
};