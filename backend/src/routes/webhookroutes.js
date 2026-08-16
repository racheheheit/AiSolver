const express = require("express");
const crypto =require('crypto');
const router = express.Router();
const { saveRawEvent } = require("../services/rawEvent.service");
function verifyGithubSignature(req) {
    const signature = req.headers['x-hub-signature-256'];
    if(!signature|| !req.rawBody){
        return false;
    }
    const expectedSignature =
    "sha256=" +
    crypto
        .createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET)
        .update(req.rawBody)
        .digest("hex");
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if(signatureBuffer.length !==expectedBuffer.length)return false;

    return crypto.timingSafeEqual(signatureBuffer,expectedBuffer);

}
router.post("/github", async (req, res) => {

     if (!verifyGithubSignature(req)) {

        console.log("Invalid GitHub webhook signature");

        return res.sendStatus(401);

    }

    console.log("=================================");
    console.log("GitHub webhook received!");
    console.log("=================================");

    const { action, workflow_run, repository } = req.body;

    console.log("Action:", action);
    try {
    const rawEvent = await saveRawEvent(req);
    console.log("RawEvent saved:", rawEvent._id);}
     catch (error) {
    console.error("Failed to save RawEvent:", error);
    return res.sendStatus(500);
     }

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