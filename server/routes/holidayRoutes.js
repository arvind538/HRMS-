const express = require("express");
const router = express.Router();
const Holiday = require("../models/Holiday");
const { protect, authorize } = require("../middleware/authMiddleware");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Fixed-date holidays hi seed karo. Holi/Diwali/Chhath jaise festivals ki date
// har saal badalti hai, unhe admin har saal POST se add kare.
const defaultFor = (y) => [
    { title: "Republic Day", date: `${y}-01-26`, type: "National", description: "Celebration of the Constitution of India" },
    { title: "Independence Day", date: `${y}-08-15`, type: "National", description: "Commemoration of the nation's independence" },
    { title: "Mahatma Gandhi Jayanti", date: `${y}-10-02`, type: "National", description: "Birth anniversary of Mahatma Gandhi" },
    { title: "Christmas Day", date: `${y}-12-25`, type: "Restricted", description: "Annual Christian holiday", optional: true },
];

// GET /api/holidays?year=2026&month=10   -> { success, data: [...] }
// Sab logged-in users dekh sakte hain
router.get("/", protect, async (req, res) => {
    try {
        const year = (req.query.year || new Date().getFullYear()).toString();
        const month = req.query.month ? String(req.query.month).padStart(2, "0") : null;

        let holidays = await Holiday.find({ year }).sort({ date: 1 });

        if (holidays.length === 0) {
            try {
                await Holiday.insertMany(
                    defaultFor(year).map((h) => ({ optional: false, ...h, year })),
                    { ordered: false }
                );
            } catch (e) {
                if (e.code !== 11000 && !e.writeErrors) throw e; // duplicate seed ignore
            }
            holidays = await Holiday.find({ year }).sort({ date: 1 });
        }

        if (month) holidays = holidays.filter((h) => h.date.slice(5, 7) === month);

        res.status(200).json({ success: true, data: holidays });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST: sirf admin/HR
router.post("/", protect, authorize("admin", "hr"), async (req, res) => {
    try {
        const { title, date, type, description, optional } = req.body;

        if (!title || !date) {
            return res.status(400).json({ success: false, message: "Title and date are required." });
        }
        if (!DATE_RE.test(date)) {
            return res.status(400).json({ success: false, message: "date format YYYY-MM-DD hona chahiye." });
        }

        const newHoliday = await Holiday.create({
            title,
            date,
            year: date.slice(0, 4),
            type: type || "National",
            description,
            optional: !!optional,
        });

        res.status(201).json({ success: true, data: newHoliday });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ success: false, message: "Is date par ye holiday pehle se hai." });
        }
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE: sirf admin/HR
router.delete("/:id", protect, authorize("admin", "hr"), async (req, res) => {
    try {
        const holiday = await Holiday.findByIdAndDelete(req.params.id);
        if (!holiday) {
            return res.status(404).json({ success: false, message: "Holiday not found." });
        }
        res.status(200).json({ success: true, message: "Holiday removed successfully." });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;




// const express = require("express");
// const router = express.Router();
// const Holiday = require("../models/Holiday");

// // GET: Fetch holidays for a year (Auto-seeds default festivals if none exist)
// router.get("/", async (req, res) => {
//     try {
//         const { year } = req.query;
//         const targetYear = year || new Date().getFullYear().toString();

//         let holidays = await Holiday.find({ year: targetYear }).sort({ date: 1 });

//         // Agar us year ke liye koi holidays database mein nahi hain, toh default festivals auto-seed karein
//         if (holidays.length === 0) {
//             const defaultFestivals = [
//                 {
//                     title: "Republic Day",
//                     date: `${targetYear}-01-26`,
//                     year: targetYear,
//                     type: "National",
//                     description: "Celebration of the Constitution of India",
//                     optional: false,
//                 },
//                 {
//                     title: "Holi Festival",
//                     date: `${targetYear}-03-14`,
//                     year: targetYear,
//                     type: "Gazetted",
//                     description: "Festival of Colours",
//                     optional: false,
//                 },
//                 {
//                     title: "Independence Day",
//                     date: `${targetYear}-08-15`,
//                     year: targetYear,
//                     type: "National",
//                     description: "Commemoration of the nation's independence",
//                     optional: false,
//                 },
//                 {
//                     title: "Mahatma Gandhi Jayanti",
//                     date: `${targetYear}-10-02`,
//                     year: targetYear,
//                     type: "National",
//                     description: "Birth anniversary of Mahatma Gandhi",
//                     optional: false,
//                 },
//                 {
//                     title: "Diwali (Deepavali)",
//                     date: `${targetYear}-11-08`,
//                     year: targetYear,
//                     type: "Gazetted",
//                     description: "Festival of Lights",
//                     optional: false,
//                 },
//                 {
//                     title: "Chhath Puja",
//                     date: `${targetYear}-11-15`,
//                     year: targetYear,
//                     type: "Gazetted",
//                     description: "Ancient Vedic festival dedicated to the Sun God",
//                     optional: false,
//                 },
//                 {
//                     title: "Christmas Day",
//                     date: `${targetYear}-12-25`,
//                     year: targetYear,
//                     type: "Restricted",
//                     description: "Annual Christian holiday celebrating the birth of Jesus",
//                     optional: true,
//                 },
//             ];

//             await Holiday.insertMany(defaultFestivals);
//             holidays = await Holiday.find({ year: targetYear }).sort({ date: 1 });
//         }

//         res.status(200).json({ success: true, data: holidays });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // POST: Add new holiday
// router.post("/", async (req, res) => {
//     try {
//         const { title, date, type, description, optional } = req.body;

//         if (!title || !date) {
//             return res.status(400).json({ success: false, message: "Title and date are required." });
//         }

//         const year = new Date(date).getFullYear().toString();

//         const newHoliday = await Holiday.create({
//             title,
//             date,
//             year,
//             type: type || "National",
//             description,
//             optional: optional || false,
//         });

//         res.status(201).json({ success: true, data: newHoliday });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// // DELETE: Remove holiday
// router.delete("/:id", async (req, res) => {
//     try {
//         const holiday = await Holiday.findByIdAndDelete(req.params.id);
//         if (!holiday) {
//             return res.status(404).json({ success: false, message: "Holiday not found." });
//         }
//         res.status(200).json({ success: true, message: "Holiday removed successfully." });
//     } catch (err) {
//         res.status(500).json({ success: false, message: err.message });
//     }
// });

// module.exports = router;