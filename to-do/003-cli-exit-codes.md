# CLI Exit Code Standardization

## Summary

Standardize exit codes for all CLI entrypoints to differentiate configuration errors, external failures, and internal bugs.

## Rationale

- Current CLIs mostly throw errors, which collapse into exit code `1` without categorization.
- Downstream automations (GitHub Actions, cron jobs) cannot distinguish retryable failures from fatal misconfigurations.

## Suggested Steps

1. Define exit code constants in `src/core/constants/exit-codes.ts`.
2. Wrap CLI `main` functions with try/catch translating known error classes into specific exit codes.
3. Audit existing error throws, converting to typed errors (`ConfigurationError`, `UsageLimitError`, etc.).
4. Document semantics in README and add smoke tests asserting exit codes.

## Expected Impact

Improves automation resilience and reduces noisy alerts by enabling workflows to handle specific failure categories intelligently.\*\*\*
