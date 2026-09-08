const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { registerValidation, loginValidation } = require("../middleware/validators/authValidator");

router.post("/register", registerValidation, register);
router.post("/login", loginValidation, login);
router.get("/me", protect, getMe);

module.exports = router;




// const express = require("express");
// const router = express.Router();
// const { register, login, getMe } = require("../controllers/authController");
// const { protect } = require("../middleware/authMiddleware");

// router.post("/register", register);
// router.post("/login", login);
// router.get("/me", protect, getMe);

// module.exports = router;