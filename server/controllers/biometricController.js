const Device = require("../models/Device");

// Get all devices
exports.getDevices = async (req, res, next) => {
    try {
        const devices = await Device.find().sort({ createdAt: -1 });
        res.json(devices);
    } catch (err) {
        next(err);
    }
};

// Add device (Real save)
exports.addDevice = async (req, res, next) => {
    try {
        const { name, ipAddress, port, location, model } = req.body;
        const newDevice = await Device.create({
            name,
            ipAddress,
            port: port || 4370,
            location,
            model: model || "ZKTeco iFace",
            status: "online"
        });
        res.status(201).json(newDevice);
    } catch (err) {
        next(err);
    }
};

// Sync live punches simulation/trigger
exports.syncDevice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const device = await Device.findById(id);
        if (!device) return res.status(404).json({ message: "Device not found" });

        device.lastSync = new Date();
        device.status = "online";
        await device.save();

        res.json({ success: true, message: "Punches synced successfully from device!" });
    } catch (err) {
        next(err);
    }
};





