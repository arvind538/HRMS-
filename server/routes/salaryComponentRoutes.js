const express = require("express");
const router = express.Router();
const {
    getSalaryComponents,
    createSalaryComponent,
    deleteSalaryComponent,
} = require("../controllers/salaryComponentController");

router.get("/", getSalaryComponents);
router.post("/", createSalaryComponent);
router.delete("/:id", deleteSalaryComponent);

module.exports = router;