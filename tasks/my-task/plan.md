# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Implement a Pulumi Infrastructure as Code (IaC) solution for deploying a GitHub Actions self-hosted runner.
- Non-Goals:
    - Implementing the actual GitHub Actions workflow.
    - Managing the lifecycle of the applications running on the runner.

# Deliverables

- [ ] Pulumi program (TypeScript) for deploying a GitHub Actions runner.
- [ ] Configuration files for the Pulumi program.
- [ ] Documentation on how to deploy and manage the runner using Pulumi.

# Approach

- Summary: Use Pulumi to define and deploy the necessary cloud resources (e.g., VM, network, security groups) for a GitHub Actions runner. The runner will be configured to register with a specified GitHub repository.
- Affected paths (target repo): TBD (likely a new directory like `infra/github-runner-pulumi`)
- Interfaces/IO: Pulumi CLI, GitHub API for runner registration, cloud provider API (e.g., AWS, Azure, GCP).
- Security/Secrets: GitHub PAT for runner registration, cloud provider credentials. These will be managed securely via Pulumi secrets or environment variables.

# Acceptance Criteria

- [ ] A GitHub Actions runner is successfully deployed using Pulumi.
- [ ] The deployed runner registers with the specified GitHub repository.
- [ ] The Pulumi program can be updated and destroyed without manual intervention.

# Risks & Mitigations

- Risk: Complexity of cloud provider APIs → Mitigation: Start with a simple, well-documented cloud provider and resource set.
- Risk: Security of GitHub PAT and cloud credentials → Mitigation: Use Pulumi's secret management and follow best practices for credential handling.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.