const SalaryComponent = require("../models/SalaryComponent");

exports.getSalaryComponents = async (req, res, next) => {
    try {
        const components = await SalaryComponent.find().sort({ createdAt: -1 });
        return res.status(200).json(components);
    } catch (err) {
        next(err);
    }
};

exports.createSalaryComponent = async (req, res, next) => {
    try {
        const { name, type, calculationType, isTaxable, description } = req.body;

        if (!name || !type) {
            return res.status(400).json({ message: "Component name and type are required." });
        }

        const component = await SalaryComponent.create({
            name: name.trim(),
            type,
            calculationType: calculationType || "FIXED",
            isTaxable: Boolean(isTaxable),
            description: description ? description.trim() : "",
        });

        return res.status(201).json(component);
    } catch (err) {
        next(err);
    }
};

exports.deleteSalaryComponent = async (req, res, next) => {
    try {
        const component = await SalaryComponent.findByIdAndDelete(req.params.id);
        if (!component) {
            return res.status(404).json({ message: "Salary component not found." });
        }
        return res.status(200).json({ message: "Salary component deleted successfully." });
    } catch (err) {
        next(err);
    }
};