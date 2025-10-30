# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC infrastruct for own namespace. Add pulumi mcp server.

# Goal & Non-Goals

- Goal: Create a new Pulumi project to manage the Kubernetes resources for the `my-reforge-ai` namespace, including a deployment for the MCP server.
- Non-Goals:
  - This will not manage other existing Kubernetes resources outside of the `my-reforge-ai` namespace.
  - This will not involve setting up the CI/CD pipeline for Pulumi.
  - This will not include creating the Docker image for the mcp-server.

# Deliverables

- [ ] A new Pulumi project in `spigell/my-reforge-ai/pulumi/`.
- [ ] Pulumi code for the `my-reforge-ai` namespace.
- [ ] Pulumi code for the `mcp-server` deployment and service within the namespace.
- [ ] A `README.md` in the `pulumi/` directory explaining how to use the Pulumi project.

# Approach

- Summary: I will initialize a new Pulumi project using `pulumi new` in a new `pulumi/` directory. I will then write TypeScript code to define the Kubernetes namespace and the deployment for the `mcp-server`, based on the existing manifest.
- Affected paths (target repo): `pulumi/`, `deploy/mcp/github-server.yaml` (for reference).
- Interfaces/IO: The Pulumi project will be managed via the Pulumi CLI. It will require a `PULUMI_ACCESS_TOKEN` environment variable.
- Security/Secrets:
  - The `PULUMI_ACCESS_TOKEN` will be managed as a secret and should not be hardcoded.
  - Secrets in the Pulumi stack will use the GCP Secret Manager provider. Initialize the stack with `pulumi stack init <stack> --secrets-provider="gcpsecretmanager://projects/<project-id>/secrets/<secret-name>?version=<version>"`. Authenticate with GCP by exporting `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json` (or run `gcloud auth application-default login`) before running Pulumi commands so the CLI can access the secret manager.

# Acceptance Criteria

- [ ] The Pulumi project can be successfully previewed (`pulumi preview`).
- [ ] The Pulumi project can be successfully deployed (`pulumi up`).
- [ ] The `my-reforge-ai` namespace is created in the Kubernetes cluster.
- [ ] The `mcp-server` deployment and service are created in the `my-reforge-ai` namespace.

# Risks & Mitigations

- Risk: The existing Kubernetes manifests in `deploy/` might conflict with the new Pulumi-managed resources. → Mitigation: The existing YAML files will be reviewed and removed after the Pulumi stack is successfully deployed and verified.

# Rollout & Review

- Planning via this PR in the tasks repo.
- Implementation will open a new PR in `spigell/my-reforge-ai` after approval.
