# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Provide a Pulumi program that provisions the GitHub self-hosted runner deployment in the `my-reforge-ai` namespace, matching current Kubernetes specs and enabling environment-specific configuration.
- Non-Goals:
  - Replacing the GitHub runner container image or automation outside the runner deployment.
  - Managing GitHub registration tokens beyond referencing existing secrets.
  - Introducing automated Pulumi pipelines (manual preview/apply only for now).

# Deliverables

- [ ] Pulumi project under `deploy/gh-runner/pulumi/` with stack configuration and TypeScript program that recreates the runner Deployment.
- [ ] Documentation updates (e.g., `deploy/gh-runner/README.md`) covering Pulumi setup, config, and deployment commands.
- [ ] Validation notes describing how to run `pulumi preview` against the target cluster using the expected kubeconfig context.

# Approach

- Summary: Scaffold a TypeScript Pulumi project, add `@pulumi/pulumi` and `@pulumi/kubernetes` dependencies, and translate `deploy/gh-runner/deployment.yaml` into Pulumi resources with configurable image/tag, runner labels, replicas, and secret references; ensure stack config captures namespace, secret names, and runner settings.
- Affected paths (target repo): `deploy/gh-runner/`, `package.json`, `yarn.lock`, `deploy/gh-runner/pulumi/**`, potentially `.gitignore` for Pulumi artifacts.
- Interfaces/IO: Pulumi CLI driven via `pulumi up/preview`; stack config values stored in `Pulumi.<stack>.yaml`; uses kubeconfig context for cluster access; runtime reads existing Kubernetes secrets for GitHub tokens.
- Security/Secrets: Never commit tokens; rely on Pulumi config (marked secret) or existing Kubernetes secrets; document requirement to set `pulumi config set --secret githubToken` before deployment.

# Acceptance Criteria

- [ ] `pulumi preview` recreates the current runner Deployment without diff aside from expected annotations/labels.
- [ ] Documentation outlines prerequisites and deployment workflow for operators.
- [ ] Pulumi project dependencies and TypeScript compile without errors via `yarn tsc --noEmit`.

# Risks & Mitigations

- Risk: Pulumi resources drift from current manifest → Mitigation: Validate rendered YAML via `pulumi stack export` or `pulumi preview` diff before apply.
- Risk: Secrets handling misconfigured → Mitigation: Use Pulumi secret config and call out setup steps explicitly in docs.
- Risk: Additional dependencies bloat repo → Mitigation: Scope Pulumi deps to project directory and consider using workspace-specific `package.json`.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- Move to implementing once APPROVED in this PR.
