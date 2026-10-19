require("dotenv").config();
const { sendEmail, resetPasswordEmail } = require("../utils/sendEmail");

const to = process.argv[2];
if (!to) {
    console.error("Usage: node scripts/testEmail.js someone@example.com");
    process.exit(1);
}

const mail = resetPasswordEmail({
    name: "Test",
    link: `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/test-token`,
    minutes: 15,
});

sendEmail({ to, ...mail })
    .then(() => console.log("Brevo accepted the email for", to))
    .catch((err) => console.error("FAILED:", err.message));