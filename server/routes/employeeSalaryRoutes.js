const express = require("express");
const router = express.Router();
const {
    getEmployeeSalaries,
    assignOrUpdateSalary,
} = require("../controllers/employeeSalaryController");

router.get("/", getEmployeeSalaries);
router.post("/", assignOrUpdateSalary);

module.exports = router;