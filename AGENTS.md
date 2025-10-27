# Repository Guidelines

## Project Structure & Module Organization

Source code lives in `src/` as TypeScript modules, following an adapter/ports/services pattern for clear separation of concerns. Services are organized into logical folders within `src/`.

- `src/adapters`: Contains implementations of the `ports` interfaces, connecting core logic to external services (e.g., `git`, `logger`, `pr`, `usage`, `workspace`).
- `src/bin`: Contains executable scripts that serve as CLI entry points, often delegating to `src/core/entrypoints`.
- `src/core/entrypoints`: Contains the main functions for CLI commands, orchestrating the use cases and adapters.
- `src/core/ports`: Defines interfaces (ports) for external dependencies, allowing the core business logic to remain independent of specific implementations.
- `src/core/services`: Contains core business logic and domain services.
- `src/core/usecases`: Orchestrates the application's business logic, utilizing services and ports to fulfill specific application features.
- `src/libs/agents`: Contains the base agent interface and implementations for different AI agents (e.g., Codex, Gemini).
- `src/libs/codex-api`: Contains the API client for interacting with the Codex service.
- `src/libs/logger`: Contains logging utilities.
- `src/libs/usage-manager`: Contains the logic for fetching and calculating token usage.
- `src/libs/workspace`: Contains utilities for managing the workspace.
- `src/types`: Contains shared TypeScript type definitions.
- `src/__tests__`: Contains unit and integration tests.
  Compiled artifacts belong in `dist/` after running the build. Deployment assets sit in `deploy/` with `deploy/gh-runner` and `deploy/workbench` providing Kubernetes manifests and bootstrap scripts; update them when your change requires infrastructure adjustments. Shared automation files (GitHub workflows, Husky hooks) reside under `.github/` and `.husky/`.

## Build, Test, and Development Commands

Install dependencies with `yarn install`. To transpile TypeScript, run `./node_modules/.bin/tsc --build`, which outputs to `dist/`.

## Coding Style & Naming Conventions

Write modern TypeScript, targeting ES modules (`"type": "module"`). Use Prettier with the repository settings (`.prettierrc` enforces single quotes); format before committing. To ensure consistent code style, run `yarn format` before committing your changes. Keep indentation at two spaces, favor named exports, and suffix service entrypoints with the feature (e.g., `task-agent-matcher/matcher.ts`). Configuration files should remain JSON with a trailing newline. Keep the "happy path" aligned to the left, returning early for error checks or exceptional branches. Structure functions so the primary success flow is easy to scan without deep indentation, using guard clauses or small helper functions when necessary.

- **Arrow Functions:** Prefer arrow functions (`=>`) for conciseness and lexical `this` binding, especially for callbacks and utility functions. Use traditional `function` declarations for top-level functions that require hoisting or for class methods.
- **Error Handling:** Prefer throwing errors over returning `undefined` or `null` for exceptional cases to ensure explicit error handling.
- **Logger Usage:** Do not pass logger instances directly into functions. Instead, import the logger module where needed.

### Linting

To check for code quality and style issues, run the linter using ESLint: `yarn lint`. All reported issues should be addressed before committing.

## Testing Guidelines

Every functional change should introduce or update tests. Compile first, then run Node’s test runner against the emitted code, e.g., `node --test dist/**/*.test.js`. Place test sources in `src/__tests__/` using `*.test.ts` naming so they mirror production modules. When behavior depends on external services, stub HTTP calls with lightweight fixtures and document them in the test file.

**Note on Testing with File System I/O:** When testing scripts that interact with the file system, prefer robust, integration-style tests over heavy mocking. The `node:test` runner's mocking capabilities can be brittle for low-level modules like `fs`. A better pattern, demonstrated in `src/__tests__/task-agent-matcher.test.ts`, involves:

- Using the real `fs` module within temporary directories created for each test.
- Manually stubbing dependencies like loggers to capture output for assertions.
- Overriding `process.exit` to throw a custom error, allowing you to verify termination logic without halting the test runner.
- Ensuring complete cleanup of files and stubs in an `afterEach` block.
  This approach leads to more reliable tests that better reflect the script's end-to-end behavior.
**Note on Agent Testing:** Do not add new tests for agents. Existing tests are sufficient.

## Commit & Pull Request Guidelines

Write commits as concise, imperative sentences (`Add fetch usage cache`). Group related changes together and keep noise out of the diff. Pull requests must include a summary, linked issue (if applicable), testing notes, and confirmation that deployment artifacts in `deploy/` remain valid or describe the needed follow-up. Ensure the PR addresses only a single feature or fix and contains accompanying tests.
**Note:** As an AI agent, I will not commit any changes directly. All changes will be presented to the user for review and commit.

# MVP Design Spec

## Overview

A minimal system where a **worker** reads tasks from a dedicated repo, executes them against target repos, and (optionally) drives review via GitHub PR conversations using MCP. Token usage is governed by a weekly budget split into daily/ hourly portions.

---

## Task Format

**File:** `path/to/task.yaml` inside the **tasks repo**.

```yaml
tasks:
  - repo: owner/target-repo
    branch: 'branch-name' # New: The branch to work on in the target repository
    # Availabe agents list. can be codex, gemini-2.5-flash. The task-agent-matcher chooses executor.
    agents: ['codex', 'gemini-2.5-flash']
    kind: feature
    priority: high # Allowed values: high, medium, low. Defaults to medium.
    idea: 'Make an archtecture for the project'
    # description is a full description for the task, e.g. prompts. It should be created in planning stage.
    description-file: ''
    # stage can be 'planning' or 'implementing'
    stage: planning
    # if PR is already created then link should be here
    planning_pr_id: ''
    review_required: true
```

---

## Review Blocking Rule

- If `review_required: true` is active for `owner/target-repo`, **all other tasks with `review_required: true` for that repo are blocked** until the review is completed.
- Review completion = PR merged or PR closed with outcome noted in the PR thread.

---

## Components

### 1) Task Agent Matcher

- **Token Availability**: Before selecting any task, it checks with the `UsageManager` to ensure there are sufficient tokens available for the day. If not, it exits, preventing tasks from being picked when the budget is exhausted.
- Scans the **tasks repo** for `task.yaml` files.
- Selects an executor based on the `agents` field in the task. Agent IDs are normalized against the static enum in `src/types/task.ts`, so aliases like `codex` resolve to the canonical `openai-codex`. Unknown agents are ignored in favour of the default.
- Ranks queued tasks by `priority`, favouring `high` over `medium` over `low` and keeping FIFO order within a priority tier.
- Applies **review lock** per repo:
  - If a review is in progress for `repo`, skip other `review_required: true` tasks for that `repo`.
- Drops any `review_required: true` task whose `kind` already has an active review-required task in the tasks repository to avoid duplicate reviews for the same work type.
- Uses guard clauses for error scenarios (e.g., empty queue or filtered results) so that the happy path stays left-aligned.

- Yields tasks in FIFO (or filename) order.
- **GitHub Workflow Integration**: When used in a GitHub workflow, the Task Agent Matcher job will:
  - Checkout the repository containing the task definitions.
  - Execute logic to select an eligible task based on the defined rules.
  - Output the `repo` field of the selected task, making it available for subsequent jobs in the workflow (e.g., for cloning the target repository).

### 2) Usage Manager

- Fetches **current usage** and **weekly limit** via `src/libs/usage-manager/usage-manager.ts`.
  - Reads authentication tokens from `~/.codex/auth.json`.
  - Fetches usage data from the ChatGPT API.
  - Calculates the daily token budget based on a weekly allowance (100% split over 7 days) and consumed tokens.
  - Implements an "aggressive catch-up" mechanism to allow higher spending if the weekly budget is largely unused.
- Splits weekly limit into 7 daily budgets.
- **Aggressive catch-up**: If on Day 5 you still have ~90% of the weekly budget, spend more than the equal share (e.g., 40% extra).
- Exposes **per-run token target** (hourly) to the worker.
- The `hasTokens()` method is used by the `Task Agent Matcher` to determine if there are enough tokens remaining for the day to proceed with task selection.

### 3) AI Agent Planner

- Implements the planning flow in `src/task-planner/planner.ts`.
- Hydrates `planning-promt-tmpl.md`, writes `planning-prompt.md` into the active workspace, and runs the selected agent with instructions to execute the generated plan file.
- Requires an `idea` field; attempts to plan without one fail fast.

### 4) AI Agent Implementor

- Executes tasks using the `src/task-implementor` component, which runs the `codex` binary (or other agents) with a prompt derived from the previously generated plan.
  - **Workspace**: Prepares the workspace by cloning the target repository and checking out the correct branch using `src/libs/workspace/workspace-manager.ts`.
  - **Prompting**: Directs the agent to follow the plan stored at `<task_dir>/plan.md` and attaches run metadata pointing to the absolute plan path.
  - **Git**: modify files as needed, commit & push branches.
  - **PR**: update PR when `review_required: true`. Note that the PR is created by a separate process, not by the agent itself.
  - **MCP**: converse in PR like a human for reviews (post, read replies, iterate, fix commits).
- Respects per-run token budget from the Usage Manager.
- CLI entrypoint: `my-reforge-ai-implementor` (or `yarn implement`) consumes the same matcher payload and executes the task according to the existing plan.

---

## Workflow

1.  **Cron/Runner triggers** the worker on schedule.
2.  **Task Agent Matcher** selects the next eligible task:
    - Skips any repo currently under a **review lock** if the picked task requires review.
3.  **Run Agent (with hard timeout)**
    - **Responsibility**: The planner or implementor prepares the prompt and invokes the concrete agent implementation; the agent returns only a status/result payload.
    - **Agent interface**: `run(options, signal) → Promise<{ status: "success" | "timeout" | "error", logs: string, diagnostics?: Record<string, unknown> }> `
    - **Options (minimum)**: `{ targetWorkspace, additionalWorkspaces, model?, timeoutMs, prompt, runMetadata }`. Agents must honor the provided `AbortSignal`.
    - **OpenAI Codex agent**: Spawns `codex cli --non-interactive` inside the primary workspace. Prompt is piped via `stdin`; all `stdout`/`stderr` are collected into the returned logs. On abort, kill the process and return `status: "timeout"`."
    - **Gemini Pro / Flash**: Spawns the Gemini CLI (`gemini --model <name>`) with identical piping/timeout semantics.
    - **Hard timeout**: Executor wraps each run with `AbortController` using `task.timeout_ms` (default 5 minutes). On expiry it aborts the subprocess and surfaces a timeout result.
    - **Error handling**: Non-timeout failures resolve with `status: "error"` and captured diagnostics. Agents never touch git.
4.  **Usage Manager** computes today’s/hour’s token budget.
5.  **AI Agent Planner / Implementor**:
    - Planner focuses on writing the plan file and recording context for the implementor.
    - Implementor applies the plan: prepares workspace, edits files, commits, and manages PR workflows (including MCP conversations) when review is required.
6.  **Completion**: logs execution summary and tokens used.

---

## Communication via MCP (PR)

- **Inbound**: read PR comments addressed to the agent (e.g., `@my-reforge-ai`).
- **Outbound**: post replies, status updates, and “done” notes in PR thread.
- **Loop**: iterate until approved or closed.

---

## Repositories

- **Tasks repo**: contains only task definitions and their YAML files.
- **Target repos**: the worker reads/modifies files directly using **git**.

---

## K8s Namespace & Pods

- Namespace: `my-reforge-ai`
  - **gh-runner-codex**: GitHub Actions runner pod with Codex CLI and auth.
  - **gh-mcp**: MCP service for GitHub PR communication (creates tasks, handles human interaction).
  - **other-mcps**: any additional MCP servers required by tasks.

---

## Runner Requirements

- GitHub self-hosted runners are used for executing tasks. These runners have the necessary AI agent CLIs installed (e.g., Codex CLI, Gemini CLI).
- All non-GitHub hosted agents have Node.js runtime installed.
- Authentication configured for:
  - Target repos (push/PR).
  - AI agent provider (env/secret).
  - MCP server access.
  - Codex CLI auth material at `~/.codex/auth.json` (present on the shared runners).

---

## Budgeting Policy (Codex Runner)

- **Weekly limit** split evenly across **7 days**.
- **Aggressive mode** kicks in when behind (e.g., Day 5 you still have ~90% of the weekly budget, spend more than the equal share (e.g., 40% extra)).
- Worker receives **hourly token target** and must not exceed it.

---

## Commit/PR Conventions

- **Branch name**: `my-reforge-ai/<task-file-stem>`
- **Commit message**: `chore(my-reforge-ai): apply task <path/to/task.yaml>`
- **PR title**: `my-reforge-ai: <task-file-stem>`
- **PR body**: includes task YAML and run summary (tokens used, files touched).

---

## Logging

- Record for each run:
  - `repo`, `task file`, `review_required`
  - `tokens_in`, `tokens_out`, `total_tokens`
  - PR URL (if any)
  - Result: `completed`, `awaiting-review`, or `skipped (lock)`