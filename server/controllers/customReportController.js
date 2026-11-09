const mongoose = require("mongoose");
const Goal = require("../models/Goal");
const Appraisal = require("../models/Appraisal");
const P = require("./performanceController")._helpers;

const TYPES = ["goals", "appraisals", "promotions", "increments"];
const LIMIT = 5000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const bad = (res, message, status = 400) => res.status(status).json({ success: false, message });
const low = (v) => String(v || "").trim().toLowerCase();
const day = (v, end) => (DAY.test(v || "") ? new Date(`${v}T${end ? "23:59:59.999" : "00:00:00"}+05:30`) : null);
const fmt = (v) => (v ? new Date(v).toLocaleDateString("en-GB") : "");

// GET /reports/custom?reportType=&department=&designation=&employee=&status=&period=&startDate=&endDate=&q=
exports.customReport = async (req, res, next) => {
    try {
        const q = req.query;
        const type = TYPES.includes(q.reportType) ? q.reportType : "goals";

        const from = q.startDate ? day(q.startDate) : null;
        const to = q.endDate ? day(q.endDate, true) : null;
        if ((q.startDate && !from) || (q.endDate && !to)) return bad(res, "Please enter valid dates.");
        if (from && to && to < from) return bad(res, "The end date cannot be before the start date.");

        const sc = await P.scopeOf(req);
        const filter = P.scopeFilter(sc);
        if (q.employee) {
            if (!mongoose.isValidObjectId(q.employee)) return bad(res, "Please select a valid employee.");
            if (!P.canSee(sc, q.employee)) return bad(res, "You cannot view this employee's data.", 403);
            filter.employee = q.employee;
        }

        const maps = await P.nameMaps();
        const dateField = type === "goals" ? "targetDate" : "createdAt"; // goals: target date, others: when the appraisal was started
        if (from || to) filter[dateField] = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

        let items = [];
        if (type === "goals") {
            const rows = await P.empPop(Goal.find(filter).sort({ targetDate: -1 }).limit(LIMIT)).lean();
            items = rows.map((g) => {
                const s = P.shapeGoal(g, maps);
                return { _id: s._id, type, employee: s.employee, title: s.title, period: "", status: s.status, progress: s.progress || 0, rating: null, incrementPercent: 0, date: s.targetDate, note: s.description || "" };
            });
        } else {
            if (q.period) filter.reviewPeriod = String(q.period).toUpperCase().slice(0, 20);
            const rows = await P.apprPop(Appraisal.find(filter).sort({ createdAt: -1 }).limit(LIMIT)).lean();
            items = rows
                .map((a) => P.shapeAppraisal(a, maps, sc))
                .filter((a) => (type === "promotions" ? a.promotionStatus !== "none" : type === "increments" ? a.incrementStatus !== "none" : true))
                .map((a) => ({
                    _id: a._id, type, employee: a.employee, period: a.reviewPeriod, rating: a.rating || null, progress: 0,
                    incrementPercent: a.incrementPercent || 0, date: a.createdAt, note: a.managerAssessment || a.selfAssessment || "",
                    status: type === "promotions" ? a.promotionStatus : type === "increments" ? a.incrementStatus : a.status,
                    title: type === "promotions" ? `${a.promotionFrom || a.employee?.designation || "—"} → ${a.proposedDesignation || "—"}`
                        : type === "increments" ? `+${a.incrementPercent || 0}%${a.incrementEffectiveDate ? ` from ${fmt(a.incrementEffectiveDate)}` : ""}`
                            : `${a.reviewPeriod} appraisal`,
                }));
        }

        const dept = low(q.department), desig = low(q.designation), text = low(q.q);
        items = items.filter((r) =>
            (!dept || low(r.employee?.department) === dept) &&
            (!desig || low(r.employee?.designation).includes(desig)) &&
            (!q.status || r.status === q.status) &&
            (!text || `${r.employee?.name || ""} ${r.employee?.employeeId || ""} ${r.title}`.toLowerCase().includes(text))
        );

        const byStatus = {};
        items.forEach((r) => (byStatus[r.status] = (byStatus[r.status] || 0) + 1));
        const rated = items.filter((r) => r.rating);
        res.json({
            success: true,
            data: items,
            summary: {
                total: items.length, byStatus,
                averageRating: rated.length ? Number((rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(2)) : 0,
                averageProgress: type === "goals" && items.length ? Math.round(items.reduce((s, r) => s + r.progress, 0) / items.length) : 0,
            },
        });
    } catch (err) {
        next(err);
    }
};