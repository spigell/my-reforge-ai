# Repository Guidelines

## Project Structure & Module Organization

Source code lives in `src/` as TypeScript modules; keep each service in its own folder following the existing flat layout used by `src/fetch-usage.ts`. Compiled artifacts belong in `dist/` after running the build. Deployment assets sit in `deploy/`, with `deploy/gh-runner` and `deploy/workbench` providing Kubernetes manifests and bootstrap scripts; update them when your change requires infrastructure adjustments. Shared automation files (GitHub workflows, Husky hooks) reside under `.github/` and `.husky/`.

## Build, Test, and Development Commands

Install dependencies with `yarn install`. Run `yarn build` to transpile TypeScript using the root `tsconfig.json`, which outputs to `dist/`. Use `yarn run fetch-usage` during development to exercise the current service logic against live APIs (requires environment variables defined via `dotenv-safe`). For ad-hoc scripts, prefer `npx ts-node path/to/script.ts` so TypeScript stays the source of truth.

## Coding Style & Naming Conventions

Write modern TypeScript, targeting ES modules (`"type": "module"`). Use Prettier with the repository settings (`.prettierrc` enforces single quotes); format before committing. Keep indentation at two spaces, favor named exports, and suffix service entrypoints with the feature (e.g., `fetch-usage.ts`). Configuration files should remain JSON with a trailing newline.

## Testing Guidelines

Every functional change should introduce or update tests. Compile first, then run Node’s test runner against the emitted code, e.g., `yarn build && node --test dist/**/*.test.js`. Place test sources in `src/__tests__/` using `*.test.ts` naming so they mirror production modules. When behavior depends on external services, stub HTTP calls with lightweight fixtures and document them in the test file.

## Commit & Pull Request Guidelines

Write commits as concise, imperative sentences (`Add fetch usage cache`). Group related changes together and keep noise out of the diff. Pull requests must include a summary, linked issue (if applicable), testing notes, and confirmation that deployment artifacts in `deploy/` remain valid or describe the needed follow-up. Ensure the PR addresses only a single feature or fix and contains accompanying tests.

---

# my-reforge-ai — MVP Design Spec

## Overview

A minimal system where a **worker** reads tasks from a dedicated repo, executes them against target repos, and (optionally) drives review via GitHub PR conversations using MCP. Token usage is governed by a weekly budget split into daily/ hourly portions.

---

## Task Format

**File:** `path/to/task.yaml` inside the **tasks repo**.

```yaml
# task.yaml
repo: owner/target-repo
file: path/to/file.ext                 # target file in the repo
review_required: true                  # if true, no other review tasks run for this repo
```

**Worker output (commit message convention):**

```
chore(my-reforge-ai): run task
- repo: owner/target-repo
- task: path/to/task.yaml
- review_required: true
```

---

## Review Blocking Rule

* If `review_required: true` is active for `owner/target-repo`, **all other tasks with `review_required: true` for that repo are blocked** until the review is completed.
* Review completion = PR merged or PR closed with outcome noted in the PR thread.

---

## Components

### 1) Task Picker

* Scans the **tasks repo** for `task.yaml` files.
* Applies **review lock** per repo:

  * If a review is in progress for `repo`, skip other `review_required: true` tasks for that `repo`.
* Yields tasks in FIFO (or filename) order.

### 2) Usage Manager

* Fetches **current usage** and **weekly limit** via TS script.
* Splits weekly limit into 7 daily budgets.
* **Aggressive catch-up**: If on Day 5 you still have ~90% of the weekly budget, spend more than the equal share (e.g., 40% extra).
* Exposes **per-run token target** (hourly) to the worker.

### 3) AI Agent Worker

* Executes tasks:

  * **Git**: pull target repo, modify `file` as needed, commit & push branches.
  * **PR**: open/update PR when `review_required: true`.
  * **MCP**: converse in PR like a human for reviews (post, read replies, iterate, fix commits).
* Respects per-run token budget from the Usage Manager.

---

## Workflow

1. **Cron/Runner triggers** the worker on schedule.
2. **Task Picker** selects the next eligible task:

   * Skips any repo currently under a **review lock** if the picked task requires review.
3. **Usage Manager** computes today’s/hour’s token budget.
4. **AI Agent Worker**:

   * Clones target `repo` (git binary), checks out a task branch.
   * Applies changes to `file`.
   * Commits and pushes.
   * If `review_required: true`:

     * Opens/updates a PR.
     * Communicates via **MCP** in the PR thread.
     * Iterates on requested changes; amends/commits as needed.
     * On approval/merge: release lock for that `repo`.
5. **Completion**: logs execution summary and tokens used.

---

## Communication via MCP (PR)

* **Inbound**: read PR comments addressed to the agent (e.g., `@my-reforge-ai`).
* **Outbound**: post replies, status updates, and “done” notes in PR thread.
* **Loop**: iterate until approved or closed.

---

## Repositories

* **Tasks repo**: contains only task definitions and their YAML files.
* **Target repos**: the worker reads/modifies files directly using **git**.

---

## K8s Namespace & Pods

* Namespace: `my-reforge-ai`

  * **gh-runner-codex**: GitHub Actions runner pod with Codex CLI and auth.
  * **gh-mcp**: MCP service for GitHub PR communication (creates tasks, handles human interaction).
  * **other-mcps**: any additional MCP servers required by tasks.

---

## Runner Requirements

* GitHub self-hosted runner **with Codex CLI installed**.
* Authentication configured for:

  * Target repos (push/PR).
  * Codex/LLM provider (env/secret).
  * MCP server access.

---

## Budgeting Policy (Weekly → Daily → Hourly)

* **Weekly limit** split evenly across **7 days**.
* **Aggressive mode** kicks in when behind (e.g., Day 5 still has ~90% remaining → increase daily/hourly spend).
* Worker receives **hourly token target** and must not exceed it.

---

## Sequence (Text Diagram)

```
cron/runner
   └─▶ Task Picker (tasks repo)
        ├─ checks review locks per repo
        └─ yields next task
             └─▶ Usage Manager (compute hourly budget)
                  └─▶ AI Agent Worker
                       ├─ git pull/branch/edit/file
                       ├─ commit & push
                       ├─ if review_required:
                       │     ├─ open/update PR
                       │     ├─ MCP: read PR messages
                       │     ├─ codex changes → fix commits
                       │     └─ on approval/merge: release lock
                       └─ log usage and result
```

---

## Commit/PR Conventions

* **Branch name**: `my-reforge-ai/<task-file-stem>`
* **Commit message**: `chore(my-reforge-ai): apply task <path/to/task.yaml>`
* **PR title**: `my-reforge-ai: <task-file-stem>`
* **PR body**: includes task YAML and run summary (tokens used, files touched).

---

## Logging

* Record for each run:

  * `repo`, `task file`, `review_required`
  * `tokens_in`, `tokens_out`, `total_tokens`
  * PR URL (if any)
  * Result: `completed`, `awaiting-review`, or `skipped (lock)`

---

# AI Agent Instructions

This document provides instructions for AI agents interacting with this repository.

## General Guidelines

- Adhere to the project's coding style and conventions.
- Ensure that all code changes are accompanied by corresponding tests.
- Keep pull requests focused on a single issue or feature.

## Specific Instructions

- When creating new services, follow the existing service structure in the `src` directory.
- Before making any changes, familiarize yourself with the deployment process outlined in the `deploy` directory.
