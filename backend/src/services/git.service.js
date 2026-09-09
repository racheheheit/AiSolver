const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

class GitService {

    async clone(repositoryUrl, destination) {
        console.log("Cloning repository...");
        console.log("Repository:", repositoryUrl);
        console.log("Destination:", destination);

        await execFileAsync(
            "git",
            ["clone", repositoryUrl, destination]
        );

        console.log("Repository cloned successfully.");
    }

    async checkout(commitSha, repositoryPath) {
        console.log("Checking out commit:", commitSha);

        await execFileAsync(
            "git",
            ["checkout", commitSha],
            {
                cwd: repositoryPath
            }
        );

        console.log("Checked out commit successfully.");
    }

    async createBranch(branchName, repositoryPath) {
        console.log("Creating branch:", branchName);

        await execFileAsync(
            "git",
            ["checkout", "-b", branchName],
            {
                cwd: repositoryPath
            }
        );

        console.log("Branch created successfully.");
    }

    async commitAll(message, repositoryPath) {
        console.log("Committing changes...");

        await execFileAsync(
            "git",
            ["config", "user.name", "Amigo Bot"],
            { cwd: repositoryPath }
        );

        await execFileAsync(
            "git",
            ["config", "user.email", "amigo@bot.local"],
            { cwd: repositoryPath }
        );

        await execFileAsync(
            "git",
            ["add", "."],
            { cwd: repositoryPath }
        );

        await execFileAsync(
            "git",
            ["commit", "-m", message],
            { cwd: repositoryPath }
        );

        console.log("Changes committed successfully.");
    }

    async push(branchName, repositoryPath, repositoryFullName, token) {
        console.log("Pushing branch to GitHub:", branchName);

        let remoteUrl;
        if (token) {
            if (token.startsWith("github_pat_") || token.startsWith("ghp_")) {
                remoteUrl = `https://${token}@github.com/${repositoryFullName}.git`;
            } else {
                remoteUrl = `https://x-access-token:${token}@github.com/${repositoryFullName}.git`;
            }
        } else {
            remoteUrl = `https://github.com/${repositoryFullName}.git`;
        }

        await execFileAsync(
            "git",
            ["push", remoteUrl, branchName],
            { cwd: repositoryPath }
        );

        console.log("Branch pushed successfully.");
    }
}

module.exports = new GitService();