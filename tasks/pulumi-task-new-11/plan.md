# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Provide a Pulumi program that provisions the GitHub self-hosted runner deployment in the `my-reforge-ai` namespace, matching current Kubernetes specs and enabling environment-specific configuration (image tag, runner labels, replicas, and secret names) per stack.
- Non-Goals:
  - Replacing the GitHub runner container image or automation outside the runner deployment.
  - Managing GitHub registration tokens beyond referencing existing secrets or Pulumi secret config.
  - Introducing automated Pulumi pipelines (manual preview/apply only for now).

# Deliverables

- [ ] Pulumi project under `deploy/gh-runner/pulumi/` with isolated `package.json`, `Pulumi.yaml`, and stack configuration files (`Pulumi.dev.yaml`, `Pulumi.prod.yaml`) alongside a TypeScript program that recreates the runner Deployment and dependent Kubernetes resources.
- [ ] Documentation updates (e.g., `deploy/gh-runner/README.md`) covering Pulumi setup, config schema, environment overrides, and deployment commands.
- [ ] Validation notes describing how to run `pulumi preview` against the target cluster with the correct kubeconfig context, including expected zero-diff output and troubleshooting guidance.

# Approach

- Summary: Scaffold a standalone TypeScript Pulumi project inside `deploy/gh-runner/pulumi`, add scoped dependencies (`@pulumi/pulumi`, `@pulumi/kubernetes`), and translate the existing Kubernetes manifests into Pulumi resources driven by typed stack configuration for namespace, image tag, runner labels, replicas, tolerations, and secret references.
- Affected paths (target repo): `deploy/gh-runner/`, `deploy/gh-runner/pulumi/**` (including `.gitignore`), optionally root `package.json`/`yarn.lock` if a new workspace script is required, and documentation under `deploy/gh-runner/`.
- Interfaces/IO: Pulumi CLI commands (`pulumi preview`, `pulumi up`) executed from the project directory; stack config stored in `Pulumi.<stack>.yaml`; kubeconfig context supplied by operators; runtime references existing Kubernetes secrets via names injected through config.
- Security/Secrets: Never commit tokens; mark any sensitive Pulumi config values as secrets; document requirement to run `pulumi config set --secret githubRegistrationToken <value>` (or reuse existing Kubernetes secret) before deployment; avoid embedding credentials in code.

# Implementation Steps

1. Bootstrap Pulumi workspace: add `.gitignore` entries for `.pulumi/`, create `package.json` scoped to the Pulumi project with scripts (`yarn build`, `yarn preview`), generate `Pulumi.yaml`, and provide stub stack files (`Pulumi.dev.yaml`, `Pulumi.prod.yaml`) with placeholder values.
2. Port the current Kubernetes manifests (`deploy/gh-runner/deployment.yaml` and related ServiceAccount/RoleBinding resources) into Pulumi constructs, extracting shared config (namespace, labels, env vars, volume mounts) into helper utilities and strongly typed config validation.
3. Define configuration schema: create TypeScript interfaces for required stack settings (image, runner labels, replicas, secret names, namespace), implement runtime validation/guard clauses, and document defaults vs. required overrides per environment.
4. Populate environment stacks with representative values, marking secrets appropriately and wiring any existing Kubernetes secret names so operators can reuse them without storing raw tokens in git.
5. Update `deploy/gh-runner/README.md` with Pulumi setup instructions, environment preparation steps (kubeconfig context, npm install), walkthrough for `pulumi preview` and `pulumi up`, plus a troubleshooting section (e.g., mismatched contexts, missing secrets).
6. Capture validation guidance: document how to compare Pulumi output against the existing manifest (e.g., `pulumi preview --diff` or `pulumi stack export` piped through `yq`) and record expected zero-diff characteristics before applying changes.

# Acceptance Criteria

- [ ] `pulumi preview` on each stack recreates the current runner deployment/resources without diff aside from expected annotations/labels.
- [ ] Documentation outlines prerequisites, configuration keys, deployment workflow, and troubleshooting guidance for operators.
- [ ] Pulumi project dependencies compile without errors via `yarn tsc --noEmit` (from project root and Pulumi project directory).

# Risks & Mitigations

- Risk: Pulumi resources drift from current manifest → Mitigation: Validate rendered YAML via `pulumi preview --diff` and document a manual comparison workflow; plan follow-up automation once implementation stabilizes.
- Risk: Secrets handling misconfigured → Mitigation: Use Pulumi secret config, reuse existing Kubernetes secret names, and highlight setup steps explicitly in docs.
- Risk: Additional dependencies bloat repo → Mitigation: Scope Pulumi dependencies to project directory and register optional scripts rather than altering root dependency graph heavily.
- Risk: Missing RBAC/service account resources → Mitigation: Audit existing YAML for related resources (ServiceAccount, RoleBinding, ConfigMaps) and include them in the Pulumi translation to keep deployment functional.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- Move to implementing once APPROVED in this PR.
