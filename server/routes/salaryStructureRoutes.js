const express = require("express");
const router = express.Router();
const {
    getSalaryStructures,
    createSalaryStructure,
    deleteSalaryStructure,
} = require("../controllers/salaryStructureController");

router.get("/", getSalaryStructures);
router.post("/", createSalaryStructure);
router.delete("/:id", deleteSalaryStructure);

module.exports = router;