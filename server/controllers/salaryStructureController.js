const SalaryStructure = require("../models/SalaryStructure");

exports.getSalaryStructures = async (req, res, next) => {
    try {
        const structures = await SalaryStructure.find().sort({ createdAt: -1 });
        return res.status(200).json(structures);
    } catch (err) {
        next(err);
    }
};

exports.createSalaryStructure = async (req, res, next) => {
    try {
        const { name, basicPercent, hraPercent, daPercent, specialPercent } = req.body;
        const structure = await SalaryStructure.create({
            name,
            basicPercent,
            hraPercent,
            daPercent: daPercent || 0,
            specialPercent,
        });
        return res.status(201).json(structure);
    } catch (err) {
        next(err);
    }
};

exports.deleteSalaryStructure = async (req, res, next) => {
    try {
        const structure = await SalaryStructure.findByIdAndDelete(req.params.id);
        if (!structure) return res.status(404).json({ message: "Not found" });
        return res.status(200).json({ message: "Deleted successfully" });
    } catch (err) {
        next(err);
    }
};