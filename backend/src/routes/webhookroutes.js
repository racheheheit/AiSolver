const express = require("express");

const router = express.Router();

router.post("/github", (req, res) => {

    console.log("=================================");
    console.log("GitHub webhook received!");
    console.log("=================================");

    const { action, workflow_run, repository } = req.body;

    console.log("Action:", action);

    // We only care when the workflow has finished
    if (action !== "completed") {
        console.log("Workflow has not completed yet. Ignoring...");
        return res.sendStatus(200);
    }

    // Extract useful information
    const failure = {
        repository: repository?.full_name,
        workflow: workflow_run?.name,
        branch: workflow_run?.head_branch,
        commitSha: workflow_run?.head_sha,
        runId: workflow_run?.id,
        status: workflow_run?.status,
        conclusion: workflow_run?.conclusion
    };

    console.log("Failure information:");
    console.log(failure);

    // Check whether the completed workflow actually failed
    if (failure.conclusion === "failure") {
        console.log(" CI FAILURE DETECTED");
    } else {
        console.log(" Workflow completed successfully");
    }

    res.sendStatus(200);
});

module.exports = router;