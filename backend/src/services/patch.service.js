const fs = require("fs/promises");
const { validateFixPath } = require("./path-safety");
const workspaceService = require("./workspace.service");

class PatchService {
    /**
     * Validates a proposed fix against path safety, file existence, and content matching.
     * @param {string} repoPath Absolute path to repository root inside workspace
     * @param {object} proposal Object with filePath, oldString, newString
     * @returns {Promise<{ok: boolean, reason?: string, file?: object, absolutePath?: string, relativePath?: string}>}
     */
    async validatePatch(repoPath, proposal) {
        if (!proposal || typeof proposal !== "object") {
            return { ok: false, reason: "Invalid proposal payload" };
        }

        const { filePath, oldString, newString } = proposal;

        if (typeof filePath !== "string" || !filePath.trim()) {
            return { ok: false, reason: "Missing or invalid filePath" };
        }

        if (typeof oldString !== "string") {
            return { ok: false, reason: "Missing or invalid oldString" };
        }

        if (typeof newString !== "string") {
            return { ok: false, reason: "Missing or invalid newString" };
        }

        // 1. Path safety validation
        const pathResult = validateFixPath(repoPath, filePath);
        if (!pathResult.ok) {
            return { ok: false, reason: pathResult.reason };
        }

        // 2. Read target file
        let file;
        try {
            file = await workspaceService.readFile(repoPath, pathResult.relativePath);
        } catch (error) {
            return { ok: false, reason: `Could not read file '${pathResult.relativePath}': ${error.message}` };
        }

        // 3. String match verification
        if (oldString.length === 0) {
            return { ok: false, reason: "oldString cannot be empty" };
        }

        const occurrences = file.content.split(oldString).length - 1;

        if (occurrences === 0) {
            return {
                ok: false,
                reason: `oldString was not found in '${pathResult.relativePath}'. Make sure to inspect the exact file content using request_files.`
            };
        }

        if (occurrences > 1) {
            return {
                ok: false,
                reason: `oldString appears multiple times (${occurrences} occurrences) in '${pathResult.relativePath}'. Provide a unique, larger code context so the replacement is unambiguous.`
            };
        }

        return {
            ok: true,
            file,
            absolutePath: pathResult.absolutePath,
            relativePath: pathResult.relativePath
        };
    }

    /**
     * Validates and applies a proposed fix to the target file in the workspace.
     * @param {string} repoPath Absolute path to repository root inside workspace
     * @param {object} proposal Object with filePath, oldString, newString, explanation, confidence
     * @returns {Promise<{success: boolean, filePath: string, explanation: string, confidence: number}>}
     */
    async applyPatch(repoPath, proposal) {
        const validation = await this.validatePatch(repoPath, proposal);

        if (!validation.ok) {
            throw new Error(`Patch validation failed: ${validation.reason}`);
        }

        const updatedContent = validation.file.content.replace(proposal.oldString, proposal.newString);

        await fs.writeFile(validation.absolutePath, updatedContent, "utf8");

        console.log(`Patch successfully applied to: ${validation.relativePath}`);

        return {
            success: true,
            filePath: validation.relativePath,
            explanation: proposal.explanation,
            confidence: proposal.confidence
        };
    }
}

module.exports = new PatchService();
