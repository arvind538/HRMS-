const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ["admin", "hr", "manager", "employee"], default: "employee" },
        employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
        isActive: { type: Boolean, default: true },

        /* Forgot password */
        passwordResetToken: { type: String, select: false },
        passwordResetExpires: { type: Date, select: false },
        passwordResetRequestedAt: { type: Date },
        passwordChangedAt: { type: Date },
    },
    { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);




// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema(
//     {
//         name: { type: String, required: true },
//         email: { type: String, required: true, unique: true },
//         password: { type: String, required: true },
//         role: { type: String, enum: ["admin", "hr", "manager", "employee"], default: "employee" },
//         employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null }, //  ye field add/verify karo
//         isActive: { type: Boolean, default: true },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("User", userSchema);








// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema(
//     {
//         name: { type: String, required: true, trim: true },
//         email: { type: String, required: true, unique: true, lowercase: true, trim: true },
//         password: { type: String, required: true },
//         role: {
//             type: String,
//             enum: ["admin", "hr", "manager", "employee"],
//             default: "employee",
//         },
//         employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
//         isActive: { type: Boolean, default: true },
//     },
//     { timestamps: true }
// );

// module.exports = mongoose.model("User", userSchema);