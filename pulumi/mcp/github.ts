import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { K8sApp } from '../common/k8s-app/index.js';
import { McpInspector } from '../common/mcp-inspector/index.js';

export interface GithubMcpServerSecretRef {
  name: pulumi.Input<string>;
  key: pulumi.Input<string>;
}

export interface GithubMcpMonitoringOptions {
  enabled?: boolean;
  portName?: pulumi.Input<string>;
  scrapeInterval?: pulumi.Input<string>;
}

export interface GithubMcpServerArgs {
  namespace: pulumi.Input<string>;
  image: pulumi.Input<string>;
  secret: GithubMcpServerSecretRef;
  port?: number;
  allowOrigins?: string[];
  replicas?: pulumi.Input<number>;
  resources?: pulumi.Input<k8s.types.input.core.v1.ResourceRequirements>;
  command?: string[];
  args?: string[];
  additionalEnv?: k8s.types.input.core.v1.EnvVar[];
  enableInspector?: boolean;
  inspectorImage?: pulumi.Input<string>;
  monitoring?: GithubMcpMonitoringOptions;
}

export class GithubMcpServer extends pulumi.ComponentResource {
  public readonly deployment: k8s.apps.v1.Deployment;
  public readonly service?: k8s.core.v1.Service;
  public readonly podScrape?: k8s.apiextensions.CustomResource;

  constructor(name: string, args: GithubMcpServerArgs, opts?: pulumi.ComponentResourceOptions) {
    super('my-reforge-ai:mcp:GithubMcpServer', name, {}, opts);

    if (args.enableInspector && !args.inspectorImage) {
      throw new pulumi.ResourceError(
        'An inspector image must be provided when enableInspector is true.',
        this,
      );
    }

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
    if (args.enableInspector && args.inspectorImage) {
      const inspector = new McpInspector(
        `${name}-inspector`,
        { image: args.inspectorImage },
        { parent: this },
      );
      sidecars.push(inspector.containerSpec);
    }

    const app = new K8sApp(
      name,
      {
        name,
        namespace: args.namespace,
        image: args.image,
        replicas: args.replicas,
        env,
        command: args.command,
        args: args.args,
        ports: { http: port },
        resources: args.resources,
        sidecars,
      },
      { parent: this },
    );

    this.deployment = app.deployment;
    this.service = app.service;

    const monitoring = {
      enabled: true,
      portName: 'http',
      scrapeInterval: '30s',
      ...(args.monitoring ?? {}),
    };

    if (monitoring.enabled !== false) {
      this.podScrape = new k8s.apiextensions.CustomResource(
        `${name}-scrape`,
        {
          apiVersion: 'operator.victoriametrics.com/v1beta1',
          kind: 'VMPodScrape',
          metadata: {
            name: `${name}-scraper`,
            namespace: args.namespace,
            labels: {
              app: name,
            },
          },
          spec: {
            podMetricsEndpoints: [
              {
                port: monitoring.portName ?? 'http',
                scheme: 'http',
                scrape_interval: monitoring.scrapeInterval ?? '30s',
              },
            ],
            selector: {
              matchLabels: {
                app: name,
              },
            },
          },
        },
        { parent: this },
      );
    }

    this.registerOutputs({
      deploymentName: this.deployment.metadata.name,
      serviceName: this.service?.metadata.name,
      podScrapeName: this.podScrape?.metadata.name,
    });
  }
}
