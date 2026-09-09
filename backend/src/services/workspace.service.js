const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const {
    resolveInside
} = require("./path-safety");

class WorkspaceService {

    async create() {

        const tempRoot = os.tmpdir();

        const workspace = await fs.mkdtemp(
            path.join(
                tempRoot,
                "amigo-ws-"
            )
        );

        console.log(
            "Workspace created:",
            workspace
        );

        return workspace;
    }


    async dispose(workspace) {

        if (!workspace) return;

        await fs.rm(
            workspace,
            {
                recursive: true,
                force: true
            }
        );

        console.log(
            "Workspace disposed:",
            workspace
        );
    }


    async listTree(workspace) {
        const EXCLUDED_DIRS = new Set([
            ".git",
            "node_modules",
            "dist",
            "build",
            "coverage",
            "cache"
        ]);
        const results = [];

        async function walk(currentPath, relativePath = "") {

            const entries =
                await fs.readdir(
                    currentPath,
                    {
                        withFileTypes: true
                    }
                );

            for (const entry of entries) {

                // Never expose excluded directories to the LLM.
                if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) {
                    continue;
                }

                const entryRelative =
                    relativePath
                        ? path.join(
                            relativePath,
                            entry.name
                        )
                        : entry.name;

                const entryAbsolute =
                    path.join(
                        currentPath,
                        entry.name
                    );

                if (entry.isDirectory()) {

                    await walk(
                        entryAbsolute,
                        entryRelative
                    );

                } else {

                    results.push(
                        entryRelative
                            .split(path.sep)
                            .join("/")
                    );
                }
            }
        }

        await walk(workspace);

        return results;
    }


    async readFile(workspace, candidate) {

        const resolved =
            resolveInside(
                workspace,
                candidate
            );

        if (!resolved) {

            throw new Error(
                `Invalid file path: ${candidate}`
            );
        }

        const stat =
            await fs.stat(
                resolved.absolute
            );

        if (!stat.isFile()) {

            throw new Error(
                `Not a file: ${candidate}`
            );
        }

        const content =
            await fs.readFile(
                resolved.absolute,
                "utf8"
            );

        return {
            path: resolved.relative,
            content,
            bytes: Buffer.byteLength(
                content,
                "utf8"
            )
        };
    }
}


module.exports =
    new WorkspaceService();