# AMIGO

> **Autonomous AI Agent for Automated GitHub CI/CD Failure Diagnosis & PR Resolution**

AMIGO is an autonomous AI coding assistant backend that listens to GitHub Actions CI/CD failure webhooks, fetches failure logs, creates an isolated sandboxed workspace, diagnoses root causes using Google Gemini LLMs with dynamic tool calling, validates and applies code patches, and automatically opens Pull Requests on GitHub.

---

## System Architecture and Pipeline Flow

```mermaid
flowchart TD

    A1[GitHub Actions Workflow]
    A2[GitHub Webhook]
    A3[Express API Server]
    A4{Valid Signature}
    A5[Return 401]
    A6[Save Event to MongoDB]
    A7[Add Job to BullMQ]

    A1 -->|CI Failure| A2
    A2 -->|Webhook Request| A3
    A3 -->|Verify HMAC| A4
    A4 -->|No| A5
    A4 -->|Yes| A6
    A6 --> A7

    B1[Fix Worker]
    B2[GitHub API]
    B3[Failure Logs]
    B4[Workspace Service]
    B5[Temporary Workspace]
    B6[Git Service]
    B7[Repository Checkout]
    B8[Repository File Tree]

    A7 -->|Consume Job| B1
    B1 -->|Fetch Logs| B2
    B2 --> B3
    B1 -->|Create Workspace| B4
    B4 --> B5
    B5 -->|Clone Repository| B6
    B6 --> B7
    B7 -->|Extract Files| B8

    C1[LLM Service]
    C2[Gemini AI Model]
    C3[Request Files Tool]
    C4[Read File Contents]
    C5[Propose Fix Tool]
    C6[Proposed Patch]

    B3 --> C1
    B8 --> C1
    C1 -->|Analyze Failure| C2
    C2 -->|Request Files| C3
    C3 --> C4
    C4 -->|Return File Content| C2
    C2 -->|Propose Fix| C5
    C5 --> C6

    D1[Patch Validation Service]
    D2{Patch Valid}
    D3[Validation Error]
    D4[Apply Patch]

    C6 --> D1
    D1 --> D2
    D2 -->|No| D3
    D3 -->|Self Correction| C2
    D2 -->|Yes| D4

    E1[Create Fix Branch]
    E2[Commit Changes]
    E3[Push Branch]
    E4[Create Pull Request]
    E5[Pull Request Opened]
    E6[Dispose Workspace]

    D4 --> E1
    E1 --> E2
    E2 --> E3
    E3 --> E4
    E4 --> E5
    E5 --> E6
```

---

## How AMIGO Works

AMIGO follows an automated pipeline that takes a failed CI/CD workflow and turns it into a diagnosed and validated Pull Request.

### 1. Webhook Ingestion

GitHub Actions sends a `workflow_run` webhook when a CI/CD workflow fails.

AMIGO then:

- Receives the webhook through Express.js
- Verifies the GitHub HMAC signature
- Stores the raw event in MongoDB
- Creates a background job in BullMQ

```text
GitHub Actions
      |
      v
GitHub Webhook
      |
      v
Express API
      |
      v
HMAC Verification
      |
      v
MongoDB
      |
      v
BullMQ Queue
```

---

### 2. Failure Investigation

The background worker consumes the queued job.

It then:

1. Fetches the failed workflow logs through the GitHub API.
2. Creates an isolated temporary workspace.
3. Clones the repository.
4. Checks out the commit associated with the failure.
5. Builds a filtered repository file tree.

```text
BullMQ Job
    |
    v
Fix Worker
    |
    +------> GitHub API
    |           |
    |           v
    |       Failure Logs
    |
    +------> Workspace Service
                |
                v
        Temporary Workspace
                |
                v
            Git Clone
                |
                v
          Failing Commit
                |
                v
          Repository Tree
```

---

### 3. AI Diagnosis

The repository tree and failure logs are passed to the Gemini-powered LLM service.

The AI can dynamically request additional files when it needs more context.

The agent uses two primary tools:

- `request_files`
- `propose_fix`

The workflow is:

```text
Failure Logs
     +
Repository Tree
     |
     v
Gemini AI
     |
     +----> request_files
     |          |
     |          v
     |      File Contents
     |          |
     |          +--------> Gemini
     |
     +----> propose_fix
                |
                v
           Proposed Patch
```

---

### 4. Patch Validation

Every AI-generated patch passes through a deterministic validation layer before being applied.

AMIGO verifies:

- The requested file path is allowed.
- The file exists.
- The old string exists.
- The old string occurs exactly once.
- Sensitive files cannot be modified.

If validation fails, the error is sent back to Gemini so that the model can correct its proposed patch.

```text
Proposed Patch
      |
      v
Patch Validator
      |
      v
Patch Valid
   /       \
 No         Yes
 |           |
 v           v
Gemini    Apply Patch
 |           
 v
Self Correction
```

---

### 5. Branch and Pull Request Creation

After a successful patch:

1. AMIGO creates a dedicated fix branch.
2. Commits the changes.
3. Pushes the branch to GitHub.
4. Creates a Pull Request.
5. Includes the AI-generated diagnosis and explanation.
6. Removes the temporary workspace.

```text
Validated Patch
      |
      v
Create Fix Branch
      |
      v
Commit Changes
      |
      v
Push Branch
      |
      v
Create Pull Request
      |
      v
GitHub PR
      |
      v
Cleanup Workspace
```

---

## Key Features

### Automated Webhook Interception

Listens to GitHub Actions `workflow_run` failure events and verifies webhook authenticity using HMAC signature validation.

### Strict Path Safety

AMIGO restricts the files that the AI is allowed to modify.

Example allowed paths:

```text
src/
package.json
tests/
```

Sensitive paths such as the following are blocked:

```text
.env
.git/
.github/workflows/
```

This prevents the AI agent from modifying secrets, Git metadata, or CI workflow configuration.

### Multi-Model Resilience

AMIGO supports model fallback and retry handling for transient AI API failures.

The AI layer can retry transient errors such as:

```text
503 Service Unavailable
429 Rate Limit
```

and move to an alternative model when necessary.

### AI Self-Correction

AMIGO does not blindly apply AI-generated patches.

If a patch fails validation because of:

- Invalid file path
- Missing old string
- Multiple matches
- Blocked path

the validation error is returned to the AI agent.

This allows the agent to correct its own proposed patch.

### Sandboxed Workspace

All repository operations are performed inside isolated temporary workspace directories.

This ensures that:

- Repository changes are isolated.
- The main working environment is not modified.
- Failed executions can be safely discarded.
- Temporary workspaces can be cleaned up after execution.

### Automated Pull Requests

Once a patch is validated, AMIGO creates a dedicated Git branch and Pull Request containing:

- Root cause explanation
- Proposed fix
- AI confidence
- Workflow run information
- Changed files

---

## Tech Stack

| Component | Technology |
|---|---|
| Runtime | Node.js 22+ |
| API Framework | Express.js 5 |
| Queue | BullMQ |
| Queue Backend | Redis |
| Redis Client | ioredis |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| AI Engine | Google GenAI SDK |
| LLM | Google Gemini |
| GitHub API | Octokit |
| Version Control | Git CLI |
| Environment Management | dotenv |

---

## Project Structure

```text
AMIGO/
|
+-- backend/
|   |
|   +-- src/
|       |
|       +-- server.js
|       |
|       +-- workers/
|       |   |
|       |   +-- fix.worker.js
|       |
|       +-- services/
|           |
|           +-- github.service.js
|           +-- git.service.js
|           +-- workspace.service.js
|           +-- patch.service.js
|           +-- llm.service.js
|
+-- package.json
|
+-- README.md
```

---

## Quick Start

### 1. Prerequisites

Make sure the following are installed or accessible:

- Node.js 22+
- Redis
- MongoDB or MongoDB Atlas
- Git
- GitHub Personal Access Token
- Google Gemini API Key

---

### 2. Clone the Repository

```bash
git clone <your-repository-url>
cd AMIGO
```

---

### 3. Environment Setup

Create a `.env` file inside the `backend/` directory.

```env
PORT=3000

MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/amigo

REDIS_URL=redis://default:password@host:port

GITHUB_TOKEN=github_pat_...

GITHUB_WEBHOOK_SECRET=your_webhook_secret

GEMINI_API_KEY=your_gemini_api_key
```

> Never commit your `.env` file or expose API keys, database credentials, or GitHub tokens.

---

### 4. Install Dependencies

```bash
cd backend
npm install
```

---

### 5. Start the API Server

Open a terminal and run:

```bash
node src/server.js
```

The Express server will start on the configured port.

---

### 6. Start the Fix Worker

Open another terminal:

```bash
cd backend
node src/workers/fix.worker.js
```

The worker will consume jobs from the BullMQ `fixQueue`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Express server port |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection URL |
| `GITHUB_TOKEN` | GitHub authentication token |
| `GITHUB_WEBHOOK_SECRET` | Secret used for webhook HMAC verification |
| `GEMINI_API_KEY` | Google Gemini API key |

---

## CI/CD Failure Resolution Pipeline

The complete lifecycle of a failure is:

```text
GitHub Actions Failure
          |
          v
    Webhook Received
          |
          v
   Signature Verified
          |
          v
     Event Stored
          |
          v
      BullMQ Job
          |
          v
      Fix Worker
          |
          +------> Fetch Failure Logs
          |
          +------> Clone Repository
          |
          +------> Checkout Failed Commit
          |
          v
   Repository Analysis
          |
          v
       Gemini AI
          |
          +------> Request Files
          |
          +------> Analyze Failure
          |
          +------> Propose Fix
          |
          v
    Patch Validation
          |
       +--+--+
       |     |
    Invalid  Valid
       |     |
       v     v
    Gemini  Apply Patch
       |     |
       +-----+
          |
          v
    Create Branch
          |
          v
     Commit Fix
          |
          v
     Push Branch
          |
          v
   Create Pull Request
          |
          v
      GitHub PR
```

---

## Safety Model

AMIGO is designed around the principle:

> **The AI can propose changes, but deterministic code validates those changes before they are applied.**

The AI does not receive unrestricted filesystem access.

Instead, AMIGO controls the agent through explicit tools and validation layers.

```text
                 Gemini
                   |
          +--------+--------+
          |                 |
    request_files      propose_fix
          |                 |
          v                 v
   File Access Layer   Patch Validator
                            |
                            v
                       Safety Checks
                            |
                            v
                       Apply Change
```

This architecture provides a separation between:

- AI reasoning
- File access
- Patch generation
- Patch validation
- Git operations
- Pull Request creation

---

## Design Principles

### AI Proposes, Code Decides

The AI is responsible for diagnosis and patch generation.

Deterministic application code is responsible for validating and applying the patch.

### Least Privilege

The agent should only access the files and operations required to diagnose and resolve the failure.

### Isolation

Repository cloning and modification happen inside temporary isolated workspaces.

### Human Review

Although AMIGO automatically creates Pull Requests, the resulting changes can still be reviewed through the normal GitHub Pull Request workflow.

---

## Future Improvements

Potential future improvements include:

- Automated test execution after patching
- Multiple patch attempts with configurable limits
- Static analysis integration
- Test failure clustering
- Repository-specific agent memory
- Improved confidence scoring
- Human approval gates
- Support for additional LLM providers
- Docker-based workspace isolation
- Multi-repository monitoring
- Automatic regression detection

---

## License

This project is currently intended for development and research purposes.

---

## AMIGO

**Detect. Diagnose. Fix. Validate. Ship.**