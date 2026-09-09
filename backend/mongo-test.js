require("dotenv").config();

const mongoose = require("mongoose");

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connection SUCCESS");

        await mongoose.disconnect();
    } catch (error) {
        console.error("MongoDB connection FAILED");
        console.error(error);
    }
}

test();