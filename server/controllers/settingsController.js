const Settings = require("../models/Settings");

// Settings hamesha ek hi document hota hai — isliye "get" mein findOne use kiya hai, find() nahi
exports.getSettings = async (req, res, next) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({}); // pehli baar defaults ke saath bana do
        }
        res.json(settings);
    } catch (err) {
        next(err);
    }
};

// upsert: true — agar document exist nahi karta toh naya bana dega, warna update karega
exports.updateSettings = async (req, res, next) => {
    try {
        const settings = await Settings.findOneAndUpdate({}, req.body, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        res.json(settings);
    } catch (err) {
        next(err);
    }
};