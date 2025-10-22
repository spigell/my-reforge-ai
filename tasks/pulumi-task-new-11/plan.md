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
- Detailed Approach:
    - **Project Structure**: A new directory `pulumi/github-runner/` will house the Pulumi project. This will include `index.ts` for resource definitions, `Pulumi.yaml` for project settings, and `Pulumi.<stack-name>.yaml` for stack-specific configurations.
    - **Resource Definition**: The `index.ts` will define the necessary cloud resources. This will likely involve:
        - A virtual machine instance (e.g., Google Compute Engine instance) to host the runner.
        - Networking components (VPC, subnets, firewall rules) to secure and enable communication for the runner.
        - Storage for runner logs and temporary files.
        - Integration with GCP Secret Manager for sensitive data.
    - **Runner Installation**: The VM instance will be configured to automatically install and register the GitHub Actions runner agent upon startup. This will involve a startup script that fetches the runner application, configures it, and registers it with the target GitHub repository.
    - **Secrets Management**: The GitHub Personal Access Token (PAT) required for runner registration will be stored in GCP Secret Manager and securely accessed by the Pulumi program during deployment and by the VM's startup script.
    - **Configuration**: Pulumi configuration will be used to manage environment-specific settings, such as the GitHub repository URL, runner labels, and GCP project/zone.
- Environment Considerations: The GitHub Actions runner will be deployed to a Talos cluster.
- Affected paths (target repo): `pulumi/github-runner/` (new directory), `package.json`, `tsconfig.json` (potentially for Pulumi setup).
- Interfaces/IO: Pulumi CLI for deployment, GitHub API for runner registration.
- Security/Secrets: GitHub Personal Access Token (PAT) for runner registration will be managed securely via GCP Secret Manager.
- References: The deployment configurations in `deploy/gh-runner/deployment.yaml` and `deploy/workbench/user-bootstrap.sh` will serve as architectural references for setting up the GitHub Actions runner environment.

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