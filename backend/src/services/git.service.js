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
}


module.exports = new GitService();