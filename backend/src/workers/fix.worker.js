require("dotenv").config();

const path = require("path");
const { Worker } = require("bullmq");

const RawEvent = require("../models/rawEvent.model");
const connectMongo = require("../config/mongo");

const workspaceService =
    require("../services/workspace.service");

const gitService =
    require("../services/git.service");

const githubService =
    require("../services/github.service");

const llmService =
    require("../services/llm.service");

const patchService =
    require("../services/patch.service");

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


        // ==========================================
        // 1. GET RAW EVENT
        // ==========================================

        const rawEvent =
            await RawEvent.findById(
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


        // ==========================================
        // 2. GET WORKFLOW RUN
        // ==========================================

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


        // ==========================================
        // 3. GET ACTUAL GITHUB CI FAILURE LOGS
        // ==========================================

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

        console.log(
            "=============================="
        );


        // ==========================================
        // 4. CREATE ISOLATED WORKSPACE
        // ==========================================

        const workspace =
            await workspaceService.create();

        try {

            // ==========================================
            // 5. REPOSITORY PATH
            // ==========================================

            const repoPath =
                path.join(
                    workspace,
                    "repository"
                );


            // ==========================================
            // 6. CLONE REPOSITORY
            // ==========================================

            const repoUrl =
                `https://github.com/${rawEvent.repository.fullName}.git`;

            await gitService.clone(
                repoUrl,
                repoPath
            );


            // ==========================================
            // 7. CHECKOUT EXACT FAILING COMMIT
            // ==========================================

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


            // ==========================================
            // 8. BUILD REPOSITORY FILE TREE
            // ==========================================

            const tree =
                await workspaceService.listTree(
                    repoPath
                );


            console.log(
                "=============================="
            );

            console.log(
                "REPOSITORY TREE"
            );

            console.log(
                "=============================="
            );

            console.log(
                tree.join("\n")
            );


            // ==========================================
            // 9. SEND LOGS + TREE TO GEMINI
            // ==========================================

            console.log(
                "=============================="
            );

            console.log(
                "ANALYZING CI FAILURE"
            );

            console.log(
                "=============================="
            );

            
            const diagnosis =
                await llmService.analyzeFailure({

                    logs:
                        failure.logs,

                    repository:
                        rawEvent.repository.fullName,

                    commitSha,

                    tree,

                    workspaceService,

                    repoPath

                });


            // ==========================================
            // 10. PRINT GEMINI DIAGNOSIS
            // ==========================================

            console.log(
                "=============================="
            );

            console.log(
                "GEMINI DIAGNOSIS"
            );

            console.log(
                "=============================="
            );

            console.log(
                JSON.stringify(
                    diagnosis,
                    null,
                    2
                )
            );

            console.log(
                "=============================="
            );

            // ==========================================
            // 11. APPLY PROPOSED FIX TO WORKSPACE REPO
            // ==========================================
            if (diagnosis?.type === "proposed_fix" && diagnosis?.proposal) {
                console.log(
                    "=============================="
                );
                console.log(
                    "APPLYING PROPOSED FIX TO REPOSITORY"
                );
                console.log(
                    "=============================="
                );

                const patchResult = await patchService.applyPatch(
                    repoPath,
                    diagnosis.proposal
                );

                console.log(
                    "Patch application result:",
                    patchResult
                );
                console.log(
                    "=============================="
                );

                // ==========================================
                // 12. CREATE GIT FIX BRANCH
                // ==========================================
                const fixBranchName = `amigo/fix-run-${runId}`;

                await gitService.createBranch(
                    fixBranchName,
                    repoPath
                );

                // ==========================================
                // 13. COMMIT PATCH CHANGES
                // ==========================================
                const commitMessage = `fix(ci): ${diagnosis.proposal.explanation || 'Automated CI failure fix'} [confidence: ${diagnosis.proposal.confidence || 90}%]`;

                await gitService.commitAll(
                    commitMessage,
                    repoPath
                );

                // ==========================================
                // 14. PUSH FIX BRANCH TO GITHUB
                // ==========================================
                await gitService.push(
                    fixBranchName,
                    repoPath,
                    rawEvent.repository.fullName,
                    process.env.GITHUB_TOKEN
                );

                // ==========================================
                // 15. CREATE AUTOMATED PULL REQUEST
                // ==========================================
                const baseBranch = workflowRun.head_branch || "main";
                const prTitle = `fix(ci): Automated fix for ${rawEvent.repository.fullName} (run #${runId})`;
                const prBody = `## 🤖 Amigo Automated CI Fix

### Summary
${diagnosis.proposal.explanation || 'Automated fix proposed for failing CI run.'}

### Changes Applied
- **Target File**: \`${diagnosis.proposal.filePath}\`
- **Confidence Score**: \`${diagnosis.proposal.confidence || 90}%\`

### Trigger Information
- **Repository**: \`${rawEvent.repository.fullName}\`
- **Workflow Run ID**: \`${runId}\`
- **Failing Commit**: \`${commitSha}\`

---
*Generated automatically by Amigo*`;

                const prResult = await githubService.createPullRequest({
                    owner: rawEvent.repository.owner,
                    repo: rawEvent.repository.name,
                    title: prTitle,
                    head: fixBranchName,
                    base: baseBranch,
                    body: prBody
                });

                console.log(
                    "=============================="
                );
                console.log(
                    "PULL REQUEST CREATED SUCCESSFULLY!"
                );
                console.log(
                    "PR URL:",
                    prResult.url
                );
                console.log(
                    "=============================="
                );
            }


        } finally {

            // ==========================================
            // 11. ALWAYS CLEAN UP WORKSPACE
            // ==========================================

            await workspaceService.dispose(
                workspace
            );
        }
    },


    // ==============================================
    // BULLMQ CONNECTION
    // ==============================================

    {
        connection: {
            url: process.env.REDIS_URL,
            maxRetriesPerRequest: null
        }
    }
);


// ==============================================
// WORKER EVENTS
// ==============================================

fixWorker.on(
    "completed",
    (job) => {

        console.log(
            `Job ${job.id} has completed!`
        );
    }
);


fixWorker.on(
    "failed",
    (job, err) => {

        console.error(
            `Job ${job.id} has failed with error: ${err.message}`
        );
    }
);


fixWorker.on(
    "error",
    (err) => {

        console.error(
            "Worker encountered an error:",
            err
        );
    }
);


console.log(
    "Worker is running and listening for jobs..."
);