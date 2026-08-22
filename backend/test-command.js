const commandService = require("./src/services/command.service");

async function test() {
    try {
        const result = await commandService.run(
            "node",
            ["-e", "console.error('TEST FAILURE'); process.exit(1)"]
        );

        console.log("Command result:");
        console.log(result);

    } catch (error) {
        console.error("Command failed:");
        console.error(error.message);
    }
}

test();