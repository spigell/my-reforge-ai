# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Ship a Pulumi TypeScript project that reproduces the existing GitHub runner Kubernetes deployment with stack config for namespace, image, secrets, and runner labels.
- Non-Goals:
  - Managing runtime secrets beyond referencing Pulumi config/secret values.
  - Automating Pulumi stack execution in CI/CD.
  - Redesigning the runner topology or scaling strategy beyond current manifest parity.
  - Migrating existing clusters automatically; rollout stays manual.

# Deliverables

- [ ] `infra/pulumi/gh-runner/Pulumi.yaml` defining the project metadata and default stack.
- [ ] `infra/pulumi/gh-runner/index.ts` porting the Kubernetes deployment/service resources using `@pulumi/kubernetes`.
- [ ] `infra/pulumi/gh-runner/README.md` with setup steps, config keys, and Pulumi commands to deploy/update.
- [ ] Update repository docs (`deploy/gh-runner/README.md` or equivalent) to point to the Pulumi workflow.
- [ ] Validation notes describing how to preview/apply the stack and verify runner registration.

# Approach

- Current baseline: `deploy/gh-runner/deployment.yaml` plus related manifests provide a single-runner Deployment + ServiceAccount in namespace `my-reforge-ai`.
- Summary: Introduce a Pulumi TypeScript program backed by `@pulumi/pulumi` and `@pulumi/kubernetes` that instantiates the same Kubernetes resources, parameterized via Pulumi config for namespace, runner labels, image, GitHub repo, and runner token secret.
- Implementation steps:
  1. Scaffold Pulumi project (`Pulumi.yaml`, `package.json` workspace wiring) under `infra/pulumi/gh-runner`.
  2. Port manifests into strongly-typed Pulumi resources:
     - `k8s.core.v1.Namespace` (optional, gated by config flag) or assume existing namespace.
     - `k8s.core.v1.Secret` referencing `pulumi.config.requireSecret('githubToken')` for runner registration.
     - `k8s.apps.v1.Deployment` mirroring container image, env vars, resources, tolerations, and labels from `deploy/gh-runner/deployment.yaml`.
     - Auxiliary `ServiceAccount`, `Role`, `RoleBinding`, and any ConfigMaps currently in `deploy/gh-runner`.
  3. Expose configurable knobs via Pulumi config:
     | Config key | Type | Purpose |
     | --- | --- | --- |
     | `namespace` | string | Target namespace (default `my-reforge-ai`). |
     | `runnerImage` | string | Container image for the runner. |
     | `runnerLabels` | string[] | GitHub runner labels beyond default. |
     | `githubRepo` | string | Repo slug for registration. |
     | `githubToken` | secret | Registration token pulled from GitHub. |
     | `githubUrl` | string (optional) | Override for GH Enterprise URL. |
  4. Add `infra/pulumi/gh-runner/README.md` documenting install, config, preview/apply, destroy, plus pointers to `deploy/gh-runner` for existing YAML fallback.
  5. Update `deploy/gh-runner/README.md` to reference Pulumi flow and note manual prerequisites (Pulumi CLI, kubeconfig, token generation).
  6. Commit generated stack template `Pulumi.dev.yaml` with placeholder config (no secrets) showing expected structure.
- Affected paths (target repo): `infra/pulumi/gh-runner/**`, `package.json`, `yarn.lock`, `deploy/gh-runner/**`.
- Interfaces/IO: Pulumi CLI (`pulumi preview|up|destroy`), Pulumi config files (`Pulumi.<stack>.yaml`), GitHub runner registration token provided via secret Pulumi config, Kubernetes context configured externally.
- Security/Secrets: Store runner registration token and GitHub repo URL as Pulumi secret config; never commit raw secret values. Document required CLI auth (Pulumi login) and GitHub token handling.

# Validation & Rollback

- Validation: Run `yarn install` (ensure `@pulumi/pulumi` and `@pulumi/kubernetes` present), `pulumi config set namespace my-reforge-ai`, `pulumi config set --secret githubToken <token>`, then `pulumi preview` to confirm diff with zero resource replacements versus manifest.
- Rollback: `pulumi destroy` removes runner resources; fallback to existing YAML manifests if required. Document manual `kubectl delete -f deploy/gh-runner/` as emergency rollback.

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
