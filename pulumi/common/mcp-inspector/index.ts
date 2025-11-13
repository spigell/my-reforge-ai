import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';

export type McpInspectorArgs = {
  image: pulumi.Input<string>;
  securityContext?: k8s.types.input.core.v1.SecurityContext;
};

export class McpInspector extends pulumi.ComponentResource {
  public readonly containerSpec: k8s.types.input.core.v1.Container;

  constructor(name: string, args: McpInspectorArgs, opts?: pulumi.ComponentResourceOptions) {
    super('my-reforge-ai:common:McpInspector', name, {}, opts);

    const defaultSecurityContext: k8s.types.input.core.v1.SecurityContext = {
      allowPrivilegeEscalation: false,
      capabilities: {
        drop: ['ALL'],
      },
      seccompProfile: {
        type: 'RuntimeDefault',
      },
    };

    this.containerSpec = {
      name: 'mcp-inspector',
      image: args.image,
      imagePullPolicy: 'IfNotPresent',
      securityContext: args.securityContext ?? defaultSecurityContext,
    };

    this.registerOutputs({
      containerSpec: this.containerSpec,
    });
  }
}
