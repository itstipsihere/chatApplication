const mongoose = require("mongoose");

const connectdb = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ MongoDB connected");
    } catch (error) {
        console.log("❌ MongoDB connection error:", error.message);  // Log the error message
    }
};

module.exports = connectdb;
