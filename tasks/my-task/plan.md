# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: To implement a Pulumi Infrastructure as Code (IaC) solution for deploying a GitHub Actions self-hosted runner.
- Non-Goals:
    - Implementing the GitHub Actions workflow itself.
    - Managing the applications running on the GitHub runner.

# Deliverables

- [ ] Pulumi project for GitHub runner deployment (e.g., `infra/github-runner/`)
- [ ] Pulumi stack configuration (e.g., `Pulumi.dev.yaml`)
- [ ] Documentation for deploying and managing the runner using Pulumi.

# Approach

- Summary: Use Pulumi with a chosen cloud provider (e.g., AWS, Azure, GCP) to define and deploy the necessary infrastructure for a GitHub Actions runner. This will involve creating compute instances, networking, and any required storage or IAM roles.
- Affected paths (target repo): `infra/github-runner/` (new directory)
- Interfaces/IO: Pulumi CLI, Cloud Provider APIs, GitHub API (for runner registration)
- Security/Secrets: Pulumi secrets management for sensitive data (e.g., GitHub PAT, cloud provider credentials). Cloud provider credentials will be sourced from environment variables or Pulumi configuration.

# Acceptance Criteria

- [ ] A new GitHub Actions self-hosted runner is successfully deployed using Pulumi.
- [ ] The deployed runner can register with GitHub and pick up jobs.
- [ ] The Pulumi stack can be updated and destroyed cleanly.
- [ ] Documentation is provided for setup, deployment, and teardown.

# Risks & Mitigations

- Risk: Complexity of cloud provider setup → Mitigation: Start with a simple setup (e.g., single EC2 instance) and iterate.
- Risk: GitHub API rate limits during runner registration → Mitigation: Implement retry mechanisms and exponential backoff.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.
