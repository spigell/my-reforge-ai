# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Implement a Pulumi Infrastructure as Code (IaC) solution for deploying a GitHub Actions self-hosted runner.
- Non-Goals:
    - Implementing the actual GitHub Actions workflow.
    - Managing the lifecycle of the runner beyond initial deployment.
    - Handling complex scaling scenarios.

# Deliverables

- [ ] Pulumi project for GitHub Actions runner deployment (main.ts, Pulumi.yaml, etc.)
- [ ] Configuration for the runner (e.g., runner image, labels, GitHub token)
- [ ] Basic documentation on how to deploy and configure the runner.

# Approach

- Summary: Use Pulumi with TypeScript to define the infrastructure for a GitHub Actions runner. This will involve creating resources such as a virtual machine, network interfaces, and any necessary security groups. The runner will be configured to register with GitHub using a provided token.
- Affected paths (target repo): TBD (likely a new directory like `infra/github-runner-pulumi`)
- Interfaces/IO: Pulumi CLI, GitHub API for runner registration, environment variables for sensitive information (e.g., GitHub token).
- Security/Secrets: GitHub token will be managed as a Pulumi secret or environment variable. No hardcoded secrets.

# Acceptance Criteria

- [ ] Pulumi project successfully deploys a GitHub Actions runner.
- [ ] The deployed runner registers with GitHub and appears online.
- [ ] The runner can execute a simple test workflow.

# Risks & Mitigations

- Risk: Complexity of cloud provider APIs → Mitigation: Start with a simple VM-based runner and iterate.
- Risk: GitHub API rate limits during runner registration → Mitigation: Implement retry mechanisms and exponential backoff.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.
