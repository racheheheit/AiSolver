# AI Code Fixer

AI-powered system that detects failed CI workflows, analyzes the failure using an LLM, generates a potential fix, validates the fix, and creates a Pull Request.

## Project Status

🚧 Currently in development.

### Current Pipeline

Developer → GitHub → GitHub Actions → Test Failure → Webhook → Express Backend

## Planned Architecture

```text
Developer
    │
    │ git push
    ▼
GitHub Repository
    │
    ▼
GitHub Actions
    │
    ├── Build
    ├── Test
    │
    ▼
❌ Failure
    │
    ▼
GitHub Webhook
    │
    │ HTTP POST
    ▼
Express Backend
    │
    ▼
BullMQ + Redis
    │
    ▼
Background Worker
    │
    ├── Get CI Logs
    │
    ├── Analyze Failure
    │
    ▼
Gemini / LLM
    │
    ▼
Generate Fix
    │
    ▼
Sandbox
    │
    ▼
Run Tests
    │
    ├── ❌ Failed → Retry
    │
    └── ✅ Passed
            │
            ▼
        Create Branch
            │
            ▼
        Commit Changes
            │
            ▼
        Create Pull Request
            │
            ▼
        Notify Developer