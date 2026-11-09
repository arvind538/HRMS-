const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const c = require("../controllers/organizationController");

/* A wrong id gives a clean 404 instead of a database error */
const checkId = (req, res, next, id) => (/^[0-9a-fA-F]{24}$/.test(id) ? next() : res.status(404).json({ success: false, message: "Record not found." }));

const staff = authorize("admin", "hr");
const admin = authorize("admin");

router.get("/summary", protect, staff, c.summary);
router.get("/overview", protect, c.overview);
router.get("/org-chart", protect, c.orgChart);
router.get("/pincode/:pin", protect, c.pincodeLookup);

/* Everyone who is logged in can read (the employee forms use these lists). Admin and HR can add and edit. Only Admin can delete. */
function crud(path, ctrl) {
    const r = express.Router();
    r.param("id", checkId);
    r.get("/", protect, ctrl.getAll);
    r.get("/:id", protect, ctrl.getOne);
    r.post("/", protect, staff, ctrl.create);
    r.put("/:id", protect, staff, ctrl.update);
    r.delete("/:id", protect, admin, ctrl.remove);
    router.use(path, r);
}

crud("/branches", c.branch);
crud("/departments", c.department);
crud("/designations", c.designation);
crud("/locations", c.location);
crud("/teams", c.team);
crud("/reporting-managers", c.reportingManager);

module.exports = router;



