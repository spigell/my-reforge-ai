import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';

export interface McpServerMonitoringOptions {
  enabled?: boolean;
  /**
   * Name of the container port to scrape. Defaults to 'http'.
   */
  portName?: pulumi.Input<string>;
  /**
   * Scrape interval for VictoriaMetrics operator. Defaults to '30s'.
   */
  scrapeInterval?: pulumi.Input<string>;
}

export interface McpServerServiceOptions {
  enabled?: boolean;
  /**
   * Service name. Defaults to the deployment name.
   */
  name?: pulumi.Input<string>;
  /**
   * Exposed port on the service. Defaults to 8080.
   */
  port?: pulumi.Input<number>;
  /**
   * Target port on the container. Defaults to the same value as `port`.
   */
  targetPort?: pulumi.Input<number | string>;
  /**
   * Service type. Defaults to ClusterIP.
   */
  type?: pulumi.Input<'ClusterIP' | 'NodePort' | 'LoadBalancer'>;
}

export interface McpServerProxyContainerArgs {
  name?: pulumi.Input<string>;
  image: pulumi.Input<string>;
  imagePullPolicy?: pulumi.Input<'Always' | 'IfNotPresent' | 'Never'>;
  env?: pulumi.Input<pulumi.Input<k8s.types.input.core.v1.EnvVar>[]>;
  command?: pulumi.Input<pulumi.Input<string>[]>;
  args?: pulumi.Input<pulumi.Input<string>[]>;
  ports?: pulumi.Input<pulumi.Input<k8s.types.input.core.v1.ContainerPort>[]>;
  resources?: pulumi.Input<k8s.types.input.core.v1.ResourceRequirements>;
  readinessProbe?: pulumi.Input<k8s.types.input.core.v1.Probe>;
  livenessProbe?: pulumi.Input<k8s.types.input.core.v1.Probe>;
  volumeMounts?: pulumi.Input<
    pulumi.Input<k8s.types.input.core.v1.VolumeMount>[]>;
}

export interface McpServerDeploymentArgs {
  name: string;
  namespace: pulumi.Input<string>;
  replicas?: pulumi.Input<number>;
  labels?: Record<string, pulumi.Input<string>>;
  automountServiceAccountToken?: pulumi.Input<boolean>;
  initContainers?: pulumi.Input<
    pulumi.Input<k8s.types.input.core.v1.Container>[]
  >;
  volumes?: pulumi.Input<pulumi.Input<k8s.types.input.core.v1.Volume>[]>;
  proxyContainer: McpServerProxyContainerArgs;
  monitoring?: McpServerMonitoringOptions;
  service?: McpServerServiceOptions;
}

export interface McpServerDeploymentOpts {
  deploymentOpts?: pulumi.CustomResourceOptions;
  serviceOpts?: pulumi.CustomResourceOptions;
  monitoringOpts?: pulumi.CustomResourceOptions;
}

export class McpServerDeployment {
  public readonly deployment: k8s.apps.v1.Deployment;
  public readonly service?: k8s.core.v1.Service;
  public readonly podScrape?: k8s.apiextensions.CustomResource;
  private static mergeDepends(
    existing: pulumi.CustomResourceOptions['dependsOn'],
    additional: pulumi.Resource[],
  ): pulumi.CustomResourceOptions['dependsOn'] {
    const merged: pulumi.Input<pulumi.Resource>[] = [];

    if (existing) {
      if (Array.isArray(existing)) {
        merged.push(...existing);
      } else {
        merged.push(existing);
      }
    }

    merged.push(...additional);

    if (merged.length === 0) {
      return undefined;
    }
    if (merged.length === 1) {
      return merged[0];
    }
    return merged;
  }

  constructor(
    args: McpServerDeploymentArgs,
    opts: McpServerDeploymentOpts = {},
  ) {
    const labels = {
      app: args.name,
      ...(args.labels ?? {}),
    };

    const replicas = args.replicas ?? 1;
    const automountServiceAccountToken =
      args.automountServiceAccountToken ?? false;

    const defaultPort: k8s.types.input.core.v1.ContainerPort = {
      containerPort: 8080,
      name: 'http',
    };

    this.deployment = new k8s.apps.v1.Deployment(
      args.name,
      {
        metadata: {
          name: args.name,
          namespace: args.namespace,
          labels,
        },
        spec: {
          replicas,
          selector: {
            matchLabels: labels,
          },
          template: {
            metadata: {
              labels,
            },
            spec: {
              automountServiceAccountToken,
              initContainers: args.initContainers,
              volumes: args.volumes,
              containers: [
                {
                  name: args.proxyContainer.name ?? 'proxy',
                  image: args.proxyContainer.image,
                  imagePullPolicy: args.proxyContainer.imagePullPolicy ?? 'IfNotPresent',
                  env: args.proxyContainer.env,
                  command: args.proxyContainer.command,
                  args: args.proxyContainer.args,
                  ports:
                    args.proxyContainer.ports ??
                    ([defaultPort] as pulumi.Input<
                      pulumi.Input<k8s.types.input.core.v1.ContainerPort>[]
                    >),
                  resources:
                    args.proxyContainer.resources ??
                    ({
                      requests: { cpu: '100m', memory: '256Mi' },
                      limits: { cpu: '1', memory: '1Gi' },
                    } satisfies k8s.types.input.core.v1.ResourceRequirements),
                  readinessProbe:
                    args.proxyContainer.readinessProbe ??
                    ({
                      tcpSocket: { port: 'http' },
                      periodSeconds: 10,
                    } satisfies k8s.types.input.core.v1.Probe),
                  livenessProbe:
                    args.proxyContainer.livenessProbe ??
                    ({
                      tcpSocket: { port: 'http' },
                      periodSeconds: 30,
                    } satisfies k8s.types.input.core.v1.Probe),
                  volumeMounts: args.proxyContainer.volumeMounts,
                },
              ],
            },
          },
        },
      },
      opts.deploymentOpts,
    );

    const serviceOptions: McpServerServiceOptions = {
      enabled: true,
      port: 8080,
      targetPort: 8080,
      ...(args.service ?? {}),
    };

    if (serviceOptions.enabled !== false) {
      const serviceDepends = McpServerDeployment.mergeDepends(
        opts.serviceOpts?.dependsOn,
        [this.deployment],
      );

      this.service = new k8s.core.v1.Service(
        args.name,
        {
          metadata: {
            name: serviceOptions.name ?? args.name,
            namespace: args.namespace,
            labels,
          },
          spec: {
            type: serviceOptions.type ?? 'ClusterIP',
            selector: labels,
            ports: [
              {
                name: 'http',
                port: serviceOptions.port ?? 8080,
                targetPort: serviceOptions.targetPort ?? serviceOptions.port ?? 8080,
              },
            ],
          },
        },
        {
          ...opts.serviceOpts,
          dependsOn: serviceDepends,
        },
      );
    }

    const monitoringOptions: McpServerMonitoringOptions = {
      enabled: true,
      portName: 'http',
      scrapeInterval: '30s',
      ...(args.monitoring ?? {}),
    };

    if (monitoringOptions.enabled !== false) {
      const monitoringDepends = McpServerDeployment.mergeDepends(
        opts.monitoringOpts?.dependsOn,
        [this.deployment],
      );

      this.podScrape = new k8s.apiextensions.CustomResource(
        `${args.name}-scrape`,
        {
          apiVersion: 'operator.victoriametrics.com/v1beta1',
          kind: 'VMPodScrape',
          metadata: {
            name: `${args.name}-scraper`,
            namespace: args.namespace,
            labels,
          },
          spec: {
            podMetricsEndpoints: [
              {
                port: monitoringOptions.portName ?? 'http',
                scheme: 'http',
                scrape_interval: monitoringOptions.scrapeInterval ?? '30s',
              },
            ],
            selector: {
              matchLabels: labels,
            },
          },
        },
        {
          ...opts.monitoringOpts,
          dependsOn: monitoringDepends,
        },
      );
    }
  }
}

export interface GithubMcpServerSecretRef {
  name: pulumi.Input<string>;
  key: pulumi.Input<string>;
}

export interface GithubMcpServerDeploymentArgs {
  name: string;
  namespace: pulumi.Input<string>;
  personalAccessTokenSecret: GithubMcpServerSecretRef;
  allowOrigin?: pulumi.Input<string>;
  replicas?: pulumi.Input<number>;
  proxyImage?: pulumi.Input<string>;
  initImage?: pulumi.Input<string>;
  githubServerVersion?: pulumi.Input<string>;
  githubServerArchive?: pulumi.Input<string>;
  service?: McpServerServiceOptions;
  monitoring?: McpServerMonitoringOptions;
}

