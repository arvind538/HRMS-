const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs"); // agar aap 'bcrypt' use karte ho to wahi likho
const User = require("../models/User");

const safeUser = (u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    countryCode: u.countryCode,
    gender: u.gender,
    address: u.address,
    timezone: u.timezone,
    avatar: u.avatar,
});

// PUT /api/auth/me
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, countryCode, gender, address, timezone } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User nahi mila" });

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Name zaroori hai" });
        }

        // Email sirf admin badal sakta hai (baaki ko admin ne diya hai)
        if (email && email.toLowerCase() !== user.email && user.role === "admin") {
            const exists = await User.findOne({ email: email.toLowerCase() });
            if (exists) return res.status(400).json({ message: "Ye email pehle se use me hai" });
            user.email = email.toLowerCase();
        }

        user.name = name.trim();
        user.phone = (phone || "").trim();
        user.countryCode = countryCode || user.countryCode;
        user.gender = ["male", "female"].includes(gender) ? gender : "";
        user.address = (address || "").trim();
        user.timezone = timezone || user.timezone;

        await user.save();
        res.json({ message: "Profile update ho gayi", user: safeUser(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/auth/me/avatar
exports.updateAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "Image select karo" });

        const user = await User.findById(req.user.id);

        // purani image delete
        if (user.avatar) {
            const old = path.join(__dirname, "..", user.avatar);
            fs.existsSync(old) && fs.unlink(old, () => { });
        }

        user.avatar = `/uploads/avatars/${req.file.filename}`;
        await user.save();

        res.json({ message: "Avatar update ho gaya", user: safeUser(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PUT /api/auth/change-password  (admin, hr, manager, employee sab ke liye)
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "Sabhi fields bharo" });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New aur Confirm password match nahi karte" });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: "Password kam se kam 8 character ka ho" });
        }
        if (newPassword === currentPassword) {
            return res.status(400).json({ message: "Naya password purane jaisa nahi ho sakta" });
        }

        const user = await User.findById(req.user.id).select("+password");
        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) return res.status(400).json({ message: "Current password galat hai" });

        // Agar aapke model me pre('save') hash hook hai to NEeche wali line aise rakho:
        // user.password = newPassword;
        // Agar hook nahi hai to ye rakho:
        user.password = await bcrypt.hash(newPassword, 10);

        await user.save();
        res.json({ message: "Password change ho gaya" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};