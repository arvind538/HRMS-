const nodemailer = require("nodemailer");

const fromName = () => process.env.EMAIL_FROM_NAME || "HRMS Portal";
const fromEmail = () => process.env.EMAIL_FROM || process.env.SMTP_USER;

const esc = (s) =>
  String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Option 1: Brevo API (use this on Render) */
async function sendWithBrevo({ to, subject, html, text }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: fromName(), email: fromEmail() },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) throw new Error(`Brevo error ${res.status}: ${await res.text()}`);
}

/* Option 2: SMTP / Gmail (use this for local testing) */
let transporter;
async function sendWithSmtp({ to, subject, html, text }) {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  await transporter.sendMail({
    from: `"${fromName()}" <${fromEmail()}>`,
    to,
    subject,
    html,
    text,
  });
}

exports.sendEmail = async (options) => {
  if (process.env.BREVO_API_KEY) return sendWithBrevo(options);
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return sendWithSmtp(options);
  throw new Error("Email service is not configured. Set BREVO_API_KEY or SMTP_USER and SMTP_PASS.");
};

exports.resetPasswordEmail = ({ name, link, minutes }) => ({
  subject: "Reset your password",
  text: `Hi ${name || "there"},\n\nWe received a request to reset your password. Open this link to choose a new one (valid for ${minutes} minutes):\n${link}\n\nIf you did not request this, you can safely ignore this email.`,
  html: `
  <div style="background:#eeeefa;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;">
      <tr><td style="padding:32px 24px;">
        <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;">Reset your password</h2>
        <p style="margin:0 0 8px;color:#475569;font-size:14px;line-height:1.6;">Hi ${esc(name) || "there"},</p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
          We received a request to reset your password. Tap the button below to choose a new one.
          This link is valid for ${minutes} minutes and can be used only once.
        </p>
        <p style="margin:28px 0;text-align:center;">
          <a href="${link}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 28px;border-radius:12px;">Reset password</a>
        </p>
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;line-height:1.6;">
          Button not working? Copy and paste this link into your browser:<br>
          <span style="word-break:break-all;color:#4f46e5;">${link}</span>
        </p>
        <p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.6;">
          If you did not request this, you can safely ignore this email. Your password will not change.
        </p>
      </td></tr>
    </table>
  </div>`,
});