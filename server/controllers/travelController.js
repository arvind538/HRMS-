const Travel = require("../models/Travel");

// GET /travel controller (Exported properly now)
exports.getTravelRequests = async (req, res) => {
    try {
        const { employee } = req.query;
        let query = {};
        if (employee) query.employee = employee;

        // .populate('employee') se user ka name, email, department mil jayega
        const travels = await Travel.find(query)
            .populate({
                path: 'employee',
                select: 'name email department'
            })
            .sort({ createdAt: -1 });

        res.status(200).json(travels);
    } catch (err) {
        res.status(500).json({ message: err.message });
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

// Travel Request Delete karna
exports.deleteTravelRequest = async (req, res, next) => {
    try {
        const request = await Travel.findByIdAndDelete(req.params.id);
        if (!request) {
            return res.status(404).json({ message: "Travel request not found" });
        }
        res.status(200).json({ success: true, message: "Travel request deleted successfully" });
    } catch (err) {
        next(err);
    }
};