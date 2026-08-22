const fs = require("fs/promises");
const os = require("os");
const path = require("path");

class WorkspaceService {

    async create() {
        const tempRoot = os.tmpdir();

        const workspace = await fs.mkdtemp(
            path.join(tempRoot, "aisolver-ws-")
        );
        console.log("Workspace created:", workspace);

        return workspace;
    }
    async dispose(workspace) {
        if (!workspace) return;

        await fs.rm(workspace, {
            recursive: true,
            force: true
        });

        console.log("Workspace disposed:", workspace);
    }
}

module.exports = new WorkspaceService();