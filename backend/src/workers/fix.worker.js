require("dotenv").config();
const {Worker} =require("bullmq");
const RawEvent = require("../models/rawEvent.model");
const connectMongo =require("../config/mongo");
connectMongo();
const fixWorker = new Worker(
    "fix-queue",
    async (job) => {
         console.log("==============================");
        console.log("Job received!");
        console.log("Job ID:", job.id);
        console.log("Job name:", job.name);
        console.log("Job data:", job.data);
        console.log("==============================");
        const rawEvent = await RawEvent.findById(job.data.rawEventId);
        if(!rawEvent){
            throw new Error(`RawEvent with ID ${job.data.rawEventId} not found`);
        }
        console.log("RawEvent found:", rawEvent._id);
        console.log("RawEvent type:", rawEvent.eventType);
        console.log("Delivery ID:", rawEvent.deliveryId);
        console.log("Repository:", rawEvent.repository.fullName);
        console.log("==============================");

    },
    {
        connection:{
        url: process.env.REDIS_URL
    }}
);
fixWorker.on("completed", (job) => {
    console.log(`Job ${job.id} has completed!`);
})

fixWorker.on("failed" , (job,err)=>{
    console.error(`Job ${job.id} has failed with error: ${err.message}`);
})

fixWorker.on("error", (err) => {
    console.error("Worker encountered an error:", err);
});

console.log("Worker is running and listening for jobs...");