const workspaceService =
    require("./src/services/workspace.service");

const fs = require("fs/promises");

async function test() {

    const workspace =
        await workspaceService.create();

    try {

        await fs.mkdir(
            `${workspace}/repository/src`,
            {
                recursive: true
            }
        );

        await fs.writeFile(
            `${workspace}/repository/package.json`,
            '{"name":"fake-app"}'
        );

        await fs.writeFile(
            `${workspace}/repository/src/app.js`,
            'console.log("hello");'
        );

        const repoPath =
            `${workspace}/repository`;


        console.log(
            "========== TREE =========="
        );

        const tree =
            await workspaceService.listTree(
                repoPath
            );

        console.log(tree);


        console.log(
            "========== READ =========="
        );

        const file =
            await workspaceService.readFile(
                repoPath,
                "package.json"
            );

        console.log(file);


        console.log(
            "========== TRAVERSAL TEST =========="
        );

        try {

            await workspaceService.readFile(
                repoPath,
                "../../../../etc/passwd"
            );

        } catch (error) {

            console.log(
                "Blocked:",
                error.message
            );
        }

    } finally {

        await workspaceService.dispose(
            workspace
        );
    }
}

test().catch(console.error);