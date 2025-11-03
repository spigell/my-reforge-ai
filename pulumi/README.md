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
