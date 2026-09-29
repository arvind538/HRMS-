const express = require("express");
const router = express.Router();
const {
    getDesignations,
    getDesignationById,
    createDesignation,
    updateDesignation,
    deleteDesignation,
} = require("../controllers/designationController");
// const { protect } = require("../middleware/authMiddleware"); // departmentRoutes jaisa hi

// router.use(protect); // departments me lagi hai to yahan bhi uncomment karo

router.route("/").get(getDesignations).post(createDesignation);
router
    .route("/:id")
    .get(getDesignationById)
    .put(updateDesignation)
    .delete(deleteDesignation);

module.exports = router;