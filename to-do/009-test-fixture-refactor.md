# Test Fixture Refactor

## Summary
Refactor integration tests to share reusable fixture helpers for temporary repositories, YAML generation, and logger stubs.

## Rationale
- Tests currently duplicate setup logic (temp dirs, YAML writers), increasing maintenance burden.
- Centralized fixtures will make it easier to add comprehensive coverage for new features without boilerplate.

## Suggested Steps
1. Create `src/__tests__/helpers/fixtures.ts` with utilities for temp workspace creation and cleanup.
2. Migrate existing matcher and planner tests to use the helpers.
3. Introduce snapshot-like assertions for complex YAML to detect accidental schema changes.
4. Ensure helpers clean up resources even on failures to avoid leaking files on CI.

## Expected Impact
Improves test reliability, shortens future test implementations, and encourages higher coverage.***
