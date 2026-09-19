const mongoose = require('mongoose');

const travelSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Yahan check kar lein ki aapke User model ka naam 'User' hi hai ya 'Employee'
        required: true
    },
    purpose: { type: String, required: true },
    fromLocation: { type: String, required: true },
    toLocation: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    modeOfTravel: { type: String, default: 'flight' },
    estimatedCost: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('Travel', travelSchema);