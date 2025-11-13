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

# Progress

- Refactored the Pulumi project into reusable building blocks under `pulumi/common/`, including the generic `K8sApp`, `McpInspector`, and `SharedManualVolume` helpers so every workload shares the same deployment contract.
- Added dedicated `GithubMcpServer` and `PulumiMcpServer` components in `pulumi/mcp/` that compose the shared pieces, add PodMonitor-compatible scrapes, and provide optional inspector sidecars per service.
- Updated `pulumi/index.ts` to gate each MCP server behind stack config, pull namespace and service-account data from the `organization/output-gateway` stack reference, and propagate per-service overrides (image, resources, env, monitoring).
- Moved all runtime configuration—images, resource limits, secret names, inspector toggles—into `Pulumi.prod.yaml`, keeping stack-specific data out of source control.
- Implemented kubeconfig bootstrapping and optional shared code volume mounts for the Pulumi MCP server so it can run `pulumi-mcp-server` in-cluster without ad-hoc init scripts.

# Deliverables

- [x] A new Pulumi project in `spigell/my-reforge-ai/pulumi/`.
- [x] Pulumi code for the `my-reforge-ai` namespace. Namespace is already created.
- [x] Pulumi code for the `mcp-server` deployment and service within the namespace.
- [x] A `README.md` in the `pulumi/` directory explaining how to use the Pulumi project.

# Rigorous Improvement Plan

The refactor landed as designed. Status by item:

1. **Generic `K8sApp` component** – ✅ Implemented at `pulumi/common/k8s-app/index.ts`, exposing inputs for env, resources, probes, sidecars, service wiring, init containers, and service accounts while emitting Deployment + Service handles.
2. **Dedicated `McpInspector` component** – ✅ Lives in `pulumi/common/mcp-inspector/index.ts` and produces the reusable sidecar container spec that higher-level services can opt into.
3. **Composable application classes** – ✅ `pulumi/mcp/github.ts` and `pulumi/mcp/pulumi.ts` orchestrate `K8sApp`, inspector sidecars, monitoring resources, shared volumes, and init containers without duplicating YAML.
4. **Eliminate runtime initialization** – ✅ Both MCP servers now rely on pre-built images (`ghcr.io/spigell/github-mcp-server:0.18.0-1b59f5`, `ghcr.io/spigell/pulumi-talos-cluster-workbench:3.200.0-54d6cd`) and Pulumi-managed init containers (for kubeconfig only), removing the ad-hoc `initCommand`.
5. **Use Pulumi config for runtime data** – ✅ `pulumi/index.ts` reads all per-stack inputs via `pulumi.Config`, gating each MCP server with `getEnabledMcpConfig`, and `Pulumi.prod.yaml` stores the concrete values (images, limits, secrets, monitoring toggles).

Additional improvements:

- Added `SharedManualVolume` for the Pulumi MCP server so agents can re-use a workspace PVC.
- Introduced a StackReference (`organization/output-gateway/${pulumi.getProject()}`) to source `pulumiAccountName` and the encrypted GCP secret name instead of hard-coding credentials.

# Approach

- Affected paths (target repo): `pulumi/`, `deploy/mcp/github-server.yaml` (for reference), use `common/k8s-app` directory with the module.
- Interfaces/IO: The Pulumi project will be managed via the Pulumi CLI. It will require a `PULUMI_ACCESS_TOKEN` environment variable.

# Acceptance Criteria

- [ ] The Pulumi project can be successfully previewed (`pulumi preview`). **Pending** – needs to be run from an environment with access to the target cluster.
- [ ] The Pulumi project can be successfully deployed (`pulumi up`). **Pending** – blocked on the same runtime access.
- [ ] The `my-reforge-ai` namespace is created in the Kubernetes cluster. **Not owned** – the namespace still needs to be created/managed outside this stack or added as a follow-up resource.
- [x] The `mcp-server` deployment and service are created in the `my-reforge-ai` namespace via the `GithubMcpServer` and `PulumiMcpServer` components.

# Risks & Mitigations

- Risk: The existing Kubernetes manifests in `deploy/` might conflict with the new Pulumi-managed resources. → Mitigation: The existing YAML files will be reviewed and removed after the Pulumi stack is successfully deployed and verified.

# Rollout & Review

- Planning via this PR in the tasks repo.
- Implementation will open a new PR in `spigell/my-reforge-ai` after approval.

# Kubernetes Authorization

Pulumi now pulls identity material from the shared `organization/output-gateway/${pulumi.getProject()}` stack. `pulumi/index.ts` consumes the exported `pulumiAccountName` and `gcp-secret-key-name`, wiring the service account into the MCP workloads and mounting the GCP credentials secret for the Pulumi MCP server.

Outstanding items:

1. **RBAC ownership** – The ServiceAccount/Role/RoleBinding still live in the upstream stack. Decide whether to keep that responsibility there or add the resources here so the namespace permissions are self-contained.
2. **Namespace management** – The `my-reforge-ai` namespace is assumed to exist. Consider creating it (and labeling/quotas) inside this stack to remove that prerequisite.
3. **Out-of-cluster kubeconfig** – The Pulumi MCP server now generates its kubeconfig via an init container, but we still need a documented flow for running `pulumi preview/up` from GitHub Actions or a laptop using the same service account credentials.
