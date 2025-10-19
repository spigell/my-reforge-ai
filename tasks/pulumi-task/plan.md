# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Implement Pulumi Infrastructure as Code (IaC) to deploy a GitHub Actions self-hosted runner.
- Non-Goals:
  - Implementing the GitHub Actions workflow itself.
  - Managing the lifecycle of the applications running on the runner.

# Deliverables

- [ ] Pulumi project for GitHub runner deployment (what/where: `deploy/pulumi/github-runner`)
- [ ] Pulumi stack configuration for different environments (e.g., `dev`, `prod`)
- [ ] Documentation on how to deploy and manage the runner using Pulumi

# Approach

- Summary: Use Pulumi with TypeScript to define the infrastructure required for a GitHub Actions runner, including compute resources (e.g., EC2 instance, Kubernetes pod), networking, and necessary IAM roles/permissions.
- Affected paths (target repo): `deploy/pulumi/github-runner/`
- Interfaces/IO: Pulumi CLI, GitHub API for runner registration, cloud provider APIs (e.g., AWS, GCP, Azure)
- Security/Secrets: Pulumi secrets management for sensitive data (e.g., GitHub PAT, cloud provider credentials). Never hardcode secrets.

# Acceptance Criteria

- [ ] Pulumi project successfully deploys a GitHub Actions runner.
- [ ] The deployed runner registers successfully with GitHub.
- [ ] The runner can execute a basic GitHub Actions workflow.
- [ ] Pulumi stack updates and destructions work as expected.

# Risks & Mitigations

- Risk: Complexity of cloud provider setup → Mitigation: Start with a simple, well-documented cloud provider (e.g., AWS EC2) and gradually add complexity.
- Risk: GitHub API rate limits → Mitigation: Implement proper error handling and backoff strategies for API calls.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.