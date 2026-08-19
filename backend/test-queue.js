require("dotenv").config();

const fixQueue = require("./src/queues/fix.queue");
async function testQueue() {
    try {
        const job = await fixQueue.add("test-job", {
            rawEventId: "test-123"
        });
        console.log("Job added successfully!");
        console.log("Job ID:", job.id);

        await fixQueue.close();
    } catch (error) {
        console.error("Queue test failed:", error);
    }
}

testQueue();