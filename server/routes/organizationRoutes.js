const express = require("express");
const router = express.Router();
const createCRUDRoutes = require("./genericRoutes");
const { createCRUDController } = require("../controllers/genericController");

const Branch = require("../models/Branch");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const Location = require("../models/Location");
const Team = require("../models/Team");
const ReportingManager = require("../models/ReportingManager");

router.use("/branches", createCRUDRoutes(createCRUDController(Branch, "Branch")));
router.use("/departments", createCRUDRoutes(createCRUDController(Department, "Department")));
router.use("/designations", createCRUDRoutes(createCRUDController(Designation, "Designation")));
router.use("/locations", createCRUDRoutes(createCRUDController(Location, "Location")));
router.use("/teams", createCRUDRoutes(createCRUDController(Team, "Team")));
router.use("/reporting-managers", createCRUDRoutes(createCRUDController(ReportingManager, "Reporting Manager")));

module.exports = router;