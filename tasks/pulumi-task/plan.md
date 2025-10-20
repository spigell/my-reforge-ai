# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Implement a Pulumi Infrastructure as Code (IaC) solution to deploy a GitHub Actions self-hosted runner.
- Non-Goals:
    - Implementing the actual GitHub Actions workflow that uses the runner.
    - Managing the lifecycle of the runner beyond initial deployment (e.g., auto-scaling, updates).
    - Detailed configuration of the runner's software environment.

# Deliverables

- [ ] Pulumi project for GitHub Actions runner deployment (e.g., `pulumi/github-runner`).
- [ ] Pulumi stack definition (e.g., `pulumi/github-runner/dev`).
- [ ] Basic configuration for the GitHub runner (e.g., OS, instance type).
- [ ] Documentation on how to deploy and configure the Pulumi stack.

# Approach

- Summary: Utilize Pulumi with a chosen cloud provider (e.g., AWS, GCP, Azure) to define and deploy the necessary infrastructure for a GitHub Actions self-hosted runner. The Pulumi project will be structured to allow for easy customization and deployment across different environments.
- Affected paths (target repo): `src/pulumi-runner/` (new directory), `tasks/pulumi-task/plan.md`
- Interfaces/IO: Pulumi CLI, cloud provider APIs, GitHub API (for runner registration).
- Security/Secrets: Pulumi secrets management for sensitive configuration (e.g., GitHub PAT, cloud provider credentials). These will be handled securely and not exposed in plain text.

# Acceptance Criteria

- [ ] A Pulumi project is created that can deploy a GitHub Actions self-hosted runner.
- [ ] The Pulumi project can be successfully deployed to a cloud provider.
- [ ] The deployed runner successfully registers with GitHub.
- [ ] Documentation is provided for deploying and configuring the Pulumi stack.

# Risks & Mitigations

- Risk: Complexity of cloud provider setup → Mitigation: Start with a simple, well-documented cloud provider and instance type.
- Risk: GitHub API rate limits during runner registration → Mitigation: Implement retry mechanisms and exponential backoff for API calls.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.