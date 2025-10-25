# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Ship a Pulumi TypeScript project that reproduces the existing GitHub runner Kubernetes deployment with stack config for namespace, image, and secrets.
- Non-Goals:
  - Managing runtime secrets beyond referencing Pulumi config/secret values.
  - Automating Pulumi stack execution in CI/CD.
  - Redesigning the runner topology or scaling strategy beyond current manifest parity.

# Deliverables

- [ ] `infra/pulumi/gh-runner/Pulumi.yaml` defining the project metadata and default stack.
- [ ] `infra/pulumi/gh-runner/index.ts` porting the Kubernetes deployment/service resources using `@pulumi/kubernetes`.
- [ ] `infra/pulumi/gh-runner/README.md` with setup steps, config keys, and Pulumi commands to deploy/update.
- [ ] Update repository docs (`deploy/gh-runner/README.md` or equivalent) to point to the Pulumi workflow.
- [ ] Validation notes describing how to preview/apply the stack and verify runner registration.

# Approach

- Summary: Introduce a Pulumi TypeScript program backed by `@pulumi/pulumi` and `@pulumi/kubernetes` that instantiates the current `deploy/gh-runner/deployment.yaml` resources, parameterized via Pulumi config for namespace, runner labels, image, and GitHub registration token secret.
- Affected paths (target repo): `infra/pulumi/gh-runner/**`, `package.json`, `yarn.lock`, `deploy/gh-runner/**`.
- Interfaces/IO: Pulumi CLI (`pulumi up/preview/destroy`), Pulumi config files (`Pulumi.<stack>.yaml`), GitHub runner registration token provided via secret Pulumi config, Kubernetes context configured externally.
- Security/Secrets: Store runner registration token and GitHub repo URL as Pulumi secret config; never commit raw secret values. Document required MCP-provided credentials if any.

# Acceptance Criteria

- [ ] Pulumi project synthesizes resources equivalent to the existing deployment when running `pulumi preview`.
- [ ] Documentation covers bootstrap (install deps, set config, preview/apply) and clean-up steps.
- [ ] Pulumi stack supports specifying target namespace and runner labels without code changes.

# Risks & Mitigations

- Risk: Divergence from existing manifest causes runtime drift → Mitigation: Diff against `deploy/gh-runner/deployment.yaml` and validate via `pulumi preview`.
- Risk: Handling sensitive tokens in config → Mitigation: Use Pulumi secret config entries and document secret management clearly.
- Risk: Missing Pulumi dependencies or build scripts → Mitigation: Update `package.json` and run `yarn install` to ensure reproducible setup.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- Move to implementing once APPROVED in this PR.
