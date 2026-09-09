const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const patchService = require("./src/services/patch.service");

async function runTests() {
    console.log("========== TESTING PATCH SERVICE ==========");

    // 1. Setup temporary repo workspace
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "patch-test-"));
    const srcDir = path.join(tempDir, "src");
    await fs.mkdir(srcDir, { recursive: true });

    const testFile = path.join(srcDir, "app.js");
    const initialContent = 'function main() {\n  console.log("Hello World");\n}\nmain();\n';
    await fs.writeFile(testFile, initialContent, "utf8");

    console.log("1. Created mock workspace at:", tempDir);

    // 2. Test Path Safety Check (Blocked path)
    const blockedRes = await patchService.validatePatch(tempDir, {
        filePath: ".env",
        oldString: "SECRET=123",
        newString: "SECRET=456"
    });
    console.log("2. Blocked path check (.env):", !blockedRes.ok && blockedRes.reason.includes("blocked") ? "PASS ✅" : "FAIL ❌");

    // 3. Test Path Traversal Check (Escapes root)
    const traversalRes = await patchService.validatePatch(tempDir, {
        filePath: "../outside.js",
        oldString: "a",
        newString: "b"
    });
    console.log("3. Path traversal check (../):", !traversalRes.ok && traversalRes.reason.includes("escapes") ? "PASS ✅" : "FAIL ❌");

    // 4. Test Missing oldString
    const missingRes = await patchService.validatePatch(tempDir, {
        filePath: "src/app.js",
        oldString: "function nonExistent()",
        newString: "function fixed()"
    });
    console.log("4. Missing oldString check:", !missingRes.ok && missingRes.reason.includes("was not found") ? "PASS ✅" : "FAIL ❌");

    // 5. Test Ambiguous oldString (multiple occurrences)
    const ambiguousContent = 'console.log("a");\nconsole.log("a");\n';
    await fs.writeFile(testFile, ambiguousContent, "utf8");
    const ambiguousRes = await patchService.validatePatch(tempDir, {
        filePath: "src/app.js",
        oldString: 'console.log("a");',
        newString: 'console.log("b");'
    });
    console.log("5. Ambiguous oldString check:", !ambiguousRes.ok && ambiguousRes.reason.includes("multiple times") ? "PASS ✅" : "FAIL ❌");

    // 6. Test Valid Patch Application
    await fs.writeFile(testFile, initialContent, "utf8");
    const validProposal = {
        filePath: "src/app.js",
        oldString: 'console.log("Hello World");',
        newString: 'console.log("Hello Fixed World");',
        explanation: "Fix output log text",
        confidence: 95
    };

    const applyRes = await patchService.applyPatch(tempDir, validProposal);
    const updatedContent = await fs.readFile(testFile, "utf8");
    const patchVerified = updatedContent.includes('console.log("Hello Fixed World");');
    console.log("6. Valid patch application:", applyRes.success && patchVerified ? "PASS ✅" : "FAIL ❌");

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log("===========================================");
}

runTests().catch(err => {
    console.error("Test failed with error:", err);
    process.exit(1);
});
