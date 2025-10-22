# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: To implement Infrastructure as Code (IaC) using Pulumi for deploying a GitHub Actions self-hosted runner.
- Non-Goals:
    - Implementing the GitHub Actions workflow itself.
    - Managing the lifecycle of the runner beyond initial deployment.
    - Supporting multiple cloud providers in this initial implementation.

# Deliverables

- [ ] Pulumi project with necessary configuration files.
- [ ] TypeScript code defining the GitHub Actions runner infrastructure.
- [ ] Instructions for deploying and managing the Pulumi stack.
- [ ] Basic tests for the Pulumi infrastructure (if applicable).

# Approach

- Summary: I will create a new Pulumi project within the `my-reforge-ai` repository, likely under a new `pulumi/` directory. This project will define the resources required for a GitHub Actions runner, such as a virtual machine, necessary networking, and any required secrets management. The implementation will use TypeScript.
- Environment Considerations: The GitHub Actions runner will be deployed to a Talos cluster.
- Affected paths (target repo): `pulumi/github-runner/` (new directory), `package.json`, `tsconfig.json` (potentially for Pulumi setup).
- Interfaces/IO: Pulumi CLI for deployment, GitHub API for runner registration.
- Security/Secrets: GitHub Personal Access Token (PAT) for runner registration will be managed securely via GCP Secret Manager.

# Acceptance Criteria

- [ ] A Pulumi project is successfully created and configured.
- [ ] The Pulumi code deploys a functional GitHub Actions self-hosted runner.
- [ ] The runner successfully registers with GitHub and is available for jobs.
- [ ] The Pulumi stack can be updated and destroyed cleanly.

# Risks & Mitigations

- Risk: Complexity of Pulumi setup and integration with GitHub. → Mitigation: Start with a minimal viable runner and iterate. Leverage existing Pulumi examples for GitHub runners.
- Risk: Secure management of GitHub PAT. → Mitigation: Use GCP Secret Manager for PAT.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.