# Project: My Reforge AI

## Project Overview

This project is a sophisticated system for automating software development tasks using AI agents. It reads task definitions from a repository, selects an appropriate AI agent (like `Codex` or `Gemini`), and executes the task. The system is designed to work within a budget, managing token usage to stay within weekly limits. It supports a "review required" workflow, where changes are submitted as a pull request and an agent can participate in the review process.

The core of the project is the **Task Agent Matcher**, which selects tasks based on priority, token availability, and whether a review is already in progress for the target repository.

The project uses a `ports` and `adapters` architecture to separate core logic from external services like Git, the logger, and the AI agents.

Infrastructure is managed using Pulumi, defining Kubernetes resources for deploying the various components of the system, such as the `mcp-server` (MCP stands for Multi-Copilot Platform).

## Building and Running

### Dependencies

Install dependencies using Yarn:

```sh
yarn install
```

### Building

To transpile the TypeScript code, run:

```sh
yarn build
```

Or, to watch for changes and rebuild automatically:

```sh
yarn watch
```

### Testing

To run the tests:

```sh
yarn test
```

### Running the Application

The main entry points are the binary scripts defined in `package.json`:

*   `my-reforge-ai-agent-matcher`: Matches a task with an agent.
*   `my-reforge-ai-planner`: Plans a task.
*   `my-reforge-ai-implementor`: Implements a task.
*   `my-reforge-ai-house-keeper`: Performs housekeeping tasks.

Example of matching a task from the `ideas.yaml` file:

```sh
yarn match-idea
```

Example of planning a task from a matched task file:

```sh
yarn plan-test-init
```

## Development Conventions

### Coding Style

*   Modern TypeScript, targeting ES modules.
*   Formatting is enforced by Prettier. Run `yarn format` before committing.
*   Indentation is two spaces.
*   Favor named exports.
*   Keep the "happy path" aligned to the left by returning early for error checks.
*   Prefer arrow functions for callbacks and utility functions.
*   Throw errors for exceptional cases instead of returning `undefined` or `null`.
*   Do not pass logger instances directly into functions; import the logger module where needed.

### Linting

Check for code quality and style issues using ESLint:

```sh
yarn lint
```

### Testing

*   Every functional change should have a corresponding test.
*   Tests are located in `src/__tests__` and named with a `.test.ts` extension.
*   Tests are run against the compiled JavaScript code in `dist/`.
*   For tests involving file system I/O, use the real `fs` module within temporary directories.

### Commits and Pull Requests

*   Commit messages should be concise and imperative (e.g., `Add fetch usage cache`).
*   Pull requests must include a summary, a link to the issue (if applicable), and testing notes.
*   Each pull request should address a single feature or fix and include tests.
