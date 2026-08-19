const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const { saveRawEvent } = require("../services/rawEvent.service");
const fixQueue = require("../queues/fix.queue");

function verifyGithubSignature(req) {
    const signature = req.headers["x-hub-signature-256"];

    if (!signature || !req.rawBody) {
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

    if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(
        signatureBuffer,
        expectedBuffer
    );
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

    let result;

    try {
        result = await saveRawEvent(req);

        if (result.duplicate) {
            console.log(
                "Duplicate GitHub delivery:",
                req.headers["x-github-delivery"]
            );

            return res.sendStatus(200);
        }

        console.log("RawEvent saved:", result.event._id);

    } catch (error) {
        console.error("========== RAW EVENT ERROR ==========");
        console.error(error);
        console.error("Message:", error.message);
        console.error("Stack:", error.stack);
        console.error("====================================");

        return res.sendStatus(500);
    }

    if (action !== "completed") {
        console.log("Workflow has not completed yet. Ignoring...");
        return res.sendStatus(200);
    }
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

    if (failure.conclusion === "failure") {

        console.log("CI FAILURE DETECTED");

        try {
            await fixQueue.add("fix-job", {
                rawEventId: result.event._id.toString()
            });

            console.log(
                "Job added to fixQueue with rawEventId:",
                result.event._id.toString()
            );

        } catch (error) {
            console.error("Failed to add job to queue:", error);
            return res.sendStatus(500);
        }

    } else {
        console.log("Workflow completed successfully");
    }

    return res.sendStatus(200);
});

module.exports = router;