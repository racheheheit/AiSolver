const workspaceService = require("./src/services/workspace.service");

async function test() {

    const workspace = await workspaceService.create();

    console.log("Testing workspace...");
    console.log("Path:", workspace);

    await workspaceService.dispose(workspace);

    console.log("Workspace test complete!");
}

test().catch(console.error);