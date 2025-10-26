# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Ship a Pulumi TypeScript project that reproduces the existing GitHub runner Kubernetes footprint (ConfigMap + Codex and Gemini deployments) with stack config for namespaces, images, secrets, runner labels, and PVC references.
- Non-Goals:
  - Managing runtime secrets beyond referencing Pulumi config/secret values.
  - Automating Pulumi stack execution in CI/CD.
  - Redesigning the runner topology or scaling strategy beyond current manifest parity.
  - Migrating existing clusters automatically; rollout stays manual.
  - Provisioning or rotating persistent volumes/claims; they remain managed in GKE.

# Infra Context

- Target environment is the existing Google Kubernetes Engine (GKE) cluster running in GCP with the `my-reforge-ai` namespace pre-created.
- Kubernetes secrets (`github-runner-config`, `github-mcp-credentials`) and persistent volume claims (`codex-home`, `gemini-home`) already exist; Pulumi must reference rather than recreate them.
- Codex runner pods mount a ConfigMap-backed TOML file (`codex-config-gh-runner`) that must be materialised via Pulumi before the deployment is applied.

# Deliverables

- [ ] `infra/pulumi/gh-runner/Pulumi.yaml` defining the project metadata and default stack.
- [ ] `infra/pulumi/gh-runner/index.ts` porting the Kubernetes deployment/service resources using `@pulumi/kubernetes`.
- [ ] `infra/pulumi/gh-runner/README.md` with setup steps, config keys, and Pulumi commands to deploy/update.
- [ ] Update repository docs (`deploy/gh-runner/README.md` or equivalent) to point to the Pulumi workflow.
- [ ] Validation notes describing how to preview/apply the stack and verify runner registration.
- [ ] `infra/pulumi/gh-runner/Pulumi.dev.yaml` documenting the expected stack config structure (placeholders only).

# Approach

- Current baseline: `deploy/gh-runner/deployment.yaml` defines three resources — a ConfigMap for Codex config plus two separate deployments (`codex-gh-runner`, `gemini-gh-runner`) with distinct images, PVC mounts, env vars, and labels.
- Summary: Introduce a Pulumi TypeScript program backed by `@pulumi/pulumi` and `@pulumi/kubernetes` that instantiates the ConfigMap and both deployments, parameterized via Pulumi config for namespace, runner metadata, and secret wiring.
- Implementation steps:
  1. Scaffold the Pulumi project under `infra/pulumi/gh-runner` (`Pulumi.yaml`, `package.json` workspace entry) and ensure dependencies include `@pulumi/pulumi`, `@pulumi/kubernetes`, and `@types/node`.
  2. Port manifests into typed resources:
     - `k8s.core.v1.ConfigMap` for `codex-config-gh-runner`, preserving the TOML content verbatim.
     - Two `k8s.apps.v1.Deployment` resources, one per runner type, each mirroring replicas, security context, env vars (with `secretKeyRef`), PVC mounts, and ConfigMap sub-paths from the YAML.
     - No ServiceAccount/Role resources are necessary; baseline manifests rely on defaults but explicitly disable token automounting—maintain that setting.
     - Reference existing secrets (`github-runner-config`, `github-mcp-credentials`) instead of creating new ones.
  3. Define a Pulumi config schema that drives both deployments via data rather than bespoke code:
     | Config key | Type | Purpose |
     | --- | --- | --- |
     | `namespace` | string | Target namespace (default `my-reforge-ai`). |
     | `githubRepo` | string | Repo slug for registration (e.g., `spigell/my-reforge-ai`). |
     | `githubUrl` | string (optional) | Override for GH Enterprise URL. |
     | `githubToken` | secret | Registration token pulled from GitHub; surfaced to pods via existing secrets. |
     | `runners` | array<object> | Entries provide `name`, `image`, `labels`, `replicas`, `pvcMounts`, and optional ConfigMap mounts. |
     | `codexConfig` | object | Shape `{ enabled: boolean; configToml: string }` to let operators reuse or update the ConfigMap payload. |
  4. Encode the deployment loop with helper functions so shared security context and resource requests stay consistent. Include an illustrative snippet in the plan to set expectations for implementation style.
     ```ts
     interface RunnerConfig {
       name: string;
       image: string;
       labels: string[];
       replicas: number;
       pvcMounts: Record<string, string>;
       configMapMount?: { name: string; key: string; mountPath: string };
     }

     const namespace = config.get('namespace') ?? 'my-reforge-ai';
     const runners = config.requireObject<RunnerConfig[]>('runners');

     runners.forEach((runner) => {
       new k8s.apps.v1.Deployment(`${runner.name}-gh-runner`, {
         metadata: { namespace, labels: { app: `${runner.name}-gh-runner` } },
         spec: {
           replicas: runner.replicas,
           selector: { matchLabels: { app: `${runner.name}-gh-runner` } },
           template: {
             metadata: { labels: { app: `${runner.name}-gh-runner` } },
             spec: {
               automountServiceAccountToken: false,
               securityContext: baseSecurityContext,
               containers: [
                 {
                   name: 'runner',
                   image: runner.image,
                   env: commonEnvVars(runner.labels),
                   volumeMounts: buildVolumeMounts(runner),
                   resources: defaultResources,
                 },
               ],
               volumes: buildVolumes(runner),
             },
           },
         },
       });
     });
     ```
  5. Author `infra/pulumi/gh-runner/README.md` detailing GCP prerequisites (`gcloud auth`, kubeconfig pointing at the GKE cluster), config examples for both runners, security guidance, and Pulumi workflows (`preview`, `up`, `destroy`).
  6. Update `deploy/gh-runner/README.md` to point to the Pulumi-based workflow and clarify when to fall back to raw YAML.
  7. Check the plan into version control alongside `Pulumi.dev.yaml`, containing placeholder config for two runner entries and documentation comments.
- Affected paths (target repo): `infra/pulumi/gh-runner/**`, `package.json`, `yarn.lock`, `deploy/gh-runner/**`.
- Interfaces/IO: Pulumi CLI (`pulumi preview|up|destroy`), Pulumi config files (`Pulumi.<stack>.yaml`), GitHub runner registration token provided via secret Pulumi config, Kubernetes context configured externally.
- Security/Compliance: Store runner registration token and GitHub repo URL as Pulumi secret config; never commit raw secret values. Document required CLI auth (Pulumi login) and GitHub token handling.

# Validation & Rollback

- Validation: Run `yarn install` (ensure `@pulumi/pulumi` and `@pulumi/kubernetes` present), set namespace + both runner definitions via `pulumi config`, set `githubToken` as secret, then `pulumi preview` to confirm that the ConfigMap and both deployments render with no drift versus the YAML.
- Rollback: `pulumi destroy` removes runner resources; fallback to existing YAML manifests if required. Document manual `kubectl delete -f deploy/gh-runner/` as emergency rollback.

# Acceptance Criteria

- [ ] Pulumi project synthesizes resources equivalent to the existing deployment when running `pulumi preview`.
- [ ] Documentation covers bootstrap (install deps, set config, preview/apply) and clean-up steps.
- [ ] Pulumi stack supports specifying target namespace, repo URL, and per-runner images/labels without code changes.

# Security Considerations

- Pulumi config will mark `githubToken` and any PAT-equivalent values as secrets; workflows document `pulumi config set --secret` so plaintext never lands in git or shell history.
- State storage: recommend a GCS bucket (matching GCP infra) with CMEK and Pulumi’s built-in encryption to protect state + secret material at rest.
- Kubernetes resources retain hardened settings from YAML (`runAsNonRoot`, `seccompProfile: RuntimeDefault`, `allowPrivilegeEscalation: false`, `capabilities.drop = ['ALL']`); helpers will enforce these defaults.
- Secrets stay in Kubernetes (`github-runner-config`, `github-mcp-credentials`); README will cover rotation steps via GCP Secret Manager / GitHub PAT regeneration prior to `pulumi up`.
- PVCs are referenced by name only, avoiding accidental deletion of Codex/Gemini home directories while still ensuring deployments mount them.
- Document requirement that only the locked-down GCP service account (runner automation) has IAM to execute `pulumi up`, reducing risk of unreviewed changes.

# Risks & Mitigations

- Risk: Divergence from existing manifests causes runtime drift → Mitigation: Diff against `deploy/gh-runner/deployment.yaml` and validate via `pulumi preview` for ConfigMap + both deployments.
- Risk: Handling sensitive tokens in config → Mitigation: Use Pulumi secret config entries, encrypt state in GCS, and document rotation steps.
- Risk: Misconfigured PVC references block pods in Pending → Mitigation: Surface PVC names as config defaults, validate them, and document prerequisites in README.
- Risk: Missing Pulumi dependencies or build scripts → Mitigation: Update `package.json` and run `yarn install` to ensure reproducible setup.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- Move to implementing once APPROVED in this PR.
