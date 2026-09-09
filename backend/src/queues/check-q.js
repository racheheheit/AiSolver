require("dotenv").config();

const fixQueue = require("../queues/fix.queue");    

(async function checkFixQueue(){
    const jobCounts = await fixQueue.getActiveCount();
    console.log("Active jobs in fix-queue:", jobCounts);
    await fixQueue.close();
})();
