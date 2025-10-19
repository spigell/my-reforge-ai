# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: Create a Pulumi Infrastructure as Code (IaC) project to deploy a GitHub Actions self-hosted runner.
- Non-Goals:
  - Implementing the GitHub Actions workflow itself.
  - Configuring the runner beyond basic deployment.
  - Managing secrets for the runner (e.g., GitHub PAT).

# Deliverables

- [ ] Pulumi project directory (`pulumi-github-runner/`) with `index.ts`, `Pulumi.yaml`, `package.json`.
- [ ] TypeScript code for deploying a GitHub Actions runner (e.g., EC2 instance, Docker container, Kubernetes pod).
- [ ] Basic tests or validation for the Pulumi stack.

# Approach

- Summary: Use Pulumi with TypeScript to define the infrastructure for a GitHub Actions runner. This will involve selecting a cloud provider (e.g., AWS, Azure, GCP) and provisioning the necessary resources (e.g., VM, container service) to host the runner.
- Affected paths (target repo): `pulumi-github-runner/` (new directory)
- Interfaces/IO: Pulumi CLI, cloud provider APIs.
- Security/Secrets: Pulumi secrets for sensitive configuration (e.g., GitHub token for runner registration).

# Acceptance Criteria

- [ ] Pulumi project successfully deploys a GitHub Actions runner.
- [ ] The deployed runner registers successfully with GitHub.
- [ ] The Pulumi stack can be updated and destroyed without issues.

# Risks & Mitigations

- Risk: Complexity of cloud provider setup → Mitigation: Start with a simple deployment (e.g., single EC2 instance) and iterate.
- Risk: GitHub runner registration issues → Mitigation: Thorough testing and logging during deployment.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.
