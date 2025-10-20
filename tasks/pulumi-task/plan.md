# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: To implement Infrastructure as Code (IaC) using Pulumi for deploying a GitHub Actions self-hosted runner on a bare-metal Talos Kubernetes cluster, ensuring automated, repeatable, and consistent deployment.
- Non-Goals:
    - Implementing the GitHub Actions workflow itself.
    - Managing the applications running on the GitHub runner.
    - Managing the Talos Kubernetes cluster itself.
    - Supporting cloud providers other than the existing Kubernetes cluster.

# Deliverables

- [ ] A new Pulumi project in `deploy/gh-runner/pulumi/` using TypeScript.
- [ ] Pulumi code to create a Kubernetes Namespace for the runner.
- [ ] Pulumi code to create a Kubernetes Deployment for the GitHub Actions runner.
- [ ] Pulumi code to create a Kubernetes Secret to store the GitHub runner registration token.
- [ ] A `Dockerfile` for the runner image, if a custom image is needed.
- [ ] Configuration files for the Pulumi program (e.g., `Pulumi.dev.yaml`).
- [ ] Documentation in `deploy/gh-runner/pulumi/README.md` explaining how to set up, deploy, and manage the Pulumi stack.

# Approach

- **Summary:** I will create a new Pulumi project using TypeScript in the `deploy/gh-runner/pulumi` directory. This project will define the Kubernetes resources required for a GitHub Actions runner. I will use the `@pulumi/kubernetes` package. The Pulumi code will create a Deployment to run the runner, a Secret to hold the GitHub registration token, and other necessary resources. The runner will be registered with the `spigell/my-reforge-ai` repository. The runner will be deployed as a pod in a dedicated namespace. The runner image will be based on the official GitHub runner image, with any necessary customizations applied via a `Dockerfile`. The registration token will be fetched from the GitHub API and stored securely as a Kubernetes secret.
- **Platform:** Bare-metal Talos Kubernetes cluster
- **Affected paths (target repo):** `deploy/gh-runner/pulumi/` (new directory and files)
- **Interfaces/IO:** Pulumi CLI for deployment, GitHub API for runner registration.
- **Security/Secrets:** The GitHub token for runner registration will be managed as a Kubernetes secret, which in turn will be managed as a Pulumi secret.

# Acceptance Criteria

- [ ] A new Pulumi project is created under `deploy/gh-runner/pulumi`.
- [ ] `pulumi up` successfully deploys a functional GitHub Actions runner in the Talos Kubernetes cluster.
- [ ] The deployed runner appears in the "Actions runners" settings of the `spigell/my-reforge-ai` repository and is online.
- [ ] The runner can successfully pick up and execute jobs from the repository.
- [ ] `pulumi destroy` successfully and cleanly removes all created resources.
- [ ] The `README.md` file provides clear instructions for deployment.

# Risks & Mitigations

- Risk: Complexity of Kubernetes resource configuration → Mitigation: Start with a minimal viable runner setup and iterate.
- Risk: GitHub runner registration issues → Mitigation: Thorough testing of the registration process and clear error logging in the runner pod.
- Risk: Security of secrets management → Mitigation: Utilize Pulumi's built-in secrets management and Kubernetes secrets.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.
