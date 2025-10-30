# My Reforge AI

### Personal Platform for AI-Driven Self-Improvement

My Reforge AI is a personal platform for experimenting with AI-driven self-improvement tooling. The repository brings together the infrastructure, services, and automations used to iterate on workflows and new ideas.

## Goals

- **Task Agent Matcher:** A sophisticated system for matching tasks with the most suitable AI agents.
- **Usage Manager:** A tool for tracking and managing token usage to stay within budget.
- **AI Agent Worker:** A powerful worker that executes tasks using the Codex CLI.
- **Declarative Task Definitions:** Define tasks in simple YAML files.
- **Review Blocking:** A mechanism to prevent conflicting reviews.
- **Extensible:** Easily add new agents and tasks.

## Getting Started

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/spigell/my-reforge-ai.git
    ```

2.  Navigate to the project directory:

    ```bash
    cd my-reforge-ai
    ```

3.  Install the dependencies:

    ```bash
    yarn install
    ```

## Usage

1.  Define a task in a YAML file in the `tasks` directory. See `tasks/example-task.yaml` for an example.
2.  Run the Task Agent Matcher to select an agent for the task:

    ```bash
    yarn build
    ./dist/bin/task-agent-matcher.js pick tasks/ideas.yaml --output-file /tmp/task.json
    ```

3.  Feed the matcher output into the AI Agent Planner. This step renders the planning template, writes `planning-prompt.md`, and runs the selected agent in planning mode:

    ```bash
    yarn plan /tmp/task.json
    # or, using the bin directly
    my-reforge-ai-planner /tmp/task.json
    ```

4.  Once the plan is approved and the task’s stage is switched to `implementing`, run the AI Agent Implementor to apply the plan:

    ```bash
    yarn implement /tmp/task.json
    # or, using the bin directly
    my-reforge-ai-implementor /tmp/task.json
    ```

The implementor reads the `plan.md` located under `task_dir` inside the target repository and executes the task against the prepared workspace.

## Task Definition Schema (`ideas.yaml`)

```yaml
# Schema for ideas.yaml
ideas: # Array of task definitions
  - repo: string # Required. The owner/repository name (e.g., 'owner/target-repo').
    branch: string # Required. The branch to work on in the target repository.
    agents: # Required. Array of preferred AI agents for this task.
      - string # Valid values are defined in src/types/agent.ts (e.g., 'gpt-5-codex', 'gemini-2.5-flash').
    kind: string # Required. The type of task (e.g., 'feature', 'bugfix').
    priority: string # Optional. 'high' | 'medium' | 'low'. Defaults to 'medium'.
    idea: string # Required. A concise description of the task's objective.
    stage: string # Required. The current stage of the task. Must be 'planning' or 'implementing'.
    planning_pr_id: string # Optional. If a planning PR is already created, its ID.
    review_required: boolean # Optional. Set to true if the task requires human review.
    timeout_ms: number # Optional. Maximum time in milliseconds the task is allowed to run.
    task_dir: string # Optional. Directory within the target repository for executor artifacts.
    additionalRepos: # Optional. Array of additional repositories to clone into the workspace.
      - repo: string # Required. The owner/repository name.
        branch: string # Optional. The branch to checkout.
        directoryName: string # Optional. The name of the directory to clone the repo into.
```

## Planning Phase Sequence Diagram

```
User/Cron
   │
   └─▶ Trigger Workflow (prepare-ideas.yml or comment-planner-update.yml)
       │
       └─▶ match-task Job
           │
           ├─▶ Check UsageManager for Tokens
           ├─▶ Select & Normalize Agent (from ideas.yaml)
           ├─▶ Rank Tasks by Priority (high ▶ medium ▶ low)
           ├─▶ Enforce Review Lock (skip duplicate review-required kinds)
           ├─▶ Identify Task (pick from ideas.yaml or take-from-pr)
           └─▶ Output task_json & agent
               │
               └─▶ plan-task Job (runs on selected agent's runner)
                   │
                   ├─▶ Prepare Workspace (clone repo, checkout branch)
                   ├─▶ Generate planning-prompt.md (from template + task context)
                   ├─▶ Invoke AI Agent (read planning-prompt.md, generate plan.md)
                   ├─▶ Execute Plan Action (init or update)
                   │   ├─ init: Create initial plan.md, Open new Draft PR
                   │   └─ update: Update existing plan.md, Modify existing PR
                   ├─▶ Commit & Push Changes
                   └─▶ Log Execution & Token Usage
```

## Project Structure

The repository is organized as follows:

- `src/`: Contains the source code for the AI tools and services.
  - `src/libs/usage-manager`: Contains the logic for fetching and calculating token usage.
  - `src/task-agent-matcher`: Contains task and agent matching logic.
  - `src/task-planner`: Contains logic for creating a `plan.md` from an `ideas.yaml` file.
  - `src/task-implementor`: Contains logic for executing tasks based on `plan.md`.
- `deploy/`: Contains the deployment configurations for Kubernetes.
  - `mcp/`: MCP server deployment.
  - `gh-runner/`: GitHub Actions runner deployment.
  - `workbench/`: Workbench environment for development.
- `.github/`: Contains GitHub Actions workflows.
- `AGENTS.md`: Contains detailed architecture and guidelines for AI agents.

## PR Creation

Note that pull requests are created by a separate, out-of-band process, not by the AI agent itself. The agent will reference the PR once it is created.

## Contributing

The project reflects personal workflows, but feel free to open an issue or pull request if you notice something that can be improved.

## License

This project is licensed under the MIT License.
