const { Octokit } = require("octokit");

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

async function getWorkflowJobs(owner, repo, runId) {
    const response = await octokit.rest.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: runId
    });

    return response.data.jobs;
}

function getFailedJob(jobs) {
    return jobs.find(job => job.conclusion === "failure");
}

async function getJobLogs(owner, repo, jobId) {
    const response = await octokit.rest.actions.downloadJobLogsForWorkflowRun({
        owner,
        repo,
        job_id: jobId
    });

    return response.data;
}

function extractErrors(logs) {
    const lines = logs.split("\n");

    return lines.filter(line =>
        /error|fail|failed|exit code/i.test(line)
    );
}


async function getFailureLogs(owner, repo, runId) {
    const jobs = await getWorkflowJobs(owner, repo, runId);

    const failedJob = getFailedJob(jobs);

    if (!failedJob) {
        throw new Error("No failed job found");
    }

    const logs = await getJobLogs(
        owner,
        repo,
        failedJob.id
    );

    return {
        jobId: failedJob.id,
        jobName: failedJob.name,
        logs
    };
}

module.exports = {
    getWorkflowJobs,
    getFailedJob,
    getJobLogs,
    extractErrors,
    getFailureLogs

};