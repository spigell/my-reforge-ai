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
  - Provisioning or rotating persistent volumes/claims; they remain managed in the Talos cluster.

# Infra Context

- Target environment is the self-hosted Talos Kubernetes cluster (bare metal) where the `my-reforge-ai` namespace already exists and kubeconfig access is managed via SOPS-encrypted credentials.
- Operational access flows through Talos-managed kubeconfigs (`talosctl kubeconfig`); document how to retrieve/refresh them before running Pulumi locally or in automation.
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
- Summary: Introduce a Pulumi TypeScript program backed by `@pulumi/pulumi` and `@pulumi/kubernetes` that instantiates the ConfigMap and both deployments, parameterized via Pulumi config for namespace, runner metadata, tolerations, and secret wiring.
- Implementation steps:
  1. Scaffold the Pulumi project under `infra/pulumi/gh-runner` (`Pulumi.yaml`, `package.json` workspace entry) and ensure dependencies include `@pulumi/pulumi`, `@pulumi/kubernetes`, and `@types/node`.
  2. Port manifests into typed resources:
     - `k8s.core.v1.ConfigMap` for `codex-config-gh-runner`, preserving the TOML content verbatim and exposing overrides through config.
     - Two `k8s.apps.v1.Deployment` resources, one per runner type, each mirroring replicas, security context, env vars (with `secretKeyRef`), PVC mounts, tolerations, node selectors, and ConfigMap sub-paths from the YAML so both Codex and Gemini runners are deployed independently.
     - No ServiceAccount/Role resources are necessary; baseline manifests rely on defaults but explicitly disable token automounting—maintain that setting.
     - Reference existing secrets (`github-runner-config`, `github-mcp-credentials`) instead of creating new ones.
  3. Define a Pulumi config schema that drives both deployments via data rather than bespoke code:
     | Config key | Type | Purpose |
     | --- | --- | --- |
     | `namespace` | string | Target namespace (default `my-reforge-ai`). |
     | `githubRepo` | string | Repo slug for registration (e.g., `spigell/my-reforge-ai`). |
     | `githubUrl` | string (optional) | Override for GH Enterprise URL. |
     | `githubToken` | secret | Registration token pulled from GitHub; surfaced to pods via existing secrets. |
     | `runners` | array<object> | Entries provide `name`, `image`, `labels`, `replicas`, `pvcMounts`, optional ConfigMap mounts, `tolerations`, and `nodeSelector`. |
     | `codexConfig` | object | Shape `{ enabled: boolean; configToml: string }` to let operators reuse or update the ConfigMap payload. |
  4. Encode the deployment loop with helper functions so shared security context and resource requests stay consistent. Include illustrative snippets in the plan to set expectations for implementation style.
     ```ts
     interface RunnerConfig {
       name: string;
       image: string;
       labels: string[];
       replicas: number;
       pvcMounts: Record<string, string>;
       configMapMount?: { name: string; key: string; mountPath: string };
       tolerations?: k8s.types.input.core.v1.Toleration[];
       nodeSelector?: Record<string, string>;
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
               tolerations: runner.tolerations,
               nodeSelector: runner.nodeSelector,
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
     ```ts
     new k8s.core.v1.ConfigMap('codex-config-gh-runner', {
       metadata: { namespace },
       data: {
         'config.toml': pulumi.interpolate`${codexConfig.enabled ? codexConfig.configToml : existingTemplate}`,
       },
     });
     ```
     ```yaml
     # Pulumi.dev.yaml (excerpt)
     config:
       my-reforge-ai:infra/pulumi/gh-runner:namespace: my-reforge-ai
       my-reforge-ai:infra/pulumi/gh-runner:githubRepo: spigell/my-reforge-ai
       my-reforge-ai:infra/pulumi/gh-runner:runners:
         - name: codex
           image: ghcr.io/spigell/codex-runner:latest
           labels: ['self-hosted', 'codex']
           replicas: 1
           pvcMounts:
             codex-home: /home/codex
           configMapMount:
             name: codex-config-gh-runner
             key: config.toml
             mountPath: /etc/codex/config.toml
         - name: gemini
           image: ghcr.io/spigell/gemini-runner:latest
           labels: ['self-hosted', 'gemini']
           replicas: 1
           pvcMounts:
             gemini-home: /home/gemini
       my-reforge-ai:infra/pulumi/gh-runner:codexConfig:
         enabled: true
         configToml: |
           # mirrors codex-config-gh-runner data
           [runner]
           labels = ["self-hosted","codex"]
     ```
  5. Author `infra/pulumi/gh-runner/README.md` detailing Talos prerequisites (`talosctl kubeconfig`, `kubectl` context targeting the self-hosted cluster), config examples for both runners, security guidance, and Pulumi workflows (`preview`, `up`, `destroy`).
  6. Update `deploy/gh-runner/README.md` to point to the Pulumi-based workflow and clarify when to fall back to raw YAML.
  7. Check the plan into version control alongside `Pulumi.dev.yaml`, containing placeholder config for two runner entries and documentation comments.
- Affected paths (target repo): `infra/pulumi/gh-runner/**`, `package.json`, `yarn.lock`, `deploy/gh-runner/**`.
- Interfaces/IO: Pulumi CLI (`pulumi preview|up|destroy`), Pulumi config files (`Pulumi.<stack>.yaml`), GitHub runner registration token provided via secret Pulumi config, Kubernetes context configured externally.
- Security/Compliance:
  - Store runner registration token, MCP credentials, and any PAT-equivalent values as Pulumi secret config; never commit raw secret values. Document required CLI auth (Pulumi login) and GitHub token handling.
  - Use a Pulumi state backend that supports envelope encryption (e.g., Pulumi Cloud with SSO or Talos-operated S3 bucket with SSE + IAM policies restricting access to the runner automation role).
  - Enforce pod-level hardening identical to manifests (`runAsNonRoot`, `runAsUser`, `seccompProfile: RuntimeDefault`, `readOnlyRootFilesystem`, `allowPrivilegeEscalation: false`, drop all Linux capabilities) inside the shared helper.
  - Add a TODO to explore Talos-native NetworkPolicy enforcement so runners only reach GitHub/MCP endpoints; note that current YAML lacks these controls.
  - Document procedure for rotating secrets: update Kubernetes secrets first (via Talos-approved tooling), then run `pulumi up` to ensure deployments pick up new values without downtime.
  - Highlight that PVCs are referenced by name only, preventing Pulumi from deleting storage; rely on Talos storage primitives for lifecycle management.

# Validation & Rollback

- Validation: Run `yarn install` (ensure `@pulumi/pulumi` and `@pulumi/kubernetes` present), set namespace + both runner definitions via `pulumi config`, set `githubToken` as secret, then `pulumi preview` to confirm that the ConfigMap and both deployments render with no drift versus the YAML.
- Rollback: `pulumi destroy` removes runner resources; fallback to existing YAML manifests if required. Document manual `kubectl delete -f deploy/gh-runner/` as emergency rollback.

# Acceptance Criteria

- [ ] Pulumi project synthesizes resources equivalent to the existing deployment when running `pulumi preview`.
- [ ] Documentation covers bootstrap (install deps, set config, preview/apply) and clean-up steps.
- [ ] Pulumi stack supports specifying target namespace, repo URL, and per-runner images/labels without code changes.

# Security Considerations

- Pulumi config will mark `githubToken` and any PAT-equivalent values as secrets; workflows document `pulumi config set --secret` so plaintext never lands in git or shell history.
- State storage: use Pulumi Cloud or a Talos-operated S3-compatible bucket with server-side encryption and IAM-bound access so only the automation identity can read state.
- Kubernetes resources retain hardened settings from YAML (`runAsNonRoot`, `seccompProfile: RuntimeDefault`, `allowPrivilegeEscalation: false`, `capabilities.drop = ['ALL']`); helpers will enforce these defaults.
- Secrets stay in Kubernetes (`github-runner-config`, `github-mcp-credentials`); README will cover rotation steps via Talos-approved tooling (e.g., SOPS/SealedSecrets) before running `pulumi up`.
- PVCs are referenced by name only, avoiding accidental deletion of Codex/Gemini home directories while still ensuring deployments mount them.
- Document requirement that only the locked-down automation service account (used by runner tooling) has permissions to execute `pulumi up`, reducing risk of unreviewed changes.

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
