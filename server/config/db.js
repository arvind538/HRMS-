const mongoose = require("mongoose");

const connectDB = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!uri) {
        console.error("MongoDB URI is missing. Add MONGO_URI to your .env file.");
        process.exit(1);
    }

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
        console.log(`MongoDB connected Successfully`);
    } catch (err) {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;






// const mongoose = require("mongoose");

// const connectDB = async () => {
//     try {
//         const connect = await mongoose.connect(process.env.MONGO_URI);
//         console.log(`MongoDB connected Successfully!`);
//     } catch (err) {
//         console.error(`MongoDB connected failed!`);
//         process.exit(1);
//     }
// };

// module.exports = connectDB;