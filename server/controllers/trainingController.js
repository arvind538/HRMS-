const Training = require("../models/Training");
const Certification = require("../models/Certification");
require("../models/Employee");
// Ensure Employee model is registered

// Get all training programs
exports.getTrainings = async (req, res, next) => {
    try {
        const { status, category } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;

        const trainings = await Training.find(filter)
            .populate("enrolledEmployees", "name employeeId")
            .sort({ startDate: 1 });

        res.json(trainings);
    } catch (err) {
        next(err);
    }
};

// Create training program
exports.createTraining = async (req, res, next) => {
    try {
        const training = await Training.create(req.body);
        res.status(201).json(training);
    } catch (err) {
        next(err);
    }
};

// Update training program
exports.updateTraining = async (req, res, next) => {
    try {
        const training = await Training.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!training) return res.status(404).json({ message: "Training not found" });
        res.json(training);
    } catch (err) {
        next(err);
    }
};

//  FOOLPROOF ENROLLMENT METHOD
exports.enrollEmployee = async (req, res, next) => {
    try {
        const { employeeId } = req.body;
        const trainingId = req.params.id;

        if (!employeeId) {
            return res.status(400).json({ message: "Employee ID is required." });
        }

        const training = await Training.findById(trainingId);
        if (!training) {
            return res.status(404).json({ message: "Training program not found." });
        }

        // Check max capacity
        if (training.maxParticipants && training.enrolledEmployees.length >= training.maxParticipants) {
            return res.status(400).json({ message: "Training is already full." });
        }

        // Check if already enrolled (Using string conversion for safety)
        const alreadyEnrolled = training.enrolledEmployees.some(
            (id) => id.toString() === employeeId.toString()
        );

        if (alreadyEnrolled) {
            return res.status(400).json({ message: "Employee is already enrolled in this training." });
        }

        // Push and trigger native Mongoose validation & save
        training.enrolledEmployees.push(employeeId);
        await training.save();

        // Populate employee info for the frontend response
        await training.populate("enrolledEmployees", "name employeeId");

        return res.status(200).json({
            message: "Successfully enrolled in training!",
            training
        });
    } catch (err) {
        console.error("Enrollment error:", err);
        next(err);
    }
};

// Delete training program
exports.deleteTraining = async (req, res, next) => {
    try {
        const training = await Training.findByIdAndDelete(req.params.id);
        if (!training) return res.status(404).json({ message: "Training not found" });
        res.json({ message: "Training removed successfully" });
    } catch (err) {
        next(err);
    }
};

// Certifications
exports.getCertifications = async (req, res, next) => {
    try {
        const { employee } = req.query;
        const filter = {};
        if (employee) filter.employee = employee;

        const certs = await Certification.find(filter)
            .populate("employee", "name employeeId")
            .populate("training", "title")
            .sort({ issueDate: -1 });

        res.json(certs);
    } catch (err) {
        next(err);
    }
};

exports.addCertification = async (req, res, next) => {
    try {
        const cert = await Certification.create(req.body);
        res.status(201).json(cert);
    } catch (err) {
        next(err);
    }
};