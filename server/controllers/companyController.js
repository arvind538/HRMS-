const Company = require("../models/Company");

// GET /api/company — single company record (singleton pattern)
exports.getCompany = async (req, res) => {
    try {
        let company = await Company.findOne();

        // Agar abhi tak koi company record nahi hai, to ek default empty record bana do
        if (!company) {
            company = await Company.create({ name: "Your Company Name" });
        }

        res.status(200).json({ success: true, data: company });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch company details", error: error.message });
    }
};

// PUT /api/company — update company details
exports.updateCompany = async (req, res) => {
    try {
        let company = await Company.findOne();

        if (!company) {
            company = await Company.create(req.body);
        } else {
            company = await Company.findByIdAndUpdate(company._id, req.body, {
                new: true,
                runValidators: true,
            });
        }

        res.status(200).json({ success: true, message: "Company details updated successfully", data: company });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update company details", error: error.message });
    }
};