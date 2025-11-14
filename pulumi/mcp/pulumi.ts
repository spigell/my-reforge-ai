import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { K8sApp } from '../common/k8s-app/index.js';
import { McpInspector } from './mcp-inspector.js';
import { SharedManualVolume } from '../common/storage/shared-manual-volume.js';
import { McpServerArgs } from './types.js';
import { createMcpPodScrape } from './monitoring.js';
import { DEFAULT_INSPECTOR_IMAGE } from './constants.js';

export type PulumiMcpServerArgs = McpServerArgs & {
  gcpCredentialsSecretName: pulumi.Input<string>;
  gcpCredentialsSecretKey?: pulumi.Input<string>;
};

export class PulumiMcpServer extends pulumi.ComponentResource {
  public readonly deployment: k8s.apps.v1.Deployment;
  public readonly service?: k8s.core.v1.Service;
  public readonly podScrape?: k8s.apiextensions.CustomResource;

  constructor(name: string, args: PulumiMcpServerArgs, opts?: pulumi.ComponentResourceOptions) {
    super('my-reforge-ai:mcp:PulumiMcpServer', name, {}, opts);

    const port = args.port ?? 3000;
    const kubeconfigMountPath = '/var/run/pulumi';
    const kubeconfigFilePath = `${kubeconfigMountPath}/kubeconfig`;
    const env: k8s.types.input.core.v1.EnvVar[] = [
      {
        name: 'GOOGLE_APPLICATION_CREDENTIALS',
        value: '/var/run/gcp/credentials.json',
      },
      {
        name: 'KUBECONFIG',
        value: kubeconfigFilePath,
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
    const inspectorImage = args.inspectorImage ?? DEFAULT_INSPECTOR_IMAGE;
    const volumes: k8s.types.input.core.v1.Volume[] = [...(args.volumes ?? [])];
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

    const gcpCredentialsVolumeName = `${name}-gcp-credentials`;
    const gcpCredentialsMountPath = '/var/run/gcp';
    const gcpCredentialsFileName = args.gcpCredentialsSecretKey ?? 'credentials.json';
    const kubeconfigVolumeName = `${name}-kubeconfig`;

    const volumeMounts: k8s.types.input.core.v1.VolumeMount[] = [...(args.volumeMounts ?? [])];
    const initContainers: k8s.types.input.core.v1.Container[] = [...(args.initContainers ?? [])];

    volumes.push({
      name: gcpCredentialsVolumeName,
      secret: {
        secretName: args.gcpCredentialsSecretName,
        items: [
          {
            key: gcpCredentialsFileName,
            path: 'credentials.json',
          },
        ],
      },
    });
    volumes.push({
      name: kubeconfigVolumeName,
      emptyDir: {},
    });

    volumeMounts.push({
      name: gcpCredentialsVolumeName,
      mountPath: gcpCredentialsMountPath,
      readOnly: true,
    });
    volumeMounts.push({
      name: kubeconfigVolumeName,
      mountPath: kubeconfigMountPath,
    });

    const kubeconfigInitScript = `
set -eu
SERVICE_HOST=\${KUBERNETES_SERVICE_HOST:-kubernetes.default.svc}
SERVICE_PORT=\${KUBERNETES_SERVICE_PORT:-443}
SERVER="https://\${SERVICE_HOST}:\${SERVICE_PORT}"
TOKEN_PATH=/var/run/secrets/kubernetes.io/serviceaccount/token
CA_CERT_PATH=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
NAMESPACE_PATH=/var/run/secrets/kubernetes.io/serviceaccount/namespace
TOKEN="$(cat "\${TOKEN_PATH}")"
NAMESPACE="$(cat "\${NAMESPACE_PATH}")"
mkdir -p ${kubeconfigMountPath}
cat <<EOF > ${kubeconfigFilePath}
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority: \${CA_CERT_PATH}
    server: \${SERVER}
  name: in-cluster
contexts:
- context:
    cluster: in-cluster
    namespace: \${NAMESPACE}
    user: in-cluster
  name: in-cluster
current-context: in-cluster
users:
- name: in-cluster
  user:
    token: \${TOKEN}
EOF
chmod 600 ${kubeconfigFilePath}
`;

    initContainers.push({
      name: 'generate-kubeconfig',
      image: args.image,
      command: ['/bin/sh', '-c', kubeconfigInitScript],
      volumeMounts: [
        {
          name: kubeconfigVolumeName,
          mountPath: kubeconfigMountPath,
        },
      ],
    });

    if (args.sharedCodeMount?.enabled) {
      const sharedVolume = new SharedManualVolume(
        `${name}-shared-code`,
        {
          namespace: args.namespace,
          volumeName: `${name}-shared-code-pv`,
          claimName: `${name}-shared-code-pvc`,
        },
        { parent: this },
      );

      const sharedVolumeName = `${name}-shared-code-volume`;
      const sharedMountPath = '/project';

      volumes.push({
        name: sharedVolumeName,
        persistentVolumeClaim: {
          claimName: sharedVolume.claim.metadata.name,
        },
      });

      volumeMounts.push({
        name: sharedVolumeName,
        mountPath: sharedMountPath,
      });
    }

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
        volumes,
        volumeMounts,
        initContainers,
        automountServiceAccountToken: args.automountServiceAccountToken ?? true,
        serviceAccountName: args.serviceAccountName,
        podSecurityContext: {
          runAsUser: 0,
          runAsNonRoot: false,
        },
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
