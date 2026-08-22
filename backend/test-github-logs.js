require("dotenv").config();

const {
    getWorkflowJobs,
    getFailedJob,
    getJobLogs
} = require("./src/services/github.service");

async function test() {

    const owner = "racheheheit";
    const repo = "AI-Test-Project";

    // Use the workflow_run.id from your failed RawEvent
    const runId = 32349407937;

    console.log("Getting workflow jobs...");

    const jobs =
        await getWorkflowJobs(
            owner,
            repo,
            runId
        );

    console.log("\n========== JOBS ==========");

    for (const job of jobs) {

        console.log({
            id: job.id,
            name: job.name,
            status: job.status,
            conclusion: job.conclusion
        });
    }

    const failedJob =
        getFailedJob(jobs);

    if (!failedJob) {

        console.log("No failed job found.");

        return;
    }

    console.log("\n========== FAILED JOB ==========");
    console.log({
        id: failedJob.id,
        name: failedJob.name,
        conclusion: failedJob.conclusion
    });

    console.log("\nDownloading logs...");

    const logs =
        await getJobLogs(
            owner,
            repo,
            failedJob.id
        );

    console.log("\n========== LOGS ==========\n");
    console.log(logs);
}

test().catch(console.error);