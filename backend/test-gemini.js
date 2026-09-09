require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function test() {

    const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: "Say hello to Amigo in one sentence."
    });

    console.log("Gemini response:");
    console.log(response.text);
}

test().catch((error) => {
    console.error("Gemini test failed:");
    console.error(error);
});