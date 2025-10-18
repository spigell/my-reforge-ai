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
    npx ts-node src/task-agent-matcher/matcher.ts
    ```

3.  Run the AI Agent Worker to execute the task:

    ```bash
    npx ts-node src/task-executor/executor.ts
    ```

## Project Structure

The repository is organized as follows:

- `src/`: Contains the source code for the AI tools and services.
  - `src/libs/usage-manager`: Contains the logic for fetching and calculating token usage.
  - `src/task-agent-matcher`: Contains task and agent matching logic.
  - `src/task-executor`: Contains logic for executing tasks with the Codex CLI, including workspace management and prompt rendering.
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
