const Compliance = require("../models/Compliance");

exports.getComplianceRecords = async (req, res, next) => {
    try {
        const { type, status, year } = req.query;
        const filter = {};
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (year) filter.year = Number(year);

        const records = await Compliance.find(filter).sort({ dueDate: 1 });
        res.json(records);
    } catch (err) {
        next(err);
    }
};

exports.createComplianceRecord = async (req, res, next) => {
    try {
        const record = await Compliance.create(req.body);
        res.status(201).json(record);
    } catch (err) {
        next(err);
    }
};

exports.markAsFiled = async (req, res, next) => {
    try {
        const record = await Compliance.findByIdAndUpdate(
            req.params.id,
            { status: "filed", filedDate: new Date(), documentUrl: req.body.documentUrl },
            { new: true }
        );
        res.json(record);
    } catch (err) {
        next(err);
    }
};

// calendar view ke liye — upcoming due dates
exports.getComplianceCalendar = async (req, res, next) => {
    try {
        const today = new Date();
        const upcoming = await Compliance.find({
            dueDate: { $gte: today },
            status: { $ne: "filed" },
        }).sort({ dueDate: 1 }).limit(20);

        res.json(upcoming);
    } catch (err) {
        next(err);
    }
};