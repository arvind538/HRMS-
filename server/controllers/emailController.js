
const mongoose = require("mongoose");
const EmailLog = require("../models/EmailLog");
const { resolveAudience } = require("../utils/audience");

const CATEGORIES = ["general", "announcement", "reminder", "policy", "urgent"];
const AUDIENCES = ["all", "department", "role", "custom"];
const PARALLEL = 5;

const isConfigured = () => Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
const brand = () => process.env.EMAIL_FROM_NAME || "HRMS";

const escapeHtml = (s) =>
    String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const buildHtml = (subject, message) => `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
<tr><td style="background:#4f46e5;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:700;">${escapeHtml(brand())}</td></tr>
<tr><td style="padding:28px;color:#1e293b;font-size:15px;line-height:1.65;">
<h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${escapeHtml(subject)}</h1>
${escapeHtml(message).replace(/\n/g, "<br>")}
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;color:#94a3b8;font-size:12px;">This message was sent by ${escapeHtml(brand())} HR. Please do not reply to this email.</td></tr>
</table></td></tr></table></body></html>`;

const sendOne = async ({ to, name, subject, message }) => {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
            sender: { name: brand(), email: process.env.EMAIL_FROM },
            to: [name ? { email: to, name } : { email: to }],
            subject,
            htmlContent: buildHtml(subject, message),
            textContent: message,
        }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Email service error (${res.status})`);
    }
};

/* Runs after the response is sent. Updates the log when it is done. */
const deliver = async (logId, recipients, { subject, message }) => {
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
                        await sendOne({ to: r.address, name: r.name, subject, message });
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

    await EmailLog.findByIdAndUpdate(logId, {
        sentCount: sent,
        failedCount: failed,
        status: failed === 0 ? "sent" : sent === 0 ? "failed" : "partial",
        errorSummary: String(firstError).slice(0, 300),
    });
};

// @route GET /api/emails/status
exports.getStatus = (req, res) => {
    res.json({ configured: isConfigured(), from: isConfigured() ? process.env.EMAIL_FROM : "" });
};

// @route GET /api/emails
exports.getEmails = async (req, res, next) => {
    try {
        // A send that was cut short (server restart) must not stay "sending" forever
        await EmailLog.updateMany(
            { status: "sending", createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } },
            { status: "failed", errorSummary: "The server restarted before this campaign finished." }
        );
        const logs = await EmailLog.find().sort({ createdAt: -1 }).limit(200).populate("sentBy", "name");
        res.json(logs);
    } catch (err) {
        next(err);
    }
};

// @route POST /api/emails/audience   (how many people will receive it)
exports.previewAudience = async (req, res, next) => {
    try {
        const resolved = await resolveAudience(req.body, "email");
        if (resolved.error) return res.status(400).json({ message: resolved.error });
        res.json({ count: resolved.recipients.length, skipped: resolved.skipped, label: resolved.label });
    } catch (err) {
        next(err);
    }
};

// @route POST /api/emails
exports.sendEmail = async (req, res, next) => {
    try {
        if (!isConfigured()) {
            return res.status(503).json({ message: "The email service is not configured on the server." });
        }

        const subject = String(req.body.subject || "").trim();
        const message = String(req.body.message || "").trim();
        const category = CATEGORIES.includes(req.body.category) ? req.body.category : "general";
        const audience = String(req.body.audience || "");

        if (subject.length < 3 || subject.length > 200) {
            return res.status(400).json({ message: "The subject must be 3 to 200 characters." });
        }
        if (message.length < 5 || message.length > 5000) {
            return res.status(400).json({ message: "The message must be 5 to 5000 characters." });
        }
        if (!AUDIENCES.includes(audience)) return res.status(400).json({ message: "Please choose who should receive this." });

        const resolved = await resolveAudience(req.body, "email");
        if (resolved.error) return res.status(400).json({ message: resolved.error });
        if (!resolved.recipients.length) {
            return res.status(400).json({ message: "No recipient with a valid email address was found." });
        }

        // The same campaign cannot be sent twice within a minute (double click, retry)
        const duplicate = await EmailLog.findOne({
            sentBy: req.user._id,
            subject,
            message,
            createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
        }).lean();
        if (duplicate) return res.status(429).json({ message: "This email was just sent. Please wait a minute before sending it again." });

        const log = await EmailLog.create({
            sentBy: req.user._id,
            subject,
            message,
            category,
            audience,
            audienceLabel: resolved.label,
            recipientCount: resolved.recipients.length,
            recipientsPreview: resolved.recipients.slice(0, 20),
            status: "sending",
        });

        res.status(201).json(log);

        deliver(log._id, resolved.recipients, { subject, message }).catch(async (err) => {
            console.error("Email delivery error:", err.message);
            await EmailLog.findByIdAndUpdate(log._id, { status: "failed", errorSummary: String(err.message).slice(0, 300) });
        });
    } catch (err) {
        next(err);
    }
};

// @route DELETE /api/emails/:id
exports.deleteEmail = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Email log not found." });
        const log = await EmailLog.findById(req.params.id);
        if (!log) return res.status(404).json({ message: "Email log not found." });
        if (log.status === "sending") return res.status(400).json({ message: "This email is still being sent. Please try again in a moment." });
        await log.deleteOne();
        res.json({ message: "Email log deleted successfully." });
    } catch (err) {
        next(err);
    }
};





// const Email = require("../models/Email");

// // Get all email logs
// exports.getEmails = async (req, res) => {
//     try {
//         const emails = await Email.find().sort({ createdAt: -1 });
//         res.status(200).json(emails);
//     } catch (error) {
//         res.status(500).json({ message: "Server error while fetching emails" });
//     }
// };

// // Send and save email log
// exports.sendEmail = async (req, res) => {
//     try {
//         const { recipient, subject, message, category } = req.body;
//         if (!recipient || !subject || !message) {
//             return res.status(400).json({ message: "Please provide recipient, subject, and message." });
//         }

//         const newEmail = await Email.create({ recipient, subject, message, category });
//         res.status(201).json({ message: "Email sent successfully", email: newEmail });
//     } catch (error) {
//         res.status(500).json({ message: "Server error while sending email" });
//     }
// };

// // Delete email log
// exports.deleteEmail = async (req, res) => {
//     try {
//         await Email.findByIdAndDelete(req.params.id);
//         res.status(200).json({ message: "Email log deleted successfully" });
//     } catch (error) {
//         res.status(500).json({ message: "Server error while deleting email" });
//     }
// };