# My Reforge AI

My Reforge AI is a personal platform for experimenting with AI-driven self-improvement tooling. The repository brings together the infrastructure, services, and automations used to iterate on workflows and new ideas.

## Getting Started

Clone the repository and install dependencies:

```bash
git clone https://github.com/spigell/my-reforge-ai.git
cd my-reforge-ai
npm install
```

## Contributing

The project reflects personal workflows, but feel free to open an issue or pull request if you notice something that can be improved.

## Project Structure

The repository is organized as follows:

-   `src/`: Contains the source code for the AI tools and services.
-   `deploy/`: Contains the deployment configurations for Kubernetes.
    -   `mcp/`: MCP server deployment.
    -   `gh-runner/`: GitHub Actions runner deployment.
    -   `workbench/`: Workbench environment for development.
-   `.github/`: Contains GitHub Actions workflows.
-   `AGENTS.md`: Contains detailed architecture and guidelines for AI agents.
