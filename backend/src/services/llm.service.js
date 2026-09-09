const { GoogleGenAI } = require("@google/genai");
const patchService = require("./patch.service");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MAX_FILES = 20;
const MAX_TOTAL_BYTES = 200 * 1024;

const responseSchema = {
  type: "object",

  properties: {
    failureType: {
      type: "string",
    },

    summary: {
      type: "string",
    },

    rootCause: {
      type: "string",
    },

    relevantFiles: {
      type: "array",
      items: {
        type: "string",
      },
    },

    evidence: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },

  required: [
    "failureType",
    "summary",
    "rootCause",
    "relevantFiles",
    "evidence",
  ],
};

class LLMService {
  async analyzeFailure({
    logs,
    repository,
    commitSha,
    tree,
    workspaceService,
    repoPath,
  }) {
    if (!logs || logs.trim().length === 0) {
      throw new Error("CI logs are empty");
    }

    if (!Array.isArray(tree)) {
      throw new Error("Repository tree is required");
    }

    const requestedFiles = new Set();

    let totalBytes = 0;

    const tools = [
      {
        functionDeclarations: [
          {
            name: "request_files",

            description:
              "Request the contents of one or more files from the repository. Only request files that are relevant to diagnosing the CI failure.",

            parameters: {
              type: "object",

              properties: {
                files: {
                  type: "array",

                  items: {
                    type: "object",

                    properties: {
                      path: {
                        type: "string",
                        description: "Repository-relative file path",
                      },
                    },

                    required: ["path"],
                  },
                },
              },

              required: ["files"],
            },
          },

          {
            name: "propose_fix",

            description:
              "Propose a precise change to an existing repository file to fix the CI failure. Do not modify the file. Return an exact oldString and its replacement newString.",

            parameters: {
              type: "object",

              properties: {
                filePath: {
                  type: "string",
                  description: "Repository-relative path of the file to modify",
                },

                oldString: {
                  type: "string",
                  description: "Exact existing text that should be replaced",
                },

                newString: {
                  type: "string",
                  description: "Replacement text",
                },

                explanation: {
                  type: "string",
                  description: "Why this change fixes the CI failure",
                },

                confidence: {
                  type: "number",
                  description: "Confidence in the proposed fix from 0 to 100",
                },
              },

              required: [
                "filePath",
                "oldString",
                "newString",
                "explanation",
                "confidence",
              ],
            },
          },
        ],
      },
    ];

    const initialPrompt = `
You are an expert software debugging assistant.

Analyze a GitHub Actions CI failure.

Repository:
${repository}

Failing commit:
${commitSha}

CI failure logs:
${logs}

Repository file tree:
${tree.join("\n")}

You do NOT have direct access to the repository files.

If you need to inspect files, use the request_files tool.

Rules:

1. Only request files that are relevant to the failure.
2. Request the smallest number of files necessary.
3. Do not request .git files.
4. Do not request secrets or environment files.
5. Do not request files outside the repository tree.
6. Once you have enough information to identify the root cause, use the propose_fix tool to propose the smallest safe change required to fix the failure.
7. Do not modify files directly.
8. The propose_fix tool only proposes a change; the backend will validate it.
9. Never propose changes to .github/workflows files.

Once you have enough information, provide the structured diagnosis.
`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: initialPrompt,
          },
        ],
      },
    ];

    for (let iteration = 0; iteration < 6; iteration++) {
      console.log(
        `Gemini iteration ${iteration + 1}: sending request...`
      );

      const MODELS = ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.6-flash"];
      let response;
      let modelIndex = 0;
      let retries = 0;
      const maxRetriesPerModel = 2;

      while (modelIndex < MODELS.length) {
        const currentModel = MODELS[modelIndex];
        try {
          response = await ai.models.generateContent({
            model: currentModel,

            contents,

            config: {
              tools,

              responseMimeType: "application/json",

              responseSchema,
            },
          });
          break;
        } catch (error) {
          const isQuotaOrTransient =
            error?.status === 503 ||
            error?.code === 503 ||
            error?.status === 429 ||
            error?.code === 429 ||
            (error?.message && (
              error.message.includes("503") ||
              error.message.includes("429") ||
              error.message.includes("high demand") ||
              error.message.includes("UNAVAILABLE") ||
              error.message.includes("RESOURCE_EXHAUSTED") ||
              error.message.includes("quota")
            ));

          if (isQuotaOrTransient) {
            if (retries < maxRetriesPerModel) {
              retries++;
              const backoffMs = Math.pow(2, retries) * 1000;
              console.warn(
                `Gemini API error on model ${currentModel} (${error?.status || error?.code || '429/503'}). Retrying attempt ${retries}/${maxRetriesPerModel} in ${backoffMs}ms...`
              );
              await new Promise((resolve) => setTimeout(resolve, backoffMs));
              continue;
            } else {
              console.warn(`Model ${currentModel} exhausted quota/retries. Falling back to next model...`);
              modelIndex++;
              retries = 0;
              continue;
            }
          } else {
            throw error;
          }
        }
      }

      if (!response) {
        throw new Error("All Gemini models failed or exhausted quota limits.");
      }

      console.log(
        `Gemini iteration ${iteration + 1}: response received`
      );

      const candidate = response.candidates?.[0];

      const parts = candidate?.content?.parts || [];

      const functionCalls = parts.filter(
        (part) => part.functionCall
      );

      // ==========================================
      // GEMINI FUNCTION CALLS
      // ==========================================

      if (functionCalls.length > 0) {
        for (const part of functionCalls) {
          const call = part.functionCall;

          // ==========================================
          // GEMINI PROPOSED FIX
          // ==========================================

          if (call.name === "propose_fix") {
            console.log(
              "=============================="
            );

            console.log(
              "GEMINI PROPOSED FIX RECEIVED"
            );

            console.log(
              "=============================="
            );

            console.log(
              JSON.stringify(
                call.args,
                null,
                2
              )
            );

            console.log(
              "=============================="
            );

            // ==========================================
            // PATCH VALIDATION & SELF-CORRECTION
            // ==========================================
            const validation = await patchService.validatePatch(repoPath, call.args);

            if (validation.ok) {
              console.log("Patch validation PASSED!");

              return {
                type: "proposed_fix",
                proposal: call.args,
              };
            }

            console.warn(`Patch validation FAILED: ${validation.reason}`);
            console.warn("Sending feedback to Gemini for self-correction...");

            contents.push({
              role: "model",
              parts: [part],
            });

            contents.push({
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: "propose_fix",
                    response: {
                      status: "error",
                      message: `Patch validation failed: ${validation.reason}. Please inspect the exact file content using request_files and propose a valid fix.`,
                    },
                  },
                },
              ],
            });

            continue;
          }

          // ==========================================
          // GEMINI REQUESTED FILES
          // ==========================================

          if (call.name !== "request_files") {
            continue;
          }

          const files = call.args?.files;

          if (!Array.isArray(files)) {
            throw new Error(
              "Invalid request_files arguments"
            );
          }

          const fileResults = [];

          for (const requested of files) {
            const filePath = requested.path;

            if (typeof filePath !== "string") {
              fileResults.push({
                path: filePath,
                error: "Invalid file path",
              });

              continue;
            }

            // ==================================
            // FILE BUDGET
            // ==================================

            if (
              requestedFiles.size >= MAX_FILES &&
              !requestedFiles.has(filePath)
            ) {
              fileResults.push({
                path: filePath,
                error: "File request budget exceeded",
              });

              continue;
            }

            // ==================================
            // TREE VALIDATION
            // ==================================

            if (!tree.includes(filePath)) {
              fileResults.push({
                path: filePath,
                error:
                  "File does not exist in repository tree",
              });

              continue;
            }

            // ==================================
            // READ FILE
            // ==================================

            try {
              const file =
                await workspaceService.readFile(
                  repoPath,
                  filePath
                );

              // ==================================
              // BYTE BUDGET
              // ==================================

              if (
                totalBytes + file.bytes >
                MAX_TOTAL_BYTES
              ) {
                fileResults.push({
                  path: filePath,
                  error:
                    "Total file-size budget exceeded",
                });

                continue;
              }

              requestedFiles.add(filePath);

              totalBytes += file.bytes;

              fileResults.push({
                path: file.path,
                content: file.content,
              });
            } catch (error) {
              fileResults.push({
                path: filePath,
                error: error.message,
              });
            }
          }

          // ==========================================
          // SEND FILE CONTENT BACK TO GEMINI
          // ==========================================

          contents.push({
            role: "model",
            parts: [part],
          });

          contents.push({
            role: "user",

            parts: [
              {
                functionResponse: {
                  name: "request_files",

                  response: {
                    files: fileResults,
                  },
                },
              },
            ],
          });
        }

        continue;
      }

      // ==========================================
      // GEMINI FINISHED ANALYSIS
      // ==========================================

      if (response.text) {
        return JSON.parse(response.text);
      }

      throw new Error(
        "Gemini returned no usable response"
      );
    }

    throw new Error(
      "Gemini exceeded maximum analysis iterations"
    );
  }
}

module.exports = new LLMService();