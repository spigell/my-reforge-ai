# Task

- repo: spigell/my-reforge-ai
- kind: feature
- idea: Implement a Pulumi IaC infrastruct for own namespace. Add pulumi mcp server.

# Goal & Non-Goals

- Goal: Create a new Pulumi project to manage the Kubernetes resources for the `my-reforge-ai` namespace, including a deployment for the MCP server.
- Non-Goals:
  - This will not manage other existing Kubernetes resources outside of the `my-reforge-ai` namespace.
  - This will not involve setting up the CI/CD pipeline for Pulumi.
  - This will not include creating the Docker image for the mcp-server.

# Progress

- A new Pulumi project has been created in `spigell/my-reforge-ai/pulumi/`.
- The project is configured to use TypeScript and the Google Cloud Storage backend.
- Pulumi code for deploying the `mcp-server` has been implemented. This includes a reusable component for creating the deployment, service, and monitoring resources.
- The main Pulumi program in `index.ts` deploys the GitHub MCP server.
- A `README.md` file has been created to document the Pulumi project.

# Deliverables

- [x] A new Pulumi project in `spigell/my-reforge-ai/pulumi/`.
- [x] Pulumi code for the `my-reforge-ai` namespace. Namespace is already created.
- [x] Pulumi code for the `mcp-server` deployment and service within the namespace.
- [x] A `README.md` in the `pulumi/` directory explaining how to use the Pulumi project.

# Rigorous Improvement Plan

A complete refactoring is necessary. The goal is to create a set of reusable, single-responsibility components that can be composed to build complex deployments. The final architecture will be based on the following components:

### 1. Create a Generic `K8sApp` Component

-   **File:** `common/k8s-app/index.ts`
-   **Description:** To reflect that this component's purpose is to deploy applications to Kubernetes, we will name it `K8sApp`. It will be implemented as a class that extends `pulumi.ComponentResource` and serves as the fundamental, language-agnostic building block for any service.
-   **Inputs (`K8sAppArgs`):**
    -   `name`: The name of the application.
    -   `namespace`: The Kubernetes namespace.
    -   `image`: The container image to deploy.
    -   `command`: The command to run in the container.
    -   `args`: The arguments to the command.
    -   `env`: Environment variables, ideally sourced from secrets.
    -   `ports`: A map of ports to expose.
    -   `resources`: Resource requests and limits.
    -   `livenessProbe`, `readinessProbe`: Health check configurations.
    -   `sidecars`: An optional array of `k8s.core.v1.Container` objects for sidecars.
    -   `dependsOn`: Optional dependencies.
-   **Outputs:**
    -   `deployment`: The created Kubernetes Deployment.
    -   `service`: The created Kubernetes Service.

### 2. Create a Dedicated `McpInspector` Component

-   **File:** `common/mcp-inspector/index.ts`
-   **Description:** This component, implemented as a class `McpInspector` that extends `pulumi.ComponentResource`, has the sole responsibility of defining the container for the `mcp-inspector` sidecar.
-   **Inputs (`McpInspectorArgs`):**
    -   `image`: The inspector's container image and tag.
-   **Outputs:**
    -   `containerSpec`: The fully-defined `k8s.core.v1.Container` object for the sidecar.

### 3. Compose Specific Application Classes

-   **File:** `mcp/mcp-github.ts` (and others like `mcp/mcp-pulumi.ts`)
-   **Description:** Specific applications, like `GithubMcpServer`, will be defined as higher-level classes that extend `pulumi.ComponentResource`. They will not create Kubernetes resources directly but will instead orchestrate the `K8sApp` and other components.
-   **Logic for `GithubMcpServer`:**
    -   It will know the specific configuration for the GitHub MCP server (e.g., its Node.js image, commands, and which secrets to use).
    -   It will contain a toggle, such as `enableInspector`. If true, it will instantiate the `McpInspector` component.
    -   It will then instantiate the `K8sApp` component, passing in all the specific application configuration (env vars from secrets, the inspector sidecar, etc.).

### 4. Eliminate Runtime Initialization

-   **The `initCommand` must be removed entirely.**
-   **The only acceptable solution is to build dedicated Docker images** for each application (e.g., `github-mcp-server`, `pulumi-mcp-server`). For example, `ghcr.io/spigell/github-mcp-server:0.18.0-1b59f5` was built with `mcp-proxy` already.

### 5. Use Pulumi Config for All Configuration

-   All configuration values (image tags, resource limits, secret names) must be moved to `Pulumi.<stack>.yaml` files.

By implementing this plan, we will have a robust, compositional, and professional IaC codebase that is both reusable and easily extensible for any type of application, regardless of the language it's written in.

# Approach

- Affected paths (target repo): `pulumi/`, `deploy/mcp/github-server.yaml` (for reference), use `common/k8s-app` directory with the module.
- Interfaces/IO: The Pulumi project will be managed via the Pulumi CLI. It will require a `PULUMI_ACCESS_TOKEN` environment variable.

# Acceptance Criteria

- [ ] The Pulumi project can be successfully previewed (`pulumi preview`).
- [ ] The Pulumi project can be successfully deployed (`pulumi up`).
- [ ] The `my-reforge-ai` namespace is created in the Kubernetes cluster.
- [ ] The `mcp-server` deployment and service are created in the `my-reforge-ai` namespace.

# Risks & Mitigations

- Risk: The existing Kubernetes manifests in `deploy/` might conflict with the new Pulumi-managed resources. → Mitigation: The existing YAML files will be reviewed and removed after the Pulumi stack is successfully deployed and verified.

# Rollout & Review

- Planning via this PR in the tasks repo.
- Implementation will open a new PR in `spigell/my-reforge-ai` after approval.

# Kubernetes Authorization

To allow Pulumi to manage resources in the Kubernetes cluster, we will use a dedicated Service Account. This provides a secure way to grant Pulumi the necessary permissions without using a personal user account.

## Implementation Steps

1.  **Create a Service Account:**
    A `ServiceAccount` will be created in the `my-reforge-ai` namespace. This account will be used by Pulumi to interact with the Kubernetes API.

    '''yaml
    apiVersion: v1
    kind: ServiceAccount
    metadata:
      name: pulumi-service-account
      namespace: my-reforge-ai
    '''

2.  **Create a Role and RoleBinding:**
    A `Role` will be created with permissions to manage resources within the `my-reforge-ai` namespace. Then, a `RoleBinding` will be created to grant the `pulumi-service-account` the permissions defined in the `Role`.

    '''yaml
    apiVersion: rbac.authorization.k8s.io/v1
    kind: Role
    metadata:
      name: pulumi-role
      namespace: my-reforge-ai
    rules:
    - apiGroups: ["", "apps", "extensions"]
      resources: ["*"]
      verbs: ["*"]
    ---
    apiVersion: rbac.authorization.k8s.io/v1
    kind: RoleBinding
    metadata:
      name: pulumi-role-binding
      namespace: my-reforge-ai
    subjects:
    - kind: ServiceAccount
      name: pulumi-service-account
      namespace: my-reforge-ai
    roleRef:
      kind: Role
      name: pulumi-role
      apiGroup: rbac.authorization.k8s.io
    '''

3.  **Configure Pulumi Kubernetes Provider:**
    The Pulumi Kubernetes provider will be configured to use the `pulumi-service-account`. This will be done by setting the `kubeconfig` provider option to a kubeconfig file generated from the service account's token.

### Generating Kubeconfig In-Cluster

When running inside a Kubernetes pod, a kubeconfig file can be generated dynamically by an init container. This allows the application (in this case, Pulumi) to authenticate to the Kubernetes API using the pod's service account.

Here is an example of a Pod that uses an init container to create a kubeconfig file:

'''yaml
apiVersion: v1
kind: Pod
metadata:
  name: demo
spec:
  serviceAccountName: my-sa
  automountServiceAccountToken: true
  volumes:
    - name: kube
      emptyDir: {}
  initContainers:
    - name: make-kubeconfig
      image: bitnami/kubectl:1.31
      command: ["/bin/sh","-c"]
      args:
        - |
          SA_DIR=/var/run/secrets/kubernetes.io/serviceaccount
          NS=$(cat $SA_DIR/namespace)
          cat > /work/kubeconfig <<EOF
          apiVersion: v1
          kind: Config
          clusters:
          - name: in-cluster
            cluster:
              server: https://kubernetes.default.svc
              certificate-authority: ${SA_DIR}/ca.crt
          users:
          - name: sa
            user:
              tokenFile: ${SA_DIR}/token
          contexts:
          - name: in-cluster
            context:
              cluster: in-cluster
              namespace: ${NS}
              user: sa
          current-context: in-cluster
          EOF
      volumeMounts:
        - name: kube
          mountPath: /work
  containers:
    - name: app
      image: alpine:3.20
      env:
        - name: KUBECONFIG
          value: /work/kubeconfig
      volumeMounts:
        - name: kube
          mountPath: /work
      command: ["sh","-lc","apk add --no-cache curl && sleep 3600"]
'''

In this example:
- The `initContainer` named `make-kubeconfig` runs before the main application container.
- It reads the service account's namespace, token, and the cluster's CA certificate from the mounted service account directory (`/var/run/secrets/kubernetes.io/serviceaccount`).
- It then constructs a kubeconfig file and writes it to a shared volume (`/work/kubeconfig`).
- The main container (`app`) can then use this generated kubeconfig file by setting the `KUBECONFIG` environment variable.

This method is useful when deploying Pulumi as a Kubernetes job or pod.