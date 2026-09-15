const Document = require("../models/Document");

// @desc    Get all documents (with optional category & employee filters)
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res, next) => {
    try {
        const { category, employee } = req.query;
        const filter = {};

        if (category) filter.category = category;
        if (employee) filter.employee = employee;

        const documents = await Document.find(filter)
            .populate("employee", "name employeeId")
            .populate("uploadedBy", "name")
            .sort({ createdAt: -1 });

        res.status(200).json(documents);
    } catch (err) {
        next(err);
    }
};

// @desc    Upload a new document
// @route   POST /api/documents
// @access  Private (Admin/HR)
exports.uploadDocument = async (req, res, next) => {
    try {
        const { title, fileUrl, category, employee, visibility, description } = req.body;

        const documentData = {
            title,
            fileUrl,
            category,
            description: description || "",
            visibility: visibility || "all-employees",
            employee: employee && employee.trim() !== "" ? employee : null,
            uploadedBy: req.user.id
        };

        const document = await Document.create(documentData);

        const populatedDoc = await Document.findById(document._id)
            .populate("employee", "name employeeId")
            .populate("uploadedBy", "name");

        res.status(201).json(populatedDoc);
    } catch (err) {
        next(err);
    }
};

// @desc    Update an existing document
// @route   PUT /api/documents/:id
// @access  Private (Admin/HR)
exports.updateDocument = async (req, res, next) => {
    try {
        const { title, fileUrl, category, employee, visibility, description } = req.body;

        let document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const updateData = {
            title,
            fileUrl,
            ...(category && { category }),
            ...(description !== undefined && { description }),
            visibility: visibility || "all-employees",
            employee: employee && employee.trim() !== "" ? employee : null
        };

        document = await Document.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        })
            .populate("employee", "name employeeId")
            .populate("uploadedBy", "name");

        res.status(200).json(document);
    } catch (err) {
        next(err);
    }
};

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private (Admin/HR)
exports.deleteDocument = async (req, res, next) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        await document.deleteOne();
        res.status(200).json({ message: "Document removed successfully" });
    } catch (err) {
        next(err);
    }
};