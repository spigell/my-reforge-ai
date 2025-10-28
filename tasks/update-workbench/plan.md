# Task

- repo: spigell/hh-responder
- kind: feature
- idea: Update workbench to use sync-hub

# Goal & Non-Goals

- Goal: Replace the NFS-based code synchronization in the development workbench with a new `sync-hub`-based approach.
- Non-Goals:
  - Implementing the `sync-hub` server.
  - Changing the production deployment.

# Deliverables

- [ ] Extend `deploy/develop/base/workbench.yaml` with a `sync-hub` sidecar container that mounts the shared `/project` `emptyDir` and exposes any projected secrets/configs needed for the client while keeping the `codex-workbench` and `gemini-workbench` containers wired to that volume.
- [ ] Replace the NFS-focused override in `deploy/develop/overrides/patch-nfs-and-user.yaml` with sync-hub wiring (volumes, mounts, env) and double-check both workspaces' bootstrap commands (`codex` and `gemini`) continue to run against the synced `/project`.
- [ ] Add `deploy/develop/overrides/sync-hub-bootstrap.sh` with real bootstrap logic (read credentials, configure the client, start sync, health logging/retries).
- [ ] Update `deploy/develop/overrides/kustomization.yml` to include the bootstrap script (ConfigMap) and template a new `sync-hub` secret alongside the existing `hh-token` secret so the sidecar can authenticate.
- [ ] Update `deploy/develop/overrides/user-bootstrap.sh` to wait for the `.sync-hub-ready` sentinel before dropping into the workspace shells so both containers see the synced checkout.

# Approach

- Summary: A `sync-hub` sidecar container will keep the `/project` volume in sync so both workbench containers continue to see an up-to-date checkout without mounting an external NFS path.
- Steps:
  - Audit `deploy/develop/base/workbench.yaml` and the helper script in `deploy/develop/overrides/user-bootstrap.sh` to understand how the `codex-workbench` and the second (`gemini-workbench`) workspace consume `/project` today.
  - Introduce a `sync-hub` container (plus readiness probe) that mounts `/project`, has access to credentials, and executes the bootstrap script to clone + continuously sync the repository.
  - Rewrite `deploy/develop/overrides/patch-nfs-and-user.yaml` to drop the NFS volume/hostUsers override, mount the new ConfigMap/secret, and confirm both workspace containers still launch via their respective `user-bootstrap.sh` modes.
  - Update `deploy/develop/overrides/user-bootstrap.sh` to wait on the `.sync-hub-ready` file before handing control to either workspace shell so neither container races the sync.
  - Package the bootstrap logic via ConfigMap, define the new secret template, and document any required environment variables for local operators.
- Affected paths (target repo):
  - `deploy/develop/base/workbench.yaml`
  - `deploy/develop/overrides/patch-nfs-and-user.yaml`
  - `deploy/develop/overrides/kustomization.yml`
  - `deploy/develop/overrides/sync-hub-bootstrap.sh`
- Interfaces/IO: The sidecar will run the `sync-hub` CLI against the Git repository URL, reading an auth token (e.g. `SYNC_HUB_TOKEN`) and optional config (poll interval, exclude globs). Credentials and config will be projected via a secret and/or config map, and the bootstrap script will expose a readiness signal for the other containers.
- Security/Secrets: Create a namespaced secret (tentatively `sync-hub-credentials`) with at least a `token` key; document optional keys (e.g. `config.yaml`) so developers can template their own copies without checking sensitive data into Git.

## `sync-hub-bootstrap.sh` content

```bash
#!/bin/bash
set -euo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/project}"
TOKEN_PATH="${SYNC_HUB_TOKEN_PATH:-/secrets/sync-hub/token}"
CONFIG_PATH="${SYNC_HUB_CONFIG_PATH:-/config/sync-hub.yaml}"
READY_FILE="${PROJECT_ROOT}/.sync-hub-ready"

cleanup() {
  rm -f "${READY_FILE}"
}
trap cleanup EXIT

echo ">>> sync-hub bootstrap: waiting for credentials"
until [[ -s "${TOKEN_PATH}" ]]; do
  echo "sync-hub token not found, retrying..."
  sleep 5
done

mkdir -p "$(dirname "${READY_FILE}")"

echo ">>> sync-hub bootstrap: starting client"
/usr/local/bin/sync-hub \
  --root "${PROJECT_ROOT}" \
  --token "$(cat "${TOKEN_PATH}")" \
  ${CONFIG_PATH:+--config "${CONFIG_PATH}"} \
  --once && touch "${READY_FILE}"

echo ">>> sync-hub bootstrap: entering watch mode"
/usr/local/bin/sync-hub \
  --root "${PROJECT_ROOT}" \
  --token "$(cat "${TOKEN_PATH}")" \
  ${CONFIG_PATH:+--config "${CONFIG_PATH}"} \
  --watch
```

# Acceptance Criteria

- [ ] The `hh-responder-workbench` pod starts successfully.
- [ ] The `/project` directory in the `codex-workbench` and `gemini-workbench` containers is populated with the content of the `spigell/hh-responder` repository.
- [ ] The NFS volume is no longer used.

# Risks & Mitigations

- Risk: The `sync-hub` service is not available or the credentials are wrong. → Mitigation: The `sync-hub-bootstrap.sh` script will have retry logic and clear error messages.
- Risk: One of the workbench containers (especially the `gemini` workspace) starts before the initial sync completes, causing an empty `/project`. → Mitigation: Create a ready sentinel (`.sync-hub-ready`) the bootstrap script touches; update `user-bootstrap.sh` to wait for it before dropping into the shell.

# Rollout & Review

- Planning via this PR in the tasks repo.
- Implementation will open a new PR in `spigell/hh-responder` after approval.
