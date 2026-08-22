const path = require("path");

const {
    resolveInside,
    validateFixPath
} = require("./src/services/path-safety");

const repoRoot = "/tmp/aisolver-test-repo";

function testResolve(candidate) {

    const result = resolveInside(
        repoRoot,
        candidate
    );

    console.log(
        `[READ] ${candidate}`,
        "=>",
        result
    );
}

function testWrite(candidate) {

    const result = validateFixPath(
        repoRoot,
        candidate
    );

    console.log(
        `[WRITE] ${candidate}`,
        "=>",
        result
    );
}

console.log("\n========== READ TESTS ==========\n");

testResolve("src/app.js");

testResolve("tests/app.test.js");

testResolve("../outside.txt");

testResolve("../../../../etc/passwd");

testResolve("/etc/passwd");


console.log("\n========== WRITE TESTS ==========\n");

testWrite("src/app.js");

testWrite("tests/app.test.js");

testWrite("package.json");

testWrite("server/controllers/user.js");

testWrite(".env");

testWrite(".env.local");

testWrite("secrets/api-key.json");

testWrite(".github/workflows/deploy.yml");

testWrite(".git/config");

testWrite("../../outside.js");

testWrite("/etc/passwd");

testWrite("random-folder/file.js");