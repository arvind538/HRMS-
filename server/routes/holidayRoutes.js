const express = require("express");
const router = express.Router();
const Holiday = require("../models/Holiday");

// GET: Fetch holidays for a year (Auto-seeds default festivals if none exist)
router.get("/", async (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year || new Date().getFullYear().toString();

        let holidays = await Holiday.find({ year: targetYear }).sort({ date: 1 });

        // Agar us year ke liye koi holidays database mein nahi hain, toh default festivals auto-seed karein
        if (holidays.length === 0) {
            const defaultFestivals = [
                {
                    title: "Republic Day",
                    date: `${targetYear}-01-26`,
                    year: targetYear,
                    type: "National",
                    description: "Celebration of the Constitution of India",
                    optional: false,
                },
                {
                    title: "Holi Festival",
                    date: `${targetYear}-03-14`,
                    year: targetYear,
                    type: "Gazetted",
                    description: "Festival of Colours",
                    optional: false,
                },
                {
                    title: "Independence Day",
                    date: `${targetYear}-08-15`,
                    year: targetYear,
                    type: "National",
                    description: "Commemoration of the nation's independence",
                    optional: false,
                },
                {
                    title: "Mahatma Gandhi Jayanti",
                    date: `${targetYear}-10-02`,
                    year: targetYear,
                    type: "National",
                    description: "Birth anniversary of Mahatma Gandhi",
                    optional: false,
                },
                {
                    title: "Diwali (Deepavali)",
                    date: `${targetYear}-11-08`,
                    year: targetYear,
                    type: "Gazetted",
                    description: "Festival of Lights",
                    optional: false,
                },
                {
                    title: "Chhath Puja",
                    date: `${targetYear}-11-15`,
                    year: targetYear,
                    type: "Gazetted",
                    description: "Ancient Vedic festival dedicated to the Sun God",
                    optional: false,
                },
                {
                    title: "Christmas Day",
                    date: `${targetYear}-12-25`,
                    year: targetYear,
                    type: "Restricted",
                    description: "Annual Christian holiday celebrating the birth of Jesus",
                    optional: true,
                },
            ];

            await Holiday.insertMany(defaultFestivals);
            holidays = await Holiday.find({ year: targetYear }).sort({ date: 1 });
        }

        res.status(200).json({ success: true, data: holidays });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST: Add new holiday
router.post("/", async (req, res) => {
    try {
        const { title, date, type, description, optional } = req.body;

        if (!title || !date) {
            return res.status(400).json({ success: false, message: "Title and date are required." });
        }

        const year = new Date(date).getFullYear().toString();

        const newHoliday = await Holiday.create({
            title,
            date,
            year,
            type: type || "National",
            description,
            optional: optional || false,
        });

        res.status(201).json({ success: true, data: newHoliday });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE: Remove holiday
router.delete("/:id", async (req, res) => {
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