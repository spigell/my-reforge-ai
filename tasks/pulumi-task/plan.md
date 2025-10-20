# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: To implement Infrastructure as Code (IaC) using Pulumi for deploying a GitHub Actions self-hosted runner, ensuring automated and consistent deployment.
- Non-Goals:
    - Implementing the GitHub Actions workflow itself.
    - Managing the applications running on the GitHub runner.
    - Detailed cost optimization beyond basic resource provisioning.

# Deliverables

- [ ] Pulumi project structure for the GitHub runner deployment (main.go, Pulumi.yaml, etc.)
- [ ] Pulumi code to provision necessary cloud resources (e.g., VM, networking, security groups) for a GitHub runner.
- [ ] Configuration for the GitHub runner to register with the `spigell/my-reforge-ai` repository.
- [ ] Documentation on how to deploy and manage the Pulumi stack.

# Approach

- Summary: I will create a new Pulumi project in Go within the `deploy/gh-runner/pulumi` directory. This project will define the cloud resources required for a GitHub Actions runner. The Pulumi code will provision a virtual machine, configure its networking, and install the GitHub Actions runner software, registering it with the target repository.
- Affected paths (target repo): `deploy/gh-runner/pulumi/` (new directory and files)
- Interfaces/IO: Pulumi CLI for deployment, GitHub API for runner registration.
- Security/Secrets: GitHub token for runner registration will be managed as a Pulumi secret. Cloud provider credentials will be handled by Pulumi's standard authentication mechanisms (e.g., environment variables, cloud provider CLI configuration).

# Acceptance Criteria

- [ ] A new Pulumi project is created under `deploy/gh-runner/pulumi`.
- [ ] The Pulumi project successfully deploys a functional GitHub Actions runner.
- [ ] The deployed runner registers itself with the `spigell/my-reforge-ai` repository.
- [ ] The Pulumi stack can be updated and destroyed cleanly.

# Risks & Mitigations

- Risk: Complexity of cloud resource provisioning → Mitigation: Start with a minimal viable runner setup and iterate.
- Risk: GitHub runner registration issues → Mitigation: Thorough testing of the registration process and clear error logging.
- Risk: Security of secrets management → Mitigation: Utilize Pulumi's built-in secrets management and follow best practices for credential handling.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.