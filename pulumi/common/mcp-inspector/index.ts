import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';

export interface McpInspectorArgs {
  image: pulumi.Input<string>;
}

export class McpInspector extends pulumi.ComponentResource {
  public readonly containerSpec: k8s.types.input.core.v1.Container;

  constructor(name: string, args: McpInspectorArgs, opts?: pulumi.ComponentResourceOptions) {
    super('my-reforge-ai:common:McpInspector', name, {}, opts);

    this.containerSpec = {
      name: 'mcp-inspector',
      image: args.image,
      imagePullPolicy: 'IfNotPresent',
    };

    this.registerOutputs({
      containerSpec: this.containerSpec,
    });
  }
}
