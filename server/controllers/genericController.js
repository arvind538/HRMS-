exports.createCRUDController = (Model, entityName = "Record") => ({
    getAll: async (req, res) => {
        try {
            const items = await Model.find().sort({ createdAt: -1 });
            res.status(200).json({ success: true, count: items.length, data: items });
        } catch (error) {
            res.status(500).json({ success: false, message: `Failed to fetch ${entityName} list`, error: error.message });
        }
    },

    getOne: async (req, res) => {
        try {
            const item = await Model.findById(req.params.id);
            if (!item) return res.status(404).json({ success: false, message: `${entityName} not found` });
            res.status(200).json({ success: true, data: item });
        } catch (error) {
            res.status(500).json({ success: false, message: `Failed to fetch ${entityName}`, error: error.message });
        }
    },

    create: async (req, res) => {
        try {
            const item = await Model.create(req.body);
            res.status(201).json({ success: true, message: `${entityName} created successfully`, data: item });
        } catch (error) {
            res.status(400).json({ success: false, message: `Failed to create ${entityName}`, error: error.message });
        }
    },

    update: async (req, res) => {
        try {
            const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
            if (!item) return res.status(404).json({ success: false, message: `${entityName} not found` });
            res.status(200).json({ success: true, message: `${entityName} updated successfully`, data: item });
        } catch (error) {
            res.status(400).json({ success: false, message: `Failed to update ${entityName}`, error: error.message });
        }
    },

    remove: async (req, res) => {
        try {
            const item = await Model.findByIdAndDelete(req.params.id);
            if (!item) return res.status(404).json({ success: false, message: `${entityName} not found` });
            res.status(200).json({ success: true, message: `${entityName} deleted successfully` });
        } catch (error) {
            res.status(500).json({ success: false, message: `Failed to delete ${entityName}`, error: error.message });
        }
    },
});