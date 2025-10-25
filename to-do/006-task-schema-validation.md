# Task Schema Validation

## Summary
Add JSON Schema validation for task and idea files to enforce required fields, types, and enum values at load time.

## Rationale
- Manual validation logic is spreading across helpers, increasing maintenance overhead.
- Schema-driven validation provides clearer error messages and makes IDE integrations easier via schema references.

## Suggested Steps
1. Author `schemas/task-definition.schema.json` describing tasks/ideas with priority enum.
2. Integrate `ajv` or similar validator in `validateAndNormalizeTask`, replacing ad-hoc checks.
3. Expose schema via repository docs and configure VS Code settings for YAML validation.
4. Build unit tests for expected validation failures (missing repo, invalid priority).

## Expected Impact
Reduces runtime surprises from malformed task files and improves contributor experience with immediate feedback.***
