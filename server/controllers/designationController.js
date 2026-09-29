const mongoose = require("mongoose");
const Designation = require("../models/Designation");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/designations  (?status=active&department=Engineering&search=dev)
const getDesignations = async (req, res, next) => {
    try {
        const { status, department, search } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (department) filter.department = department;
        if (search) filter.title = { $regex: escapeRegex(search), $options: "i" };

        const list = await Designation.find(filter).sort({ title: 1 });
        return res.status(200).json(list);
    } catch (err) {
        next(err);
    }
};

// GET /api/designations/:id
const getDesignationById = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid designation id" });
        }
        const item = await Designation.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Designation not found" });
        return res.status(200).json(item);
    } catch (err) {
        next(err);
    }
};

// POST /api/designations
const createDesignation = async (req, res, next) => {
    try {
        const title = req.body.title?.trim();
        if (!title) return res.status(400).json({ message: "Title is required" });

        const department = req.body.department?.trim() || "";

        // Same department me same title dobara nahi
        const exists = await Designation.findOne({
            title: new RegExp(`^${escapeRegex(title)}$`, "i"),
            department,
        });
        if (exists) {
            return res.status(409).json({ message: "Designation already exists in this department" });
        }

        const created = await Designation.create({
            title,
            department,
            level: req.body.level?.trim() || "",
            description: req.body.description?.trim() || "",
            status: req.body.status || "active",
        });
        return res.status(201).json(created);
    } catch (err) {
        next(err);
    }
};

// PUT /api/designations/:id
const updateDesignation = async (req, res, next) => {
    try {
        const { title, department, level, description, status } = req.body;
        const update = {};
        if (title !== undefined) update.title = title.trim();
        if (department !== undefined) update.department = department.trim();
        if (level !== undefined) update.level = level.trim();
        if (description !== undefined) update.description = description.trim();
        if (status !== undefined) update.status = status;

        const updated = await Designation.findByIdAndUpdate(
            req.params.id,
            { $set: update },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ message: "Designation not found" });
        return res.status(200).json(updated);
    } catch (err) {
        next(err);
    }
};

// DELETE /api/designations/:id
const deleteDesignation = async (req, res, next) => {
    try {
        const deleted = await Designation.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Designation not found" });
        return res.status(200).json({ message: "Designation removed" });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDesignations,
    getDesignationById,
    createDesignation,
    updateDesignation,
    deleteDesignation,
};