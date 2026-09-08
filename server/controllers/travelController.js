const Travel = require("../models/Travel");

exports.getTravelRequests = async (req, res, next) => {
    try {
        const { employee, status } = req.query;
        const filter = {};
        if (employee) filter.employee = employee;
        if (status) filter.status = status;

        const requests = await Travel.find(filter)
            .populate("employee", "name employeeId")
            .populate("approvedBy", "name")
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        next(err);
    }
};

exports.createTravelRequest = async (req, res, next) => {
    try {
        const request = await Travel.create(req.body);
        res.status(201).json(request);
    } catch (err) {
        next(err);
    }
};

exports.approveTravelRequest = async (req, res, next) => {
    try {
        const request = await Travel.findByIdAndUpdate(
            req.params.id,
            { status: "approved", approvedBy: req.body.approvedBy, approvedOn: new Date() },
            { new: true }
        );
        if (!request) return res.status(404).json({ message: "Travel request not found" });
        res.json(request);
    } catch (err) {
        next(err);
    }
};

exports.rejectTravelRequest = async (req, res, next) => {
    try {
        const request = await Travel.findByIdAndUpdate(
            req.params.id,
            {
                status: "rejected",
                approvedBy: req.body.approvedBy,
                approvedOn: new Date(),
                rejectionReason: req.body.rejectionReason,
            },
            { new: true }
        );
        if (!request) return res.status(404).json({ message: "Travel request not found" });
        res.json(request);
    } catch (err) {
        next(err);
    }
};

// Trip complete hone ke baad actual cost update karne ke liye
exports.updateActualCost = async (req, res, next) => {
    try {
        const request = await Travel.findByIdAndUpdate(
            req.params.id,
            { actualCost: req.body.actualCost, status: "completed" },
            { new: true }
        );
        if (!request) return res.status(404).json({ message: "Travel request not found" });
        res.json(request);
    } catch (err) {
        next(err);
    }
};