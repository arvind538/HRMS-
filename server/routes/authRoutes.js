const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const {
    login,
    getMe,
    forgotPassword,
    verifyResetToken,
    resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { loginValidation } = require("../middleware/validators/authValidator");

const limiter = (max, message, extra = {}) =>
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message },
        ...extra,
    });

router.post(
    "/login",
    limiter(20, "Too many login attempts. Please try again after 15 minutes.", { skipSuccessfulRequests: true }),
    loginValidation,
    login
);
router.get("/me", protect, getMe);

router.post("/forgot-password", limiter(5, "Too many requests. Please try again after 15 minutes."), forgotPassword);
router.get("/reset-password/:token/verify", limiter(30, "Too many requests. Please try again later."), verifyResetToken);
router.post("/reset-password/:token", limiter(10, "Too many attempts. Please try again later."), resetPassword);

module.exports = router;



// const express = require("express");
// const router = express.Router();
// const { register, login, getMe } = require("../controllers/authController");
// const { protect } = require("../middleware/authMiddleware");
// const { registerValidation, loginValidation } = require("../middleware/validators/authValidator");

// router.post("/register", registerValidation, register);
// router.post("/login", loginValidation, login);
// router.get("/me", protect, getMe);

// module.exports = router;




// const express = require("express");
// const router = express.Router();
// const { register, login, getMe } = require("../controllers/authController");
// const { protect } = require("../middleware/authMiddleware");

// router.post("/register", register);
// router.post("/login", login);
// router.get("/me", protect, getMe);

// module.exports = router;