# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Implement a Pulumi Infrastructure as Code (IaC) solution for deploying a GitHub Actions self-hosted runner.
- Non-Goals:
  - Implementing the GitHub Actions workflow itself.
  - Managing secrets or sensitive data within Pulumi directly (will use existing secrets management).
  - Supporting multiple cloud providers in this initial implementation.

# Deliverables

- [ ] Pulumi project for GitHub runner deployment (e.g., `infra/github-runner/`)
- [ ] Pulumi stack configuration for development and production environments.
- [ ] Documentation on how to deploy and manage the Pulumi stack.
- [ ] Basic tests for the Pulumi infrastructure (e.g., `pulumi preview` validation).

# Approach

- Summary: Use Pulumi with TypeScript to define the infrastructure for a GitHub self-hosted runner. This will involve defining the necessary cloud resources (e.g., VM, networking, security groups) and configuring the GitHub runner agent.
- Affected paths (target repo): `infra/github-runner/`, potentially updates to `.github/workflows` for integration.
- Interfaces/IO: Pulumi CLI for deployment, GitHub API for runner registration, cloud provider API (e.g., AWS, GCP, Azure).
- Security/Secrets: Pulumi will use its built-in secrets management for sensitive configuration. GitHub token for runner registration will be provided via environment variables or Pulumi secrets.

# Acceptance Criteria

- [ ] A Pulumi project is created and configured for the GitHub runner.
- [ ] The Pulumi stack can be successfully deployed to a target cloud provider.
- [ ] A GitHub self-hosted runner is successfully registered and online after deployment.
- [ ] The Pulumi code is well-documented and follows best practices.

# Risks & Mitigations

- Risk: Complexity of cloud provider configuration → Mitigation: Start with a minimal viable cloud setup and iterate.
- Risk: GitHub runner registration issues → Mitigation: Thorough testing of the registration process and clear error logging.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.