# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: To implement a Pulumi Infrastructure as Code (IaC) solution for deploying a GitHub Actions self-hosted runner, enabling automated and scalable deployment of CI/CD infrastructure.
- Non-Goals:
    - Implementing the GitHub Actions workflow itself.
    - Managing the lifecycle of the applications deployed by the runner.
    - Supporting other CI/CD platforms.

# Deliverables

- [ ] Pulumi program (TypeScript) for deploying a GitHub runner (e.g., EC2 instance, Docker container, Kubernetes pod).
- [ ] Configuration files for the Pulumi program (e.g., `Pulumi.yaml`, `Pulumi.<stack-name>.yaml`).
- [ ] Instructions on how to deploy and manage the runner using Pulumi.
- [ ] Basic tests or validation steps for the deployed runner.

# Approach

- Summary: Develop a Pulumi program in TypeScript to define and deploy the necessary cloud resources for a GitHub self-hosted runner. This will involve selecting a cloud provider (e.g., AWS, Azure, GCP) and defining resources such as compute instances, networking, and any required secrets management.
- Affected paths (target repo): `src/libs/github-runner-iac/` (new directory), `README.md` (update with instructions).
- Interfaces/IO: Pulumi CLI, GitHub API (for runner registration), cloud provider APIs.
- Security/Secrets: GitHub Personal Access Token (PAT) for runner registration, cloud provider credentials. These will be managed securely using Pulumi secrets or environment variables.

# Acceptance Criteria

- [ ] A Pulumi program successfully deploys a GitHub self-hosted runner.
- [ ] The deployed runner successfully registers with GitHub.
- [ ] The runner can execute a simple GitHub Actions workflow.
- [ ] The Pulumi program is well-documented and easy to understand.

# Risks & Mitigations

- Risk: Complexity of cloud provider setup → Mitigation: Start with a simple deployment (e.g., single EC2 instance) and iterate.
- Risk: Secure management of secrets (GitHub PAT, cloud credentials) → Mitigation: Utilize Pulumi's built-in secret management and environment variables.
- Risk: Runner registration issues → Mitigation: Thorough testing and clear error logging.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.
