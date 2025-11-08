# my-reforge-ai Pulumi Project

This project manages the Kubernetes resources for the `my-reforge-ai` namespace using Pulumi.

## Prerequisites

- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/)
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- Access to the Kubernetes cluster
- A `PULUMI_ACCESS_TOKEN` environment variable set up for Pulumi authentication.

## Setup

1. Install the dependencies:

   ```bash
   yarn install
   ```

## Usage

### Configuration

All runtime values are pulled from Pulumi config. Before running `pulumi preview` or `pulumi up`, make sure the stack is configured:

```bash
pulumi config set my-reforge-ai:namespace my-reforge-ai
pulumi config set my-reforge-ai:githubMcp:image ghcr.io/spigell/github-mcp-server:0.18.0-1b59f5
pulumi config set my-reforge-ai:githubMcp:personalAccessTokenSecretName github-mcp-credentials
pulumi config set my-reforge-ai:githubMcp:personalAccessTokenSecretKey github-pat
pulumi config set my-reforge-ai:githubMcp:port 8080
pulumi config set-json my-reforge-ai:githubMcp:allowOrigins '["*"]'
pulumi config set-json my-reforge-ai:githubMcp:resources '{"requests":{"cpu":"100m","memory":"256Mi"},"limits":{"cpu":"1","memory":"1Gi"}}'
pulumi config set-json my-reforge-ai:githubMcp:monitoring '{"enabled":true,"portName":"http","scrapeInterval":"30s"}'
```

Set `my-reforge-ai:githubMcp:enableInspector` to `true` and provide `my-reforge-ai:githubMcp:inspectorImage` to enable the MCP inspector sidecar.

### Previewing Changes

To preview the changes that will be made to the infrastructure, run:

```bash
pulumi preview
```

### Deploying Changes

To deploy the changes to the infrastructure, run:

```bash
pulumi up
```

## Stacks

- `prod`: The production stack.

## Project Structure

- `index.ts`: The main entrypoint for the Pulumi program.
- `mcp/`: Contains the code for the MCP server deployment.
- `common/`: Contains reusable Pulumi components.
