require("dotenv").config();

const llmService =
    require("./src/services/llm.service");

async function test() {

    const logs = `
Run npm test

npm error Missing script: "test"

npm error To see a list of scripts, run:
npm error   npm run

##[error]Process completed with exit code 1.
`;

    const result =
        await llmService.analyzeFailure({
            logs,
            repository: "racheheheit/AI-Test-Project",
            commitSha: "25d0e7c74e5a153adfcac90f233291ddbb0577b0"
        });

    console.log(
        "========== GEMINI DIAGNOSIS =========="
    );

    console.log(
        JSON.stringify(result, null, 2)
    );
}

test().catch(error => {

    console.error(
        "LLM test failed:"
    );

    console.error(error);

});