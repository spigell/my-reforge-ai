# My Reforge AI

### Your Personal Platform for AI-Driven Self-Improvement

My Reforge AI is a personal platform for experimenting with AI-driven self-improvement tooling. The repository brings together the infrastructure, services, and automations used to iterate on workflows and new ideas.

## Features

- **Task Agent Matcher:** A sophisticated system for matching tasks with the most suitable AI agents.
- **Usage Manager:** A tool for tracking and managing token usage to stay within budget.
- **AI Agent Worker:** A powerful worker that executes tasks using the Codex CLI.
- **Declarative Task Definitions:** Define tasks in simple YAML files.
- **Review Blocking:** A mechanism to prevent conflicting reviews.
- **Extensible:** Easily add new agents and tasks.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [Yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)

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
    ./dist/task-agent-matcher/matcher.js --output-file /tmp/task.json ./tasks/ideas.yaml
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

## Contributing

The project reflects personal workflows, but feel free to open an issue or pull request if you notice something that can be improved.

## License

This project is licensed under the MIT License.
