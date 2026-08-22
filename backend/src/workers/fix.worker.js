require("dotenv").config();

const path = require("path");
const { Worker } = require("bullmq");

const RawEvent = require("../models/rawEvent.model");
const connectMongo = require("../config/mongo");

const workspaceService = require("../services/workspace.service");
const gitService = require("../services/git.service");
const githubService = require("../services/github.service");

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

        const rawEvent = await RawEvent.findById(
            job.data.rawEventId
        );

        if (!rawEvent) {
            throw new Error(
                `RawEvent with ID ${job.data.rawEventId} not found`
            );
        }

        console.log(
            "RawEvent found:",
            rawEvent._id
        );

        console.log(
            "Repository:",
            rawEvent.repository.fullName
        );

        const workflowRun =
            rawEvent.payload?.workflow_run;

        if (!workflowRun) {
            throw new Error(
                "workflow_run missing from RawEvent payload"
            );
        }

        const runId =
            workflowRun.id;

        const commitSha =
            workflowRun.head_sha;

        console.log(
            "Workflow Run ID:",
            runId
        );

        console.log(
            "Failing commit:",
            commitSha
        );

        console.log(
            "Fetching CI failure logs..."
        );

        const failure =
            await githubService.getFailureLogs(
                rawEvent.repository.owner,
                rawEvent.repository.name,
                runId
            );

        console.log("==============================");
        console.log("FAILED JOB");
        console.log("==============================");

        console.log(
            "Job ID:",
            failure.jobId
        );

        console.log(
            "Job Name:",
            failure.jobName
        );

        console.log("==============================");
        console.log("CI FAILURE LOGS");
        console.log("==============================");

        console.log(
            failure.logs
        );

        console.log("==============================");


        const workspace =
            await workspaceService.create();

        try {

            const repoPath =
                path.join(
                    workspace,
                    "repository"
                );

            const repoUrl =
                `https://github.com/${rawEvent.repository.fullName}.git`;

            await gitService.clone(
                repoUrl,
                repoPath
            );


            await gitService.checkout(
                commitSha,
                repoPath
            );


            console.log(
                "Repository ready for analysis."
            );

            console.log(
                "Workspace:",
                repoPath
            );



        } finally {

            await workspaceService.dispose(
                workspace
            );
        }
    },

    {
        connection: {
            url: process.env.REDIS_URL
        }
    }
);


fixWorker.on("completed", (job) => {

    console.log(
        `Job ${job.id} has completed!`
    );

});


fixWorker.on("failed", (job, err) => {

    console.error(
        `Job ${job.id} has failed with error: ${err.message}`
    );

});


fixWorker.on("error", (err) => {

    console.error(
        "Worker encountered an error:",
        err
    );

});


console.log(
    "Worker is running and listening for jobs..."
);