const rateLimit = require("express-rate-limit");

/* 20 login tries in 15 minutes from one IP address */
module.exports = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again after 15 minutes." },
});