const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const {
    login, logout, logoutAll, getMe, forgotPassword, verifyResetToken, resetPassword, revokeUserSessions,
    updateMe, updateAvatar, changePassword,
} = require("../controllers/authController");

const { protect, authorize } = require("../middleware/authMiddleware");
const loginLimiter = require("../middleware/loginLimiter");
const { loginValidation } = require("../middleware/validators/authValidator");
const uploadAvatar = require("../middleware/uploadAvatar");

const limiter = (max, message, extra = {}) =>
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message },
        ...extra,
    });

// ---------- Public ----------
router.post(
    "/login",
    limiter(20, "Too many login attempts. Please try again after 15 minutes.", { skipSuccessfulRequests: true }),
    loginValidation, loginLimiter,
    login
);
router.post("/logout", logout);

router.post("/forgot-password", limiter(5, "Too many requests. Please try again after 15 minutes."), forgotPassword);
router.get("/reset-password/:token/verify", limiter(30, "Too many requests. Please try again later."), verifyResetToken);
router.post("/reset-password/:token", limiter(10, "Too many attempts. Please try again later."), resetPassword);

// ---------- Logged-in users (admin, hr, manager, employee) ----------
router.get("/me", protect, getMe);
router.post("/logout-all", protect, logoutAll);
router.post("/revoke/:userId", protect, authorize("admin"), revokeUserSessions);

router.put("/me", protect, limiter(30, "Too many update requests. Please try again later."), updateMe);

router.put(
    "/me/avatar",
    protect,
    limiter(20, "Too many upload requests. Please try again later."),
    (req, res, next) => {
        uploadAvatar.single("avatar")(req, res, (err) => {
            if (err) return res.status(400).json({ message: err.message });
            next();
        });
    },
    updateAvatar
);

router.put(
    "/change-password",
    protect,
    limiter(10, "Too many attempts. Please try again after 15 minutes."),
    changePassword
);

module.exports = router;









// const express = require("express");
// const rateLimit = require("express-rate-limit");
// const router = express.Router();
// const {
//     login, getMe, forgotPassword, verifyResetToken, resetPassword,
//     updateMe, updateAvatar, changePassword,
// } = require("../controllers/authController");

// const { protect } = require("../middleware/authMiddleware");
// const { loginValidation } = require("../middleware/validators/authValidator");
// // routes/authRoutes.js

// const uploadAvatar = require("../middleware/uploadAvatar");
// const { updateProfile, updateAvatar, changePassword } = require("../controllers/profileController");

// router.put("/me", protect, updateProfile);
// router.put("/me/avatar", protect, (req, res, next) => {
//     uploadAvatar.single("avatar")(req, res, (err) => {
//         if (err) return res.status(400).json({ message: err.message });
//         next();
//     });
// }, updateAvatar);
// router.put("/change-password", protect, changePassword);




// const limiter = (max, message, extra = {}) =>
//     rateLimit({
//         windowMs: 15 * 60 * 1000,
//         max,
//         standardHeaders: true,
//         legacyHeaders: false,
//         message: { message },
//         ...extra,
//     });

// router.post(
//     "/login",
//     limiter(20, "Too many login attempts. Please try again after 15 minutes.", { skipSuccessfulRequests: true }),
//     loginValidation,
//     login
// );
// router.get("/me", protect, getMe);

// router.post("/forgot-password", limiter(5, "Too many requests. Please try again after 15 minutes."), forgotPassword);
// router.get("/reset-password/:token/verify", limiter(30, "Too many requests. Please try again later."), verifyResetToken);
// router.post("/reset-password/:token", limiter(10, "Too many attempts. Please try again later."), resetPassword);

// router.put("/me", protect, limiter(30, "Too many update requests. Please try again later."), updateMe); // <-- new

// module.exports = router;



