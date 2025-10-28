# Workspace Cleanup Automation

## Summary

Automate workspace pruning to remove stale repositories, build artifacts, and temporary files generated during task execution.

## Rationale

- Workspaces accumulate large artifacts over time, leading to disk pressure on runners.
- Manual cleanup is error-prone and can delete active work accidentally.

## Suggested Steps

1. Add a `workspace-cleanup` CLI under `src/bin` that respects safe retention policies (e.g., keep last N days, skip active locks).
2. Integrate cleanup into GitHub Actions workflow post-task, with dry-run mode for audits.
3. Track cleanup metrics via the logger to monitor reclaimed space.
4. Provide tests using temporary directories to verify retention rules.

## Expected Impact

Stabilizes runner environments, reduces storage costs, and prevents failures due to insufficient disk space.\*\*\*
