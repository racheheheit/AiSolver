const workspaceService = require("./src/services/workspace.service");
const gitService = require("./src/services/git.service");

async function test() {
    let workspace;

    try {
        workspace = await workspaceService.create();

        const repoPath = `${workspace}/AI-Test-Project`;

        await gitService.clone(
            "https://github.com/racheheheit/AI-Test-Project.git",
            repoPath
        );

        await gitService.checkout(
            "b46a85651f433f5320fd44165b94c5e013e7825c",
            repoPath
        );

        console.log("Repository is ready at:", repoPath);

    } catch (error) {
        console.error("Git test failed:", error.message);
    } finally {
        if (workspace) {
            await workspaceService.dispose(workspace);
        }
    }
}

test();