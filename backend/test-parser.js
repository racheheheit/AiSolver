const commandParser =
    require("./src/services/command-parser.service");

const script = `
npm install
npm test
`;

try {

    const commands =
        commandParser.parse(script);

    console.log(commands);

} catch (error) {

    console.error("Parser rejected command:");
    console.error(error.message);

}