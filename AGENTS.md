# Repository Guidelines

## Project Structure & Module Organization

Source code lives in `src/` as TypeScript modules; keep each service in its own folder following the existing flat layout used by `src/fetch-usage.ts`. Compiled artifacts belong in `dist/` after running the build. Deployment assets sit in `deploy/`, with `deploy/gh-runner` and `deploy/workbench` providing Kubernetes manifests and bootstrap scripts; update them when your change requires infrastructure adjustments. Shared automation files (GitHub workflows, Husky hooks) reside under `.github/` and `.husky/`.

## Build, Test, and Development Commands

Install dependencies with `yarn install`. Run `yarn build` to transpile TypeScript using the root `tsconfig.json`, which outputs to `dist/`. Use `yarn run fetch-usage` during development to exercise the current service logic against live APIs (requires environment variables defined via `dotenv-safe`). For ad-hoc scripts, prefer `npx ts-node path/to/script.ts` so TypeScript stays the source of truth.

## Coding Style & Naming Conventions

Write modern TypeScript, targeting ES modules (`"type": "module"`). Use Prettier with the repository settings (`.prettierrc` enforces single quotes); format before committing. Keep indentation at two spaces, favor named exports, and suffix service entrypoints with the feature (e.g., `fetch-usage.ts`). Configuration files should remain JSON with a trailing newline.

## Testing Guidelines

Every functional change should introduce or update tests. Compile first, then run Node’s test runner against the emitted code, e.g., `yarn build && node --test dist/**/*.test.js`. Place test sources in `src/__tests__/` using `*.test.ts` naming so they mirror production modules. When behavior depends on external services, stub HTTP calls with lightweight fixtures and document them in the test file.

## Commit & Pull Request Guidelines

Write commits as concise, imperative sentences (`Add fetch usage cache`). Group related changes together and keep noise out of the diff. Pull requests must include a summary, linked issue (if applicable), testing notes, and confirmation that deployment artifacts in `deploy/` remain valid or describe the needed follow-up. Ensure the PR addresses only a single feature or fix and contains accompanying tests.

---

# AI Agent Instructions

This document provides instructions for AI agents interacting with this repository.

## General Guidelines

- Adhere to the project's coding style and conventions.
- Ensure that all code changes are accompanied by corresponding tests.
- Keep pull requests focused on a single issue or feature.

## Specific Instructions

- When creating new services, follow the existing service structure in the `src` directory.
- Before making any changes, familiarize yourself with the deployment process outlined in the `deploy` directory.
