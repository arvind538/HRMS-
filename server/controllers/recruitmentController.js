const JobPosition = require("../models/JobPosition");
const Candidate = require("../models/Candidate");
const Interview = require("../models/Interview");
const Offer = require("../models/Offer");

// ===== Job Positions =====
exports.getPositions = async (req, res, next) => {
    try {
        const positions = await JobPosition.find().populate("department", "name").sort({ createdAt: -1 });
        res.json(positions);
    } catch (err) {
        next(err);
    }
};

exports.createPosition = async (req, res, next) => {
    try {
        const position = await JobPosition.create(req.body);
        res.status(201).json(position);
    } catch (err) {
        next(err);
    }
};

exports.updatePosition = async (req, res, next) => {
    try {
        const position = await JobPosition.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!position) return res.status(404).json({ message: "Position not found" });
        res.json(position);
    } catch (err) {
        next(err);
    }
};

exports.deletePosition = async (req, res, next) => {
    try {
        await JobPosition.findByIdAndDelete(req.params.id);
        res.json({ message: "Position removed" });
    } catch (err) {
        next(err);
    }
};

// ===== Candidates =====
exports.getCandidates = async (req, res, next) => {
    try {
        const { status, jobPosition } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (jobPosition) filter.jobPosition = jobPosition;

        const candidates = await Candidate.find(filter)
            .populate("jobPosition", "title")
            .sort({ createdAt: -1 });
        res.json(candidates);
    } catch (err) {
        next(err);
    }
};

exports.createCandidate = async (req, res, next) => {
    try {
        const candidate = await Candidate.create(req.body);
        res.status(201).json(candidate);
    } catch (err) {
        next(err);
    }
};

exports.updateCandidateStatus = async (req, res, next) => {
    try {
        const candidate = await Candidate.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        if (!candidate) return res.status(404).json({ message: "Candidate not found" });
        res.json(candidate);
    } catch (err) {
        next(err);
    }
};

// pipeline view — status ke hisaab se candidates grouped
exports.getPipeline = async (req, res, next) => {
    try {
        const candidates = await Candidate.find().populate("jobPosition", "title");
        const stages = ["applied", "shortlisted", "interview-scheduled", "interviewed", "offered", "hired", "rejected"];

        const pipeline = stages.reduce((acc, stage) => {
            acc[stage] = candidates.filter((c) => c.status === stage);
            return acc;
        }, {});

        res.json(pipeline);
    } catch (err) {
        next(err);
    }
};

// ===== Interviews =====
exports.getInterviews = async (req, res, next) => {
    try {
        const { candidate, status } = req.query;
        const filter = {};
        if (candidate) filter.candidate = candidate;
        if (status) filter.status = status;

        const interviews = await Interview.find(filter)
            .populate("candidate", "name email")
            .populate("interviewer", "name")
            .sort({ scheduledAt: -1 });
        res.json(interviews);
    } catch (err) {
        next(err);
    }
};

// Interview Status ya Details Update karne ke liye
exports.updateInterview = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, round, mode, scheduledAt, meetingLink, notes } = req.body;

        // Aapke controller me Interview model jo bhi import ho (Interview ya InterviewSchedule)
        const updated = await Interview.findByIdAndUpdate(
            id,
            {
                ...(status && { status }),
                ...(round && { round }),
                ...(mode && { mode }),
                ...(scheduledAt && { scheduledAt }),
                ...(meetingLink && { meetingLink }),
                ...(notes && { notes }),
            },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Interview record nahi mila" });
        }

        res.status(200).json({
            success: true,
            message: "Interview status updated successfully",
            data: updated,
        });
    } catch (error) {
        console.error("updateInterview error:", error);
        res.status(500).json({ message: error.message || "Server Error" });
    }
};

exports.scheduleInterview = async (req, res, next) => {
    try {
        const interview = await Interview.create(req.body);
        await Candidate.findByIdAndUpdate(req.body.candidate, { status: "interview-scheduled" });
        res.status(201).json(interview);
    } catch (err) {
        next(err);
    }
};

exports.submitFeedback = async (req, res, next) => {
    try {
        const { feedback, rating, recommendation } = req.body;
        const interview = await Interview.findByIdAndUpdate(
            req.params.id,
            { feedback, rating, recommendation, status: "completed" },
            { new: true }
        );
        if (!interview) return res.status(404).json({ message: "Interview not found" });

        await Candidate.findByIdAndUpdate(interview.candidate, { status: "interviewed" });
        res.json(interview);
    } catch (err) {
        next(err);
    }
};

// ===== Offers =====
exports.getOffers = async (req, res, next) => {
    try {
        const offers = await Offer.find().populate("candidate", "name email").sort({ createdAt: -1 });
        res.json(offers);
    } catch (err) {
        next(err);
    }
};

exports.createOffer = async (req, res, next) => {
    try {
        const offer = await Offer.create(req.body);
        await Candidate.findByIdAndUpdate(req.body.candidate, { status: "offered" });
        res.status(201).json(offer);
    } catch (err) {
        next(err);
    }
};

exports.updateOfferStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const offer = await Offer.findByIdAndUpdate(
            req.params.id,
            { status, respondedOn: ["accepted", "declined"].includes(status) ? new Date() : undefined },
            { new: true }
        );
        if (!offer) return res.status(404).json({ message: "Offer not found" });

        if (status === "accepted") {
            await Candidate.findByIdAndUpdate(offer.candidate, { status: "hired" });
        }
        res.json(offer);
    } catch (err) {
        next(err);
    }
};