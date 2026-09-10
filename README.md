# AMIGO

> **Autonomous AI Agent for Automated GitHub CI/CD Failure Diagnosis & PR Resolution**

AMIGO is an autonomous AI coding assistant backend that listens to GitHub Actions CI/CD failure webhooks, fetches failure logs, creates an isolated sandboxed workspace, diagnoses root causes using Google Gemini LLMs with dynamic tool-calling (`request_files` & `propose_fix`), validates & applies code patches, and automatically opens Pull Requests on GitHub.

---

## System Architecture & Pipeline Flow

```flowchart TD
    subgraph Trigger ["1. Webhook Ingestion and Job Queueing"]
        A1["GitHub Actions Workflow Run"] -->|CI Test Failure| A2["GitHub Webhook Event"]
        A2 -->|POST webhook github| B1["Express API Server - server.js"]
        B1 -->|Verify HMAC Signature| B2{"Valid Signature?"}
        B2 -->|No| B3["Return 401 Unauthorized"]
        B2 -->|Yes| B4["Save Raw Event to MongoDB Atlas"]
        B4 -->|Enqueue Job| B5["BullMQ fixQueue"]
    end

    subgraph Preparation ["2. Workspace and Failure Log Preparation"]
        B5 -->|Consume Job| C1["Fix Worker Engine - fix.worker.js"]
        C1 -->|Fetch Failure Logs via Octokit| C2["GitHub API - getFailureLogs"]
        C1 -->|Create Sandboxed Temp Directory| C3["Workspace Service - mkdtemp"]
        C3 -->|Git Clone and Checkout Failing Commit| C4["Git Service - clone and checkout"]
        C4 -->|Extract Repository File Structure| C5["Filtered Repo Tree"]
    end

    subgraph AgenticAI ["3. Gemini AI Tool Calling and Diagnostics"]
        C5 -->|Pass Logs and File Tree| D1["LLM Service - analyzeFailure"]
        D1 -->|Invoke Gemini Model| D2["Gemini AI Model"]
        D2 -->|Tool Call request_files| D3["Read File Contents - Budgeted"]
        D3 -->|Return File Content| D2
        D2 -->|Tool Call propose_fix| D4["Proposed Fix"]
    end

    subgraph Validation ["4. Patch Safety, Validation and Self Correction"]
        D4 --> E1["Patch Service - validatePatch"]
        E1 --> E2{"Path and Match Check"}
        E2 -->|Path Blocked or Ambiguous| E3["Send Validation Error to Gemini"]
        E3 -->|Self Correction Loop| D2
        E2 -->|Valid Unique Match| E4["Apply Patch to File"]
    end

    subgraph Execution ["5. Git Branching, Pushing and PR Creation"]
        E4 --> F1["Git Service - createBranch"]
        F1 --> F2["Git Service - commitAll"]
        F2 --> F3["Git Service - push"]
        F3 --> F4["GitHub Service - createPullRequest"]
        F4 --> F5["Pull Request Opened on GitHub"]
        F5 --> F6["Dispose Temporary Workspace"]
    end
```

---

## Key Features

- **Automated Webhook Interception**: Listens to GitHub Actions `workflow_run` failure events with HMAC signature verification.
- **Strict Path Safety & Allowlisting**: Enforces allowlist paths (`src/`, `package.json`, `tests/`) and blocks sensitive/config files (`.env`, `.git/`, `.github/workflows/`).
- **Multi-Model Resilience & Fallback**: Retries transient API errors (503/429) with exponential backoff and falls back across model tiers (`gemini-3.7-flash` -> `gemini-3.5-flash` -> `gemini-3.6-flash`).
- **In-Loop AI Self-Correction**: If a proposed fix contains mismatched strings or invalid paths, validation errors are fed back into Gemini's tool loop for immediate self-correction.
- **Sandboxed Workspace**: Performs git checkouts and code modifications in isolated `/tmp` workspace directories.
- **Automated PR Generation**: Pushes dedicated fix branches and opens structured Pull Requests with confidence scores, root cause explanations, and workflow run links.

---

## Tech Stack

- **Runtime**: Node.js (v22+)
- **API Framework**: Express.js v5
- **Queueing & Async Jobs**: BullMQ + Redis (`ioredis`)
- **Database**: MongoDB Atlas / Mongoose
- **AI Engine**: Google GenAI SDK (`@google/genai`)
- **GitHub Integration**: `@octokit/rest` & Git CLI

---

## Quick Start

### 1. Prerequisites
Ensure you have Node.js (v22+), Redis, and MongoDB running or accessible.

### 2. Environment Setup
Create a `.env` file in the `backend/` directory:
```env
PORT=3000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/amigo
REDIS_URL=redis://default:password@host:port
GITHUB_TOKEN=github_pat_...
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Install Dependencies
```bash
cd backend
npm install
```

### 4. Start Server & Worker
In terminal 1 (Server):
```bash
node src/server.js
```

In terminal 2 (Worker):
```bash
node src/workers/fix.worker.js
```