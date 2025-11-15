import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';

export type McpInspectorArgs = {
  image: pulumi.Input<string>;
  serverUrl: pulumi.Input<string>;
  transport?: pulumi.Input<'stdio' | 'sse' | 'streamable-http'>;
};

export class McpInspector {
  readonly containerSpec: k8s.types.input.core.v1.Container;

  constructor(args: McpInspectorArgs) {
    this.containerSpec = {
      name: 'mcp-inspector',
      image: args.image,
      imagePullPolicy: 'IfNotPresent',
      args: [
        '--',
        '--transport',
        args.transport ?? 'streamable-http',
        '--server-url',
        args.serverUrl,
      ],
      securityContext: {
        allowPrivilegeEscalation: false,
        capabilities: {
          drop: ['ALL'],
        },
        seccompProfile: {
          type: 'RuntimeDefault',
        },
        runAsNonRoot: true,
      },
    };
  }
}
