import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import { GithubMcpServer, GithubMcpMonitoringOptions } from './mcp/github.js';

const config = new pulumi.Config();

interface GithubMcpConfig {
  namespace: string;
  image: string;
  personalAccessTokenSecretName: string;
  personalAccessTokenSecretKey: string;
  port: number;
  allowOrigins: string[];
  replicas?: number;
  resources: k8s.types.input.core.v1.ResourceRequirements;
  command?: string[];
  args?: string[];
  additionalEnv?: k8s.types.input.core.v1.EnvVar[];
  enableInspector?: boolean;
  inspectorImage?: string;
  monitoring?: GithubMcpMonitoringOptions;
}

const githubMcpConfig: GithubMcpConfig = {
  namespace: config.require('my-reforge-ai:namespace'),
  image: config.require('githubMcp:image'),
  personalAccessTokenSecretName: config.require('githubMcp:personalAccessTokenSecretName'),
  personalAccessTokenSecretKey: config.require('githubMcp:personalAccessTokenSecretKey'),
  port: config.requireNumber('githubMcp:port'),
  allowOrigins: config.requireObject<string[]>('githubMcp:allowOrigins'),
  replicas: config.getNumber('githubMcp:replicas') ?? undefined,
  resources: config.requireObject<k8s.types.input.core.v1.ResourceRequirements>('githubMcp:resources'),
  command: config.getObject<string[]>('githubMcp:command') ?? undefined,
  args: config.getObject<string[]>('githubMcp:args') ?? undefined,
  additionalEnv: config.getObject<k8s.types.input.core.v1.EnvVar[]>('githubMcp:additionalEnv') ?? undefined,
  enableInspector: config.getBoolean('githubMcp:enableInspector') ?? false,
  inspectorImage: config.get('githubMcp:inspectorImage') ?? undefined,
  monitoring: config.getObject<GithubMcpMonitoringOptions>('githubMcp:monitoring') ?? undefined,
};

if (githubMcpConfig.enableInspector && !githubMcpConfig.inspectorImage) {
  throw new Error('githubMcp.inspectorImage must be set when enableInspector is true');
}

const githubMcp = new GithubMcpServer(
  'mcp-github',
  {
    namespace: githubMcpConfig.namespace,
    image: githubMcpConfig.image,
    secret: {
      name: githubMcpConfig.personalAccessTokenSecretName,
      key: githubMcpConfig.personalAccessTokenSecretKey,
    },
    port: githubMcpConfig.port,
    allowOrigins: githubMcpConfig.allowOrigins,
    replicas: githubMcpConfig.replicas,
    resources: githubMcpConfig.resources,
    command: githubMcpConfig.command,
    args: githubMcpConfig.args,
    additionalEnv: githubMcpConfig.additionalEnv,
    enableInspector: githubMcpConfig.enableInspector,
    inspectorImage: githubMcpConfig.inspectorImage,
    monitoring: githubMcpConfig.monitoring,
  },
);

export const githubMcpDeploymentName = githubMcp.deployment.metadata.name;
export const githubMcpServiceName = githubMcp.service?.metadata.name;
export const githubMcpPodScrapeName = githubMcp.podScrape?.metadata.name;