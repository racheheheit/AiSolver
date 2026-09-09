const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const gitService = require("./src/services/git.service");
const githubService = require("./src/services/github.service");

async function runTests() {
    console.log("========== TESTING GIT & PR SERVICE ==========");

    // 1. Setup temporary git repo
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "git-pr-test-"));
    const srcDir = path.join(tempDir, "src");
    await fs.mkdir(srcDir, { recursive: true });

    const testFile = path.join(srcDir, "app.js");
    await fs.writeFile(testFile, 'console.log("v1");\n', "utf8");

    // Initialize dummy git repo
    const { execFile } = require("child_process");
    const { promisify } = require("util");
    const execFileAsync = promisify(execFile);

    await execFileAsync("git", ["init"], { cwd: tempDir });
    await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: tempDir });
    await execFileAsync("git", ["config", "user.email", "test@test.com"], { cwd: tempDir });
    await execFileAsync("git", ["add", "."], { cwd: tempDir });
    await execFileAsync("git", ["commit", "-m", "initial commit"], { cwd: tempDir });

    console.log("1. Mock Git repository initialized at:", tempDir);

    // 2. Test createBranch
    const branchName = "amigo/fix-test-123";
    await gitService.createBranch(branchName, tempDir);

    const { stdout: branchOut } = await execFileAsync("git", ["branch", "--show-current"], { cwd: tempDir });
    const branchCreated = branchOut.trim() === branchName;
    console.log("2. Branch creation test:", branchCreated ? "PASS ✅" : "FAIL ❌");

    // 3. Test commitAll
    await fs.writeFile(testFile, 'console.log("v2 fixed");\n', "utf8");
    await gitService.commitAll("fix(ci): fix bug in app.js", tempDir);

    const { stdout: logOut } = await execFileAsync("git", ["log", "-1", "--pretty=%B"], { cwd: tempDir });
    const commitVerified = logOut.includes("fix(ci): fix bug in app.js");
    console.log("3. Commit all test:", commitVerified ? "PASS ✅" : "FAIL ❌");

    // 4. Test githubService exported functions
    console.log("4. githubService.createPullRequest exported:", typeof githubService.createPullRequest === "function" ? "PASS ✅" : "FAIL ❌");

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log("==============================================");
}

runTests().catch(err => {
    console.error("Git PR test failed with error:", err);
    process.exit(1);
});
