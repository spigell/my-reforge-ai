# Guide: Importing Complex and Hierarchical Pulumi Resources

Importing a single, simple resource in Pulumi is straightforward. However, importing resources that are children of component resources presents a challenge. This guide explains the correct way to handle these complex imports.

## The Challenge: Parent-Child Relationships

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
