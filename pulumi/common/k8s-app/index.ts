import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';

export type ServiceOptions = {
  enabled?: boolean;
  type?: pulumi.Input<'ClusterIP' | 'NodePort' | 'LoadBalancer'>;
  annotations?: Record<string, pulumi.Input<string>>;
};

export type K8sAppArgs = {
  name: string;
  namespace: pulumi.Input<string>;
  image: pulumi.Input<string>;
  replicas?: pulumi.Input<number>;
  labels?: Record<string, pulumi.Input<string>>;
  env?: pulumi.Input<pulumi.Input<k8s.types.input.core.v1.EnvVar>[]>;
  command?: pulumi.Input<pulumi.Input<string>[]>;
  args?: pulumi.Input<pulumi.Input<string>[]>;
  ports?: Record<string, pulumi.Input<number>>;
  resources?: pulumi.Input<k8s.types.input.core.v1.ResourceRequirements>;
  readinessProbe?: pulumi.Input<k8s.types.input.core.v1.Probe>;
  livenessProbe?: pulumi.Input<k8s.types.input.core.v1.Probe>;
  volumeMounts?: pulumi.Input<pulumi.Input<k8s.types.input.core.v1.VolumeMount>[]>;
  volumes?: pulumi.Input<pulumi.Input<k8s.types.input.core.v1.Volume>[]>;
  sidecars?: k8s.types.input.core.v1.Container[];
  service?: ServiceOptions;
  automountServiceAccountToken?: pulumi.Input<boolean>;
  serviceAccountName?: pulumi.Input<string>;
  initContainers?: pulumi.Input<pulumi.Input<k8s.types.input.core.v1.Container>[]>;
  dependsOn?: pulumi.Input<pulumi.Resource> | pulumi.Input<pulumi.Resource>[];
  securityContext?: k8s.types.input.core.v1.SecurityContext;
  podSecurityContext?: k8s.types.input.core.v1.PodSecurityContext;
  hostUsers?: pulumi.Input<boolean>;
  enableServiceLinks?: pulumi.Input<boolean>;
};

export class K8sApp extends pulumi.ComponentResource {
  public readonly deployment: k8s.apps.v1.Deployment;
  public readonly service?: k8s.core.v1.Service;

  constructor(name: string, args: K8sAppArgs, opts?: pulumi.ComponentResourceOptions) {
    super('my-reforge-ai:common:K8sApp', name, {}, opts);

    const componentOpts: pulumi.ComponentResourceOptions = { parent: this };

    const labels = {
      app: args.name,
      ...(args.labels ?? {}),
    };

    const containerPorts = args.ports
      ? Object.entries(args.ports).map(([portName, portNumber]) => ({
          name: portName,
          containerPort: portNumber,
        }))
      : undefined;

    const defaultContainerSecurityContext: k8s.types.input.core.v1.SecurityContext = {
      allowPrivilegeEscalation: false,
      capabilities: {
        drop: ['ALL'],
      },
      seccompProfile: {
        type: 'RuntimeDefault',
      },
    };

    const mainContainerSecurityContext: k8s.types.input.core.v1.SecurityContext = {
      ...defaultContainerSecurityContext,
      ...(args.securityContext ?? {}),
      capabilities:
        args.securityContext?.capabilities ?? defaultContainerSecurityContext.capabilities,
      seccompProfile:
        args.securityContext?.seccompProfile ?? defaultContainerSecurityContext.seccompProfile,
    };

    const mainContainer: k8s.types.input.core.v1.Container = {
      name: args.name,
      image: args.image,
      imagePullPolicy: 'Always',
      env: args.env,
      command: args.command,
      args: args.args,
      ports: containerPorts as pulumi.Input<
        pulumi.Input<k8s.types.input.core.v1.ContainerPort>[]
      >,
      resources: args.resources,
      readinessProbe: args.readinessProbe,
      livenessProbe: args.livenessProbe,
      volumeMounts: args.volumeMounts,
      securityContext: mainContainerSecurityContext,
    };

    const containers = args.sidecars ? [mainContainer, ...args.sidecars] : [mainContainer];


    this.deployment = new k8s.apps.v1.Deployment(
      args.name,
      {
        metadata: {
          name: args.name,
          namespace: args.namespace,
          labels,
        },
        spec: {
          replicas: args.replicas ?? 1,
          selector: { matchLabels: labels },
          template: {
            metadata: {
              labels,
            },
            spec: {
              automountServiceAccountToken: args.automountServiceAccountToken ?? false,
              serviceAccountName: args.serviceAccountName,
              containers,
              volumes: args.volumes,
              initContainers: args.initContainers,
              enableServiceLinks: args.enableServiceLinks ?? false,
              hostUsers: args.hostUsers ?? false,
      securityContext: {
        runAsNonRoot: true,
        runAsUser: 1000,
        ...(args.podSecurityContext ?? {}),
      },
            },
          },
        },
      },
      {
        ...componentOpts,
        dependsOn: args.dependsOn,
      },
    );

    const serviceOptions: ServiceOptions = {
      enabled: true,
      ...(args.service ?? {}),
    };

    if (serviceOptions.enabled !== false && containerPorts && containerPorts.length > 0) {
      this.service = new k8s.core.v1.Service(
        args.name,
        {
          metadata: {
            name: args.name,
            namespace: args.namespace,
            labels,
            annotations: serviceOptions.annotations,
          },
          spec: {
            type: serviceOptions.type ?? 'ClusterIP',
            selector: labels,
            ports: containerPorts.map((port) => ({
              name: port.name,
              port: port.containerPort,
              targetPort: port.name,
            })),
          },
        },
        {
          ...componentOpts,
          dependsOn: args.dependsOn,
        },
      );
    }

    this.registerOutputs({
      deploymentName: this.deployment.metadata.name,
      serviceName: this.service?.metadata.name,
    });
  }
}
