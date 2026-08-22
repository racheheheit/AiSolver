const { spawn } = require("child_process");

class CommandService {

    run(command, args = [], options = {}) {

        const {
            cwd,
            timeout = 30000
        } = options;

        return new Promise((resolve, reject) => {

            const startTime = Date.now();

            const child = spawn(command, args, {
                cwd,
                shell: false
            });

            let stdout = "";
            let stderr = "";


            child.stdout.on("data", (data) => {
                stdout += data.toString();
            });


            child.stderr.on("data", (data) => {
                stderr += data.toString();
            });


            const timer = setTimeout(() => {

                child.kill("SIGKILL");

                reject(
                    new Error(
                        `Command timed out after ${timeout}ms`
                    )
                );

            }, timeout);

    
            child.on("error", (error) => {

                clearTimeout(timer);

                reject(error);

            });

           
            child.on("close", (exitCode) => {

                clearTimeout(timer);

                const duration =
                    Date.now() - startTime;

                resolve({
                    exitCode,
                    stdout,
                    stderr,
                    duration
                });

            });

        });
    }
}

module.exports = new CommandService();