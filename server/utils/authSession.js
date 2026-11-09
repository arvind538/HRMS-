const jwt = require("jsonwebtoken");

const COOKIE_NAME = "hrms_session";
const SESSION_HOURS = Number(process.env.SESSION_HOURS) || 8;

/* httpOnly = JavaScript can never read this cookie. Secure = only over https (production). */
const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    path: "/",
});

/* the token carries only the user id and the token version. The role is always read from the database. */
const signSession = (user) =>
    jwt.sign({ id: String(user._id), tv: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
        expiresIn: `${SESSION_HOURS}h`,
    });

const setSessionCookie = (res, token) =>
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: SESSION_HOURS * 3600 * 1000 });

const clearSessionCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions());

/* the ONLY user data the browser ever gets. No password fields, no reset or token timestamps. */
const publicUser = (u) => {
    const o = typeof u?.toObject === "function" ? u.toObject() : u || {};
    const emp = o.employee && typeof o.employee === "object" && o.employee._id
        ? { _id: o.employee._id, employeeId: o.employee.employeeId, name: o.employee.name, email: o.employee.email }
        : o.employee || null;
    return {
        _id: o._id,
        name: o.name,
        email: o.email,
        role: o.role,
        avatar: o.avatar || "",
        phone: o.phone || "",
        countryCode: o.countryCode || "",
        gender: o.gender || "",
        address: o.address || "",
        timezone: o.timezone || "",
        isActive: o.isActive !== false,
        employee: emp,
    };
};

module.exports = { COOKIE_NAME, signSession, setSessionCookie, clearSessionCookie, publicUser };