const express = require("express");
const router = express.Router();
const Branch = require("../models/Branch"); // Apna branch model import karein

// 1. Get All Branches (GET /api/organization/branches)
router.get("/", async (req, res) => {
    try {
        const branches = await Branch.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Create Branch (POST /api/organization/branches)
router.post("/", async (req, res) => {
    try {
        const newBranch = await Branch.create(req.body);
        res.status(201).json({ success: true, message: "Branch created successfully", data: newBranch });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// 3. Update Branch (PUT /api/organization/branches/:id)
router.put("/:id", async (req, res) => {
    try {
        const updatedBranch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedBranch) return res.status(404).json({ success: false, message: "Branch not found" });

        res.status(200).json({ success: true, message: "Branch updated successfully", data: updatedBranch });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

// 4. Delete Branch (DELETE /api/organization/branches/:id)
router.delete("/:id", async (req, res) => {
    try {
        const deletedBranch = await Branch.findByIdAndDelete(req.params.id);
        if (!deletedBranch) return res.status(404).json({ success: false, message: "Branch not found" });

        res.status(200).json({ success: true, message: "Branch deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;