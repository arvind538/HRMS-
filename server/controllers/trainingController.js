// controllers/trainingController.js
const Training = require("../models/Training");
const Certification = require("../models/Certification");
const Employee = require("../models/Employee"); // ✅ Isko aise variable me define karna zaroori hai

// Get all training programs
exports.getTrainings = async (req, res, next) => {
    try {
        const { status, category } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;

        const trainings = await Training.find(filter)
            .populate("enrolledEmployees", "name employeeId email phone")
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

exports.enrollEmployee = async (req, res, next) => {
    try {
        let employeeId = req.body.employeeId || req.body.employee;
        const trainingId = req.params.id;

        const Employee = require("../models/Employee");

        // Agar frontend se ID nahi aayi, toh req.user se dhoondo
        if (!employeeId && req.user) {
            const empByAuth = await Employee.findOne({
                $or: [{ user: req.user._id }, { email: req.user.email }]
            });
            if (empByAuth) employeeId = empByAuth._id;
        }

        if (!employeeId) {
            return res.status(400).json({ message: "Employee ID missing. Profile linked nahi hai." });
        }

        // Validate karein ki yeh employee database mein sach mein exist karta hai ya nahi
        let employee = await Employee.findById(employeeId);
        if (!employee && req.user) {
            // Fallback: email match karne ki koshish karo
            employee = await Employee.findOne({ email: req.user.email });
            if (employee) employeeId = employee._id;
        }

        if (!employee) {
            return res.status(400).json({ message: "Aapki Employee profile database mein nahi mili." });
        }

        const training = await Training.findById(trainingId);
        if (!training) {
            return res.status(404).json({ message: "Training program not found." });
        }

        if (!Array.isArray(training.enrolledEmployees)) {
            training.enrolledEmployees = [];
        }

        // Capacity check
        const capacityLimit = training.maxParticipants && training.maxParticipants > 0 ? training.maxParticipants : 50;
        if (training.enrolledEmployees.length >= capacityLimit) {
            return res.status(400).json({ message: "Training is already full." });
        }

        // Already enrolled check (string mein convert karke comparison taaki mismatch na ho)
        const alreadyEnrolled = training.enrolledEmployees.some(
            (id) => id.toString().trim() === employeeId.toString().trim()
        );

        if (alreadyEnrolled) {
            return res.status(400).json({ message: "Employee is already enrolled in this training." });
        }

        training.enrolledEmployees.push(employeeId);
        await training.save();

        const updatedTraining = await Training.findById(trainingId)
            .populate("enrolledEmployees", "name employeeId email phone");

        return res.status(200).json({
            message: "Successfully enrolled in training!",
            training: updatedTraining,
            enrolledCount: updatedTraining.enrolledEmployees.length,
        });
    } catch (err) {
        console.error("Enrollment error details:", err);
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

// NEW: Dashboard ke liye training stats
exports.getTrainingStats = async (req, res, next) => {
    try {
        const trainings = await Training.find().select(
            "title status maxParticipants enrolledEmployees"
        );

        const totalTrainings = trainings.length;
        const totalEnrollments = trainings.reduce(
            (sum, t) => sum + (Array.isArray(t.enrolledEmployees) ? t.enrolledEmployees.length : 0),
            0
        );
        const ongoingCount = trainings.filter((t) => t.status === "ongoing").length;
        const upcomingCount = trainings.filter((t) => t.status === "upcoming").length;
        const completedCount = trainings.filter((t) => t.status === "completed").length;

        const perTraining = trainings.map((t) => ({
            _id: t._id,
            title: t.title,
            status: t.status,
            enrolledCount: Array.isArray(t.enrolledEmployees) ? t.enrolledEmployees.length : 0,
            maxParticipants: t.maxParticipants,
        }));

        res.status(200).json({
            totalTrainings,
            totalEnrollments,
            ongoingCount,
            upcomingCount,
            completedCount,
            perTraining,
        });
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

exports.updateCertification = async (req, res) => {
    try {
        const updatedCertification = await Certification.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedCertification) {
            return res.status(404).json({ message: "Certification nahi mili" });
        }
        res.status(200).json(updatedCertification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteCertification = async (req, res) => {
    try {
        const deletedCertification = await Certification.findByIdAndDelete(req.params.id);
        if (!deletedCertification) {
            return res.status(404).json({ message: "Certification nahi mili" });
        }
        res.status(200).json({ message: "Certification successfully delete ho gayi" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};





// const Training = require("../models/Training");
// const Certification = require("../models/Certification");
// require("../models/Employee");
// // Ensure Employee model is registered

// // Get all training programs
// exports.getTrainings = async (req, res, next) => {
//     try {
//         const { status, category } = req.query;
//         const filter = {};
//         if (status) filter.status = status;
//         if (category) filter.category = category;

//         const trainings = await Training.find(filter)
//             .populate("enrolledEmployees", "name employeeId")
//             .sort({ startDate: 1 });

//         res.json(trainings);
//     } catch (err) {
//         next(err);
//     }
// };

// // Create training program
// exports.createTraining = async (req, res, next) => {
//     try {
//         const training = await Training.create(req.body);
//         res.status(201).json(training);
//     } catch (err) {
//         next(err);
//     }
// };

// // Update training program
// exports.updateTraining = async (req, res, next) => {
//     try {
//         const training = await Training.findByIdAndUpdate(req.params.id, req.body, { new: true });
//         if (!training) return res.status(404).json({ message: "Training not found" });
//         res.json(training);
//     } catch (err) {
//         next(err);
//     }
// };

// //  FOOLPROOF ENROLLMENT METHOD
// exports.enrollEmployee = async (req, res, next) => {
//     try {
//         const { employeeId } = req.body;
//         const trainingId = req.params.id;

//         if (!employeeId) {
//             return res.status(400).json({ message: "Employee ID is required." });
//         }

//         const training = await Training.findById(trainingId);
//         if (!training) {
//             return res.status(404).json({ message: "Training program not found." });
//         }

//         // Check max capacity
//         if (training.maxParticipants && training.enrolledEmployees.length >= training.maxParticipants) {
//             return res.status(400).json({ message: "Training is already full." });
//         }

//         // Check if already enrolled (Using string conversion for safety)
//         const alreadyEnrolled = training.enrolledEmployees.some(
//             (id) => id.toString() === employeeId.toString()
//         );

//         if (alreadyEnrolled) {
//             return res.status(400).json({ message: "Employee is already enrolled in this training." });
//         }

//         // Push and trigger native Mongoose validation & save
//         training.enrolledEmployees.push(employeeId);
//         await training.save();

//         // Populate employee info for the frontend response
//         await training.populate("enrolledEmployees", "name employeeId");

//         return res.status(200).json({
//             message: "Successfully enrolled in training!",
//             training
//         });
//     } catch (err) {
//         console.error("Enrollment error:", err);
//         next(err);
//     }
// };

// // Delete training program
// exports.deleteTraining = async (req, res, next) => {
//     try {
//         const training = await Training.findByIdAndDelete(req.params.id);
//         if (!training) return res.status(404).json({ message: "Training not found" });
//         res.json({ message: "Training removed successfully" });
//     } catch (err) {
//         next(err);
//     }
// };

// // Certifications
// exports.getCertifications = async (req, res, next) => {
//     try {
//         const { employee } = req.query;
//         const filter = {};
//         if (employee) filter.employee = employee;

//         const certs = await Certification.find(filter)
//             .populate("employee", "name employeeId")
//             .populate("training", "title")
//             .sort({ issueDate: -1 });

//         res.json(certs);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.addCertification = async (req, res, next) => {
//     try {
//         const cert = await Certification.create(req.body);
//         res.status(201).json(cert);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.enrollEmployee = async (req, res) => {
//     try {
//         const training = await Training.findById(req.params.id);
//         if (!training) {
//             return res.status(404).json({ message: "Training nahi mili" });
//         }

//         if (!training.enrolledEmployees) {
//             training.enrolledEmployees = [];
//         }

//         // Check if already enrolled
//         if (training.enrolledEmployees.includes(req.body.employeeId)) {
//             return res.status(400).json({ message: "Employee pehle se enrolled hai" });
//         }

//         // FIX: Agar maxParticipants 0 ya undefined hai, toh default 50 capacity maan lo
//         const capacityLimit = training.maxParticipants && training.maxParticipants > 0 ? training.maxParticipants : 50;

//         if (training.enrolledEmployees.length >= capacityLimit) {
//             return res.status(400).json({ message: "Training is already full" });
//         }

//         // Employee add karein
//         training.enrolledEmployees.push(req.body.employeeId);
//         await training.save();

//         // Populate updated training
//         const updatedTraining = await Training.findById(req.params.id)
//             .populate("enrolledEmployees", "name email phone");

//         res.status(200).json({
//             message: "Successfully enrolled in the training!",
//             training: updatedTraining
//         });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };


// // Get all trainings with populated enrolled employees
// exports.getTrainings = async (req, res) => {
//     try {
//         const trainings = await Training.find()
//             .populate("enrolledEmployees", "name email phone"); // Yeh employees ki poori details fetch kar lega

//         res.status(200).json(trainings);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // Example for controllers/trainingController.js

// // ... baaki aapke purane controllers ...

// // Update Certification
// exports.updateCertification = async (req, res) => {
//     try {
//         const updatedCertification = await Certification.findByIdAndUpdate(
//             req.params.id,
//             req.body,
//             { new: true, runValidators: true }
//         );
//         if (!updatedCertification) {
//             return res.status(404).json({ message: "Certification nahi mili" });
//         }
//         res.status(200).json(updatedCertification);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

// // Delete Certification
// exports.deleteCertification = async (req, res) => {
//     try {
//         const deletedCertification = await Certification.findByIdAndDelete(req.params.id);
//         if (!deletedCertification) {
//             return res.status(404).json({ message: "Certification nahi mili" });
//         }
//         res.status(200).json({ message: "Certification successfully delete ho gayi" });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };