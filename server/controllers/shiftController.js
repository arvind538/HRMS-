const Shift = require("../models/Shift");
const ShiftAssignment = require("../models/ShiftAssignment");

// ===== Shifts (templates) =====
exports.getShifts = async (req, res, next) => {
    try {
        const shifts = await Shift.find().sort({ startTime: 1 });
        res.json(shifts);
    } catch (err) {
        next(err);
    }
};

exports.createShift = async (req, res, next) => {
    try {
        const shift = await Shift.create(req.body);
        res.status(201).json(shift);
    } catch (err) {
        next(err);
    }
};

exports.updateShift = async (req, res, next) => {
    try {
        const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(shift);
    } catch (err) {
        next(err);
    }
};

// ===== Shift Assignments =====
exports.getRoster = async (req, res, next) => {
    try {
        const { startDate, endDate, employee } = req.query;
        const filter = {};
        if (employee) filter.employee = employee;
        if (startDate && endDate) {
            filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const roster = await ShiftAssignment.find(filter)
            .populate("employee", "name employeeId")
            .populate("shift", "name startTime endTime")
            .sort({ date: 1 });
        res.json(roster);
    } catch (err) {
        next(err);
    }
};

exports.assignShift = async (req, res, next) => {
    try {
        const assignment = await ShiftAssignment.create(req.body);
        res.status(201).json(assignment);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Employee already has a shift assigned for this date" });
        }
        next(err);
    }
};

// bulk assignment — poore hafte ka roster ek saath banane ke liye
exports.assignWeeklyRoster = async (req, res, next) => {
    try {
        const { employee, shift, dates } = req.body; // dates = array of date strings
        const results = { created: [], skipped: [] };

        for (const date of dates) {
            const exists = await ShiftAssignment.findOne({ employee, date });
            if (exists) {
                results.skipped.push(date);
                continue;
            }
            const assignment = await ShiftAssignment.create({ employee, shift, date });
            results.created.push(assignment);
        }

        res.status(201).json(results);
    } catch (err) {
        next(err);
    }
};