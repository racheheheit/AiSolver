const workflowService =
    require("./src/services/workflow.service");

async function test() {

    const workflow =
        await workflowService.load(
            "/Users/rachitsinghrana/Desktop/FakeApp/.github/workflows/test.yml"
        );

    console.log("========== WORKFLOW ==========");
    console.log(workflow);

    const steps =
        workflowService.getRunSteps(workflow);

    console.log("\n========== RUN STEPS ==========");

    for (const step of steps) {

        console.log("\nJob:", step.job);
        console.log("Name:", step.name);
        console.log("Command:");
        console.log(step.command);
    }
}

test().catch(console.error);