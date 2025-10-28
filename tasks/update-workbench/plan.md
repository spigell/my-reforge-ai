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

- [ ] Updated `deploy/develop/base/workbench.yaml` to use a shared `emptyDir` for the project volume.
- [ ] Updated `deploy/develop/overrides/patch-nfs-and-user.yaml` to remove the NFS volume patch and add a `sync-hub` sidecar container.
- [ ] A new `deploy/develop/overrides/sync-hub-bootstrap.sh` script to initialize the sync process.
- [ ] Updated `deploy/develop/overrides/kustomization.yml` to include the new bootstrap script.

# Approach

- Summary: A `sync-hub` sidecar container will be added to the workbench pod. This sidecar will be responsible for syncing the repository content into a shared volume that is used by the other workbench containers. The existing NFS mount will be removed.
- Affected paths (target repo):
  - `deploy/develop/base/workbench.yaml`
  - `deploy/develop/overrides/patch-nfs-and-user.yaml`
  - `deploy/develop/overrides/kustomization.yml`
  - `deploy/develop/overrides/sync-hub-bootstrap.sh`
- Interfaces/IO: The `sync-hub` container will need credentials to access the sync source. These will be provided as a Kubernetes secret.
- Security/Secrets: A new Kubernetes secret will be required to store the `sync-hub` credentials.

## `sync-hub-bootstrap.sh` content

```bash
#!/bin/bash
set -euo pipefail

echo "Starting sync-hub bootstrap"

# This script will be responsible for:
# 1. Reading credentials from a secret.
# 2. Configuring the sync-hub client.
# 3. Starting the initial sync.
# 4. Monitoring the sync process.

# Placeholder for actual implementation
while true; do
  echo "Syncing..."
  sleep 60
done
```

# Acceptance Criteria

- [ ] The `hh-responder-workbench` pod starts successfully.
- [ ] The `/project` directory in the `codex-workbench` and `gemini-workbench` containers is populated with the content of the `spigell/hh-responder` repository.
- [ ] The NFS volume is no longer used.

# Risks & Mitigations

- Risk: The `sync-hub` service is not available or the credentials are wrong. → Mitigation: The `sync-hub-bootstrap.sh` script will have retry logic and clear error messages.

# Rollout & Review

- Planning via this PR in the tasks repo.
- Implementation will open a new PR in `spigell/hh-responder` after approval.