# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: To implement a Pulumi Infrastructure as Code (IaC) solution for deploying a GitHub Actions self-hosted runner, ensuring it is scalable, maintainable, and integrated with the existing `my-reforge-ai` project.
- Non-Goals:
    - Implementing the GitHub Actions workflow itself.
    - Managing the lifecycle of the GitHub Actions runner beyond its initial deployment.
    - Creating a generic Pulumi component for all types of GitHub Actions runners.

# Deliverables

- [ ] Pulumi program (TypeScript) for deploying a GitHub Actions runner.
- [ ] Configuration files for the Pulumi program.
- [ ] Documentation for deploying and managing the Pulumi stack.
- [ ] Basic tests for the Pulumi infrastructure.

# Approach

- Summary: The Pulumi program will define the necessary cloud resources (e.g., VM, networking, security groups) to host a GitHub Actions runner. It will use TypeScript for infrastructure definition. The runner will be configured to register with the `spigell/my-reforge-ai` repository.
- Affected paths (target repo): `deploy/pulumi-runner/` (new directory), `deploy/pulumi-runner/Pulumi.yaml`, `deploy/pulumi-runner/index.ts`, `deploy/pulumi-runner/package.json`, `deploy/pulumi-runner/tsconfig.json`
- Interfaces/IO: Pulumi CLI for deployment, GitHub API for runner registration.
- Security/Secrets: GitHub Personal Access Token (PAT) for runner registration will be managed as a Pulumi secret. No PATs will be hardcoded or exposed in plain text.

# Acceptance Criteria

- [ ] A Pulumi stack can be successfully deployed, creating a functional GitHub Actions runner.
- [ ] The deployed runner successfully registers with the `spigell/my-reforge-ai` repository.
- [ ] The Pulumi program can be updated and redeployed without downtime for existing runners (if applicable, for future scaling).
- [ ] The Pulumi stack can be destroyed, cleaning up all created resources.

# Risks & Mitigations

- Risk: Complexity of cloud resource configuration. → Mitigation: Start with a minimal viable runner setup and iterate.
- Risk: Security of GitHub PAT. → Mitigation: Use Pulumi secrets management and ensure PAT has minimal necessary scope.
- Risk: Compatibility issues with existing infrastructure. → Mitigation: Isolate the Pulumi deployment to its own directory and stack.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.
