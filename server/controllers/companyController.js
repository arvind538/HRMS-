const Company = require("../models/Company");

// @desc    Get single company record (singleton pattern)
// @route   GET /api/company
// @access  Private
exports.getCompany = async (req, res, next) => {
    try {
        let company = await Company.findOne();

        // Agar abhi tak koi company record nahi hai, to ek default professional record bana do
        if (!company) {
            company = await Company.create({
                name: "Apex Global Technologies",
                email: "contact@enterprise.com",
                status: "Active"
            });
        }

        res.status(200).json({
            success: true,
            data: company
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch company details",
            error: error.message
        });
    }
};

// @desc    Update or create company details
// @route   PUT /api/company
// @access  Private (Admin / HR)
exports.updateCompany = async (req, res, next) => {
    try {
        let company = await Company.findOne();

        if (!company) {
            // Agar record exist nahi karta toh naya create kar do
            company = await Company.create(req.body);
        } else {
            // Existing record ko find karke update karo with validators
            company = await Company.findByIdAndUpdate(
                company._id,
                req.body,
                {
                    new: true,
                    runValidators: true,
                }
            );
        }

        res.status(200).json({
            success: true,
            message: "Company details updated successfully",
            data: company
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Failed to update company details",
            error: error.message
        });
    }
};