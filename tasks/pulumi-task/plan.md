# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC for deploying github runner

# Goal & Non-Goals

- Goal: To implement Infrastructure as Code (IaC) using Pulumi for deploying a GitHub Actions self-hosted runner on AWS, ensuring automated, repeatable, and consistent deployment.
- Non-Goals:
    - Implementing the GitHub Actions workflow itself.
    - Managing the applications running on the GitHub runner.
    - Detailed cost optimization beyond basic resource provisioning.
    - Supporting cloud providers other than AWS in this iteration.

# Deliverables

- [ ] A new Pulumi project in `deploy/gh-runner/pulumi/` using TypeScript.
- [ ] Pulumi code to create an AWS S3 bucket for storing the runner's state.
- [ ] Pulumi code to provision an AWS EC2 instance (t3.micro) with an appropriate Amazon Machine Image (AMI) for the runner.
- [ ] A new IAM role and instance profile with the necessary permissions for the EC2 instance.
- [ ] A security group for the EC2 instance, allowing necessary inbound/outbound traffic.
- [ ] A user data script for the EC2 instance to:
    - Install the GitHub Actions runner software.
    - Configure the runner to connect to the `spigell/my-reforge-ai` repository.
    - Start the runner service.
- [ ] Configuration files for the Pulumi program (e.g., `Pulumi.dev.yaml`).
- [ ] Documentation in `deploy/gh-runner/pulumi/README.md` explaining how to set up, deploy, and manage the Pulumi stack.

# Approach

- **Summary:** I will create a new Pulumi project using TypeScript in the `deploy/gh-runner/pulumi` directory. This project will define the AWS resources required for a GitHub Actions runner. I will use the `@pulumi/aws` package. The Pulumi code will provision an EC2 instance, configure its networking and security, and use a user data script to install and configure the GitHub Actions runner. The runner will be registered with the `spigell/my-reforge-ai` repository.
- **Cloud Provider:** AWS
- **Affected paths (target repo):** `deploy/gh-runner/pulumi/` (new directory and files)
- **Interfaces/IO:** Pulumi CLI for deployment, GitHub API for runner registration.
- **Security/Secrets:** The GitHub token for runner registration will be managed as a Pulumi secret. AWS credentials will be handled by Pulumi's standard authentication mechanisms.

# Acceptance Criteria

- [ ] A new Pulumi project is created under `deploy/gh-runner/pulumi`.
- [ ] `pulumi up` successfully deploys a functional GitHub Actions runner in AWS.
- [ ] The deployed runner appears in the "Actions runners" settings of the `spigell/my-reforge-ai` repository and is online.
- [ ] The EC2 instance is of type `t3.micro` and uses an appropriate AMI.
- [ ] The runner can successfully pick up and execute jobs from the repository.
- [ ] `pulumi destroy` successfully and cleanly removes all created resources.
- [ ] The `README.md` file provides clear instructions for deployment.

# Risks & Mitigations

- Risk: Complexity of cloud resource provisioning → Mitigation: Start with a minimal viable runner setup and iterate.
- Risk: GitHub runner registration issues → Mitigation: Thorough testing of the registration process and clear error logging in the user data script.
- Risk: Security of secrets management → Mitigation: Utilize Pulumi's built-in secrets management and follow best practices for credential handling.

# Rollout & Review

- Planning via this PR in tasks repo.
- Implementation will open a new PR in spigell/my-reforge-ai after approval.

# Next Step

- “Move to implementing” once APPROVED in this PR.
