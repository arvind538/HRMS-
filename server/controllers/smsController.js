const mongoose = require("mongoose");
const SmsLog = require("../models/SmsLog");
const { resolveAudience } = require("../utils/audience");

const CATEGORIES = ["general", "announcement", "reminder", "policy", "urgent"];
const AUDIENCES = ["all", "department", "role", "custom"];
const PARALLEL = 5;

const isConfigured = () =>
    Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID)
    );

const sendOne = async (to, body) => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const params = new URLSearchParams({ To: to, Body: body });
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) params.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
    else params.set("From", process.env.TWILIO_FROM);

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `SMS gateway error (${res.status})`);
    }
};

const deliver = async (logId, recipients, message) => {
    let sent = 0;
    let failed = 0;
    let firstError = "";
    const queue = [...recipients];

    try {
        await Promise.all(
            Array.from({ length: PARALLEL }, async () => {
                while (queue.length) {
                    const r = queue.shift();
                    try {
                        await sendOne(r.address, message);
                        sent += 1;
                    } catch (err) {
                        failed += 1;
                        if (!firstError) firstError = err.message;
                    }
                }
            })
        );
    } catch (err) {
        firstError = firstError || err.message;
    }

    await SmsLog.findByIdAndUpdate(logId, {
        sentCount: sent,
        failedCount: failed,
        status: failed === 0 ? "sent" : sent === 0 ? "failed" : "partial",
        errorSummary: String(firstError).slice(0, 300),
    });
};

// @route GET /api/sms/status
exports.getStatus = (req, res) => {
    res.json({ configured: isConfigured(), provider: isConfigured() ? "Twilio" : "" });
};

// @route GET /api/sms
exports.getSms = async (req, res, next) => {
    try {
        await SmsLog.updateMany(
            { status: "sending", createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } },
            { status: "failed", errorSummary: "The server restarted before this campaign finished." }
        );
        const logs = await SmsLog.find().sort({ createdAt: -1 }).limit(200).populate("sentBy", "name");
        res.json(logs);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/sms/audience
exports.previewAudience = async (req, res, next) => {
    try {
        const resolved = await resolveAudience(req.body, "sms");
        if (resolved.error) return res.status(400).json({ message: resolved.error });
        res.json({ count: resolved.recipients.length, skipped: resolved.skipped, label: resolved.label });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/sms
exports.sendSms = async (req, res, next) => {
    try {
        if (!isConfigured()) {
            return res.status(503).json({ message: "The SMS gateway is not configured on the server." });
        }

        const message = String(req.body.message || "").trim();
        const category = CATEGORIES.includes(req.body.category) ? req.body.category : "general";
        const audience = String(req.body.audience || "");

        if (message.length < 5 || message.length > 160) {
            return res.status(400).json({ message: "The message must be 5 to 160 characters." });
        }
        if (!AUDIENCES.includes(audience)) return res.status(400).json({ message: "Please choose who should receive this." });

        const resolved = await resolveAudience(req.body, "sms");
        if (resolved.error) return res.status(400).json({ message: resolved.error });
        if (!resolved.recipients.length) {
            return res.status(400).json({ message: "No recipient with a valid phone number was found." });
        }

        const duplicate = await SmsLog.findOne({
            sentBy: req.user._id,
            message,
            createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
        }).lean();
        if (duplicate) return res.status(429).json({ message: "This SMS was just sent. Please wait a minute before sending it again." });

        const log = await SmsLog.create({
            sentBy: req.user._id,
            message,
            category,
            audience,
            audienceLabel: resolved.label,
            recipientCount: resolved.recipients.length,
            recipientsPreview: resolved.recipients.slice(0, 20),
            status: "sending",
        });

        res.status(201).json(log);

        deliver(log._id, resolved.recipients, message).catch(async (err) => {
            console.error("SMS delivery error:", err.message);
            await SmsLog.findByIdAndUpdate(log._id, { status: "failed", errorSummary: String(err.message).slice(0, 300) });
        });
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/sms/:id
exports.deleteSms = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "SMS log not found." });
        const log = await SmsLog.findById(req.params.id);
        if (!log) return res.status(404).json({ message: "SMS log not found." });
        if (log.status === "sending") return res.status(400).json({ message: "This SMS is still being sent. Please try again in a moment." });
        await log.deleteOne();
        res.json({ message: "SMS log deleted successfully." });
    } catch (err) {
        next(err);
    }
};







// const Sms = require("../models/Sms");

// // Get all SMS logs
// exports.getSms = async (req, res) => {
//     try {
//         const smsList = await Sms.find().sort({ createdAt: -1 });
//         res.status(200).json(smsList);
//     } catch (error) {
//         res.status(500).json({ message: "Server error while fetching SMS logs" });
//     }
// };

// // Send and save SMS log
// exports.sendSms = async (req, res) => {
//     try {
//         const { recipient, message, category } = req.body;
//         if (!recipient || !message) {
//             return res.status(400).json({ message: "Recipient and message are required." });
//         }

//         const newSms = await Sms.create({ recipient, message, category });
//         res.status(201).json({ message: "SMS sent successfully", sms: newSms });
//     } catch (error) {
//         res.status(500).json({ message: "Server error while sending SMS" });
//     }
// };

// // Delete SMS log
// exports.deleteSms = async (req, res) => {
//     try {
//         await Sms.findByIdAndDelete(req.params.id);
//         res.status(200).json({ message: "SMS log deleted successfully" });
//     } catch (error) {
//         res.status(500).json({ message: "Server error while deleting SMS" });
//     }
// };