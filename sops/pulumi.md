# Pulumi Guide

## Configuration

- Always run Pulumi commands from the `pulumi/` directory so stack config lands in the correct workspace.
- Config keys omit the project prefix. Set values like `namespace`, `githubMcp`, and `pulumiMcp` directly (avoid `my-reforge-ai:`).
- Both MCP servers load their settings using `config.getObject('githubMcp')` / `config.getObject('pulumiMcp')`. Each stack must define a structured object as shown below; if missing or `enabled: false`, that server is skipped entirely.
- Identity outputs come from `organization/my-identity/<project>` and must expose an `output` object with `gcp-secret-key-name` and `pulumi-account-name`.
- Do **not** include a `value` wrapper in stack YAML. The Pulumi program ignores any field literally named `value`, so define objects directly under `githubMcp` / `pulumiMcp`.
- To run MCP pods under an existing Kubernetes Service Account, set `serviceAccountName` on the respective config block; the Pulumi components will attach it to the Deployment template.
- Persistent storage for shared code can be toggled per app via `sharedCodeMount`. When `enabled`, Pulumi will provision a hostPath `PersistentVolume` + `PersistentVolumeClaim` pair and mount it into the pod at `mountPath` (default `/project`). Supply `hostPath`, `nodeHostname`, and optional size overrides.

Example `Pulumi.<stack>.yaml` snippet (notice there is **no** `value` wrapper anywhere):

```yaml
config:
  namespace: my-reforge-ai
  githubMcp:
    enabled: true
    image: ghcr.io/spigell/github-mcp-server:0.18.0-1b59f5
    port: 8080
    allowOrigins:
      - '*'
    replicas: 1
    resources:
      limits:
        cpu: '1'
        memory: 1Gi
      requests:
        cpu: 100m
        memory: 256Mi
    enableInspector: false
    monitoring:
      enabled: true
      portName: http
      scrapeInterval: 30s
    secret:
      name: github-mcp-credentials
      key: github-pat
  pulumiMcp:
    enabled: true
    image: ghcr.io/spigell/pulumi-talos-cluster-workbench:3.200.0-54d6cd
    command:
      - pulumi-mcp-server
      - http
    serviceAccountName: pulumi-mcp-sa
    sharedCodeMount:
      enabled: true
      hostPath: /var/local-path-provisioner/pulumi-shared-code
      nodeHostname: master-1
      storageSize: 5Gi
      claimSize: 1Gi
      mountPath: /project
    port: 3000
    allowOrigins:
      - '*'
    replicas: 1
    resources:
      limits:
        cpu: '1'
        memory: 1Gi
      requests:
        cpu: 100m
        memory: 256Mi
    enableInspector: false
    monitoring:
      enabled: true
      portName: http
      scrapeInterval: 30s
    accessTokenSecret:
      name: pulumi-mcp-credentials
      key: pulumi-access-token
```

## Importing Component Resources

Importing a single, simple resource in Pulumi is straightforward. However, importing resources that are children of component resources presents a challenge. This guide explains the correct way to handle these complex imports.

### The Challenge: Parent-Child Relationships

When a resource is created within a Pulumi Component Resource, it establishes a parent-child relationship. The child resource's true name in the Pulumi state is a combination of its parent's name and its own name (e.g., `parent-name$child-name`). To import such a resource, you must correctly specify this hierarchy.

## Method 1: Bulk Import with a JSON File (The Recommended Way)

A more robust and readable method is to use a JSON file with the `pulumi import --file` command. This allows you to define the hierarchy explicitly.

### JSON Schema Explained

You create a JSON file with a `resources` array. Each object in the array represents a resource (either a real resource to import or a logical component to act as a parent).

Key properties:
*   `name`: A **temporary, unique identifier** for the resource *within the JSON file*. This is used to link parents and children.
*   `logicalName`: The **actual name** the resource will have in your Pulumi code.
*   `type`: The Pulumi type token of the resource (e.g., `kubernetes:core/v1:Namespace`).
*   `parent`: The `name` of the parent resource from this same file. This creates the link.
*   `id`: The real-world ID of the resource you are importing (e.g., the Kubernetes namespace name).
*   `component: true`: Specifies that this resource is a logical grouping (a Component Resource) and not a physical resource to import. An `id` should not be provided for components.

### Example: Importing a Nested Kubernetes Namespace

Consider a `ReforgeAiNamespace` component that contains a `Namespace` component, which in turn creates a `kubernetes:core/v1:Namespace`.

Here is the correct `import.json` to import only the final, real namespace:

```json
{
  "resources": [
    {
      "name": "reforge-ai-component",
      "logicalName": "my-reforge-ai",
      "type": "my-cloud-identity:k8s:ReforgeAiNamespace",
      "component": true
    },
    {
      "name": "namespace-component",
      "logicalName": "my-reforge-ai",
      "type": "my-cloud-identity:k8s:Namespace",
      "parent": "reforge-ai-component",
      "component": true
    },
    {
      "name": "actual-namespace-resource",
      "logicalName": "my-reforge-ai",
      "type": "kubernetes:core/v1:Namespace",
      "parent": "namespace-component",
      "id": "my-reforge-ai"
    }
  ]
}
```

### How to Use

1.  Create the JSON file (e.g., `import.json`).
2.  Run the import command:
    ```bash
    pulumi import --file import.json
    ```
3.  Pulumi will print the generated code for your program. Copy this into your project.

## Conclusion

For any import involving component resources, using the JSON file method with the `parent` and `logicalName` properties is the recommended best practice. It avoids the "ambiguous parent" error and makes the relationships clear and maintainable.
