# Planner Prompt Refactor

## Summary

Modularize the planning prompt template to support reusable sections and conditional blocks, reducing duplication between `init` and `update` modes.

## Rationale

- The single Handlebars template has grown large and difficult to maintain.
- Reusable partials would make it easier to add new instructions or agent-specific variants.

## Suggested Steps

1. Split `planning-promt-tmpl.md` into partials under `src/task-planner/templates/`.
2. Implement a template loader that composes partials based on task stage and flags.
3. Add unit tests ensuring both `init` and `update` prompts render expected content.
4. Document extension guidelines for adding new sections or agent-specific instructions.

## Expected Impact

Simplifies future prompt updates and reduces risk of regressions when adjusting planner behavior.\*\*\*
