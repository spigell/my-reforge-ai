# Review Lock Registry

## Summary

Create a persistent review-lock registry that tracks active review-required tasks across runs, avoiding reliance on filesystem scans alone.

## Rationale

- Current implementation infers locks from `task.yaml` files each run, which can miss in-flight reviews if files are removed prematurely.
- A registry enables timeouts, manual overrides, and clearer status reporting.

## Suggested Steps

1. Define a `ReviewLock` entity (repo, kind, taskFile, status, updatedAt).
2. Store registry data in `tasks/review-locks.json` with atomic writes via helper utilities.
3. Update matcher to consult registry first, falling back to filesystem for backward compatibility.
4. Provide CLI commands to list, release, and refresh locks.

## Expected Impact

Reduces accidental concurrency on review-required tasks and gives operators explicit control over lock lifecycle.\*\*\*
