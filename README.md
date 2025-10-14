# My Reforge AI

My Reforge AI is a personal platform for experimenting with AI-driven self-improvement tools. This repository collects the infrastructure, services, and automations used to explore new workflows and ideas.

## Getting Started

Clone the repository and install dependencies:

```bash
git clone https://github.com/spigell/my-reforge-ai.git
cd my-reforge-ai
npm install
```

## Contributing

This project is tailored to personal workflows, but feel free to open an issue or pull request if you spot something that could be improved.

## Project Structure

The repository is organized as follows:

-   `src/`: Contains the source code for the AI tools and services.
-   `deploy/`: Contains the deployment configurations for Kubernetes.
    -   `mcp/`: MCP server deployment.
    -   `gh-runner/`: GitHub Actions runner deployment.
    -   `workbench/`: Workbench environment for development.
-   `.github/`: Contains GitHub Actions workflows.
