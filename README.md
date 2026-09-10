# AMIGO

> **Autonomous AI Agent for Automated GitHub CI/CD Failure Diagnosis & PR Resolution**

AMIGO is an autonomous AI coding assistant backend that listens to GitHub Actions CI/CD failure webhooks, fetches failure logs, creates an isolated sandboxed workspace, diagnoses root causes using Google Gemini LLMs with dynamic tool-calling (`request_files` & `propose_fix`), validates & applies code patches, and automatically opens Pull Requests on GitHub.

---

## System Architecture & Pipeline Flow

```mermaid
graph TD
    classDef github fill:#24292e,stroke:#333,stroke-width:1px,color:#fff;
    classDef server fill:#1f6feb,stroke:#333,stroke-width:1px,color:#fff;
    classDef worker fill:#238636,stroke:#333,stroke-width:1px,color:#fff;
    classDef ai fill:#8957e5,stroke:#333,stroke-width:1px,color:#fff;

    A[GitHub Actions Test Failure] :::github -->|1. Webhook Event| B[Express Server: server.js] :::server
    B -->|2. Verify HMAC Signature| C{Valid Signature?} :::server
    C -->|No| D[Return 401 Unauthorized] :::server
    C -->|Yes| E[Save Event to MongoDB] :::server
    E -->|3. Enqueue Job| F[BullMQ Redis Queue] :::server
    
    F -->|4. Consume Job| G[Fix Worker Engine: fix.worker.js] :::worker
    G -->|5. Fetch Failure Logs| H[GitHub Octokit API] :::github
    G -->|6. Create Sandbox & Clone| I[Workspace Service: /tmp] :::worker
    
    I -->|7. Analyze Logs & Repo Tree| J[LLM Service: analyzeFailure] :::ai
    J <-->|8. Tool Loop: request_files| K[Gemini AI Model] :::ai
    K -->|9. Propose Fix| L[Patch Service: validatePatch] :::worker
    
    L -->|10. Validation Error| J
    L -->|11. Valid Patch Applied| M[Git Service: Branch & Commit] :::worker
    M -->|12. Git Push Branch| N[GitHub Repository] :::github
    N -->|13. Create Pull Request| O[GitHub Pull Request Opened] :::github
    O -->|14. Cleanup| P[Dispose Workspace Directory] :::worker
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