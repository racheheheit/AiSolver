const { Queue } = require("bullmq");

const fixQueue = new Queue(
    "fix-queue",
    {
        connection: {
            url: process.env.REDIS_URL,
            maxRetriesPerRequest: null,
        }
    }
);

fixQueue.on("error", (err) => {
    console.error("Redis / BullMQ Queue error:", err.message);
});

module.exports = fixQueue;

