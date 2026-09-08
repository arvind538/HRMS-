const Document = require("../models/Document");

exports.getDocuments = async (req, res, next) => {
    try {
        const { category, employee } = req.query;
        const filter = {};
        if (category) filter.category = category;
        if (employee) filter.employee = employee;

        const documents = await Document.find(filter)
            .populate("employee", "name employeeId")
            .populate("uploadedBy", "name")
            .sort({ createdAt: -1 });
        res.json(documents);
    } catch (err) {
        next(err);
    }
};

exports.uploadDocument = async (req, res, next) => {
    try {
        const document = await Document.create({ ...req.body, uploadedBy: req.user.id });
        res.status(201).json(document);
    } catch (err) {
        next(err);
    }
};

exports.deleteDocument = async (req, res, next) => {
    try {
        await Document.findByIdAndDelete(req.params.id);
        res.json({ message: "Document removed" });
    } catch (err) {
        next(err);
    }
};