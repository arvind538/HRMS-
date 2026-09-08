const Asset = require("../models/Asset");
const AssetMaintenance = require("../models/AssetMaintenance");

exports.getAssets = async (req, res, next) => {
    try {
        const { status, category } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;

        const assets = await Asset.find(filter).populate("assignedTo", "name employeeId").sort({ createdAt: -1 });
        res.json(assets);
    } catch (err) {
        next(err);
    }
};

exports.createAsset = async (req, res, next) => {
    try {
        const asset = await Asset.create(req.body);
        res.status(201).json(asset);
    } catch (err) {
        next(err);
    }
};

exports.assignAsset = async (req, res, next) => {
    try {
        const { employeeId } = req.body;
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(404).json({ message: "Asset not found" });
        if (asset.status === "assigned") {
            return res.status(400).json({ message: "Asset already assigned" });
        }

        asset.assignedTo = employeeId;
        asset.assignedDate = new Date();
        asset.status = "assigned";
        await asset.save();

        res.json(asset);
    } catch (err) {
        next(err);
    }
};

exports.returnAsset = async (req, res, next) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) return res.status(404).json({ message: "Asset not found" });

        asset.returnedDate = new Date();
        asset.assignedTo = null;
        asset.status = "available";
        asset.condition = req.body.condition || asset.condition;
        await asset.save();

        res.json(asset);
    } catch (err) {
        next(err);
    }
};

exports.getAssetHistory = async (req, res, next) => {
    try {
        const maintenance = await AssetMaintenance.find({ asset: req.params.id }).sort({ reportedDate: -1 });
        const asset = await Asset.findById(req.params.id).populate("assignedTo", "name");
        res.json({ asset, maintenanceHistory: maintenance });
    } catch (err) {
        next(err);
    }
};

// ===== Maintenance =====
exports.reportIssue = async (req, res, next) => {
    try {
        const maintenance = await AssetMaintenance.create(req.body);
        await Asset.findByIdAndUpdate(req.body.asset, { status: "maintenance" });
        res.status(201).json(maintenance);
    } catch (err) {
        next(err);
    }
};

exports.resolveIssue = async (req, res, next) => {
    try {
        const { cost } = req.body;
        const maintenance = await AssetMaintenance.findByIdAndUpdate(
            req.params.id,
            { status: "resolved", resolvedDate: new Date(), cost },
            { new: true }
        );
        if (!maintenance) return res.status(404).json({ message: "Maintenance record not found" });

        await Asset.findByIdAndUpdate(maintenance.asset, { status: "available" });
        res.json(maintenance);
    } catch (err) {
        next(err);
    }
};