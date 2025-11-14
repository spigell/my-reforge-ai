import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { K8sApp } from '../common/k8s-app/index.js';
import { McpInspector } from './mcp-inspector.js';
import { McpServerArgs, McpServerSecretRef } from './types.js';
import { createMcpPodScrape } from './monitoring.js';
import { DEFAULT_INSPECTOR_IMAGE } from './constants.js';

export type GithubMcpServerArgs = McpServerArgs & {
  secret: McpServerSecretRef;
};

export class GithubMcpServer extends pulumi.ComponentResource {
  public readonly deployment: k8s.apps.v1.Deployment;
  public readonly service?: k8s.core.v1.Service;
  public readonly podScrape?: k8s.apiextensions.CustomResource;

  constructor(name: string, args: GithubMcpServerArgs, opts?: pulumi.ComponentResourceOptions) {
    super('my-reforge-ai:mcp:GithubMcpServer', name, {}, opts);

    const port = args.port ?? 8080;
    const env: k8s.types.input.core.v1.EnvVar[] = [
      {
        name: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        valueFrom: {
          secretKeyRef: {
            name: args.secret.name,
            key: args.secret.key,
          },
        },
      },
    ];

    if (args.allowOrigins && args.allowOrigins.length > 0) {
      env.push({
        name: 'MCP_PROXY_ALLOW_ORIGINS',
        value: args.allowOrigins.join(','),
      });
    }

    if (args.additionalEnv) {
      env.push(...args.additionalEnv);
    }

    const sidecars: k8s.types.input.core.v1.Container[] = [];
    const volumes: k8s.types.input.core.v1.Volume[] = [...(args.volumes ?? [])];
    const inspectorImage = args.inspectorImage ?? DEFAULT_INSPECTOR_IMAGE;
    if (args.enableInspector) {
      const inspector = new McpInspector({
        image: inspectorImage,
        serverUrl: pulumi.interpolate`http://localhost:${port}/mcp`,
        transport: 'streamable-http',
      });
      sidecars.push(inspector.containerSpec);
    }

    const selectorLabels = {
      app: name,
      ...(args.labels ?? {}),
    };

    const volumeMounts: k8s.types.input.core.v1.VolumeMount[] = [...(args.volumeMounts ?? [])];
    const initContainers: k8s.types.input.core.v1.Container[] = [...(args.initContainers ?? [])];

    const app = new K8sApp(
      name,
      {
        name,
        namespace: args.namespace,
        image: args.image,
        labels: args.labels,
        replicas: args.replicas,
        env,
        command: args.command,
        args: args.args,
        ports: { http: port },
        resources: args.resources,
        sidecars,
        serviceAccountName: args.serviceAccountName,
        initContainers,
        automountServiceAccountToken: args.automountServiceAccountToken,
        volumes,
        volumeMounts,
      },
      { parent: this },
    );

    this.deployment = app.deployment;
    this.service = app.service;

    this.podScrape = createMcpPodScrape(
      {
        name,
        namespace: args.namespace,
        labels: selectorLabels,
        monitoring: args.monitoring,
      },
      { parent: this },
    );

    this.registerOutputs({
      deploymentName: this.deployment.metadata.name,
      serviceName: this.service?.metadata.name,
      podScrapeName: this.podScrape?.metadata.name,
    });
  }
}
