# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Automate the deployment of a GitHub Actions self-hosted runner using Pulumi Infrastructure as Code.
- Non-Goals:
  - Implementing the GitHub Actions workflow itself.
  - Managing the lifecycle of the applications deployed by the runner.

# Deliverables

- [ ] Pulumi project for GitHub runner deployment (e.g., in a new 'infra/github-runner' directory)
- [ ] Configuration for the Pulumi project (e.g., stack configuration)
- [ ] Basic documentation on how to deploy/manage the runner with Pulumi

# Approach

- Summary: Develop a Pulumi program (likely in TypeScript) to define the necessary cloud resources for a GitHub Actions self-hosted runner. This will include compute instances, networking, and any required IAM roles/permissions. The solution will be modular and configurable.
- Affected paths (target repo): infra/github-runner/ (new directory)
- Interfaces/IO: Pulumi CLI, cloud provider APIs (AWS, Azure, GCP), GitHub API for runner registration.
- Security/Secrets: Pulumi secrets for sensitive configuration (e.g., GitHub PAT for runner registration).

# Acceptance Criteria

- [ ] Pulumi project successfully deploys a GitHub Actions self-hosted runner.
- [ ] The deployed runner registers successfully with GitHub.
- [ ] The runner can execute a simple test workflow.
- [ ] Pulumi stack can be updated and destroyed cleanly.

# Risks & Mitigations

- Risk: Complexity of cloud provider setup → Mitigation: Start with a single cloud provider (e.g., AWS) and use well-documented Pulumi components.
- Risk: GitHub runner registration/authentication issues → Mitigation: Thorough testing of the registration process and clear documentation of required permissions.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.