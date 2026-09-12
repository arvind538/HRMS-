const Compliance = require("../models/Compliance");

// Helper function: Current month ke liye automatic default compliance record create karne ke liye
const ensureCurrentMonthCompliance = async () => {
    try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1; // 1 to 12
        const currentYear = currentDate.getFullYear();

        // Check karein ki is month ka PF record pehle se exist karta hai ya nahi
        const existing = await Compliance.findOne({
            month: currentMonth,
            year: currentYear,
            type: "pf"
        });

        if (!existing) {
            // Agar nahi hai, toh automatic naya record bana do
            await Compliance.create({
                type: "pf",
                title: `Monthly PF Filing - ${currentMonth}/${currentYear}`,
                dueDate: new Date(currentYear, currentDate.getMonth(), 25), // Aane wali 25 tareeq due date
                status: "pending",
                totalAmount: 15000,
                month: currentMonth,
                year: currentYear
            });
            console.log("Automatic PF compliance record generated successfully!");
        }
    } catch (err) {
        console.error("Error in auto-generating compliance:", err.message);
    }
};

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
            { returnDocument: 'after' } // Fixed Mongoose warning
        );
        res.json(record);
    } catch (err) {
        next(err);
    }
};

// Calendar view ke liye — upcoming due dates (Auto-generation enabled)
exports.getComplianceCalendar = async (req, res, next) => {
    try {
        // Page khulte hi check karega aur zaroorat padi toh record auto-create kar dega
        await ensureCurrentMonthCompliance();

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


// const Compliance = require("../models/Compliance");

// exports.getComplianceRecords = async (req, res, next) => {
//     try {
//         const { type, status, year } = req.query;
//         const filter = {};
//         if (type) filter.type = type;
//         if (status) filter.status = status;
//         if (year) filter.year = Number(year);

//         const records = await Compliance.find(filter).sort({ dueDate: 1 });
//         res.json(records);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.createComplianceRecord = async (req, res, next) => {
//     try {
//         const record = await Compliance.create(req.body);
//         res.status(201).json(record);
//     } catch (err) {
//         next(err);
//     }
// };

// exports.markAsFiled = async (req, res, next) => {
//     try {
//         const record = await Compliance.findByIdAndUpdate(
//             req.params.id,
//             { status: "filed", filedDate: new Date(), documentUrl: req.body.documentUrl },
//             { new: true }
//         );
//         res.json(record);
//     } catch (err) {
//         next(err);
//     }
// };

// // calendar view ke liye — upcoming due dates
// exports.getComplianceCalendar = async (req, res, next) => {
//     try {
//         const today = new Date();
//         const upcoming = await Compliance.find({
//             dueDate: { $gte: today },
//             status: { $ne: "filed" },
//         }).sort({ dueDate: 1 }).limit(20);

//         res.json(upcoming);
//     } catch (err) {
//         next(err);
//     }
// };