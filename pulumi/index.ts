import * as pulumi from '@pulumi/pulumi';
import { GithubMcpServer, GithubMcpServerArgs } from './mcp/github.js';
import { PulumiMcpServer, PulumiMcpServerArgs } from './mcp/pulumi.js';

const config = new pulumi.Config();
const namespace = config.require('namespace');

const identityStack = new pulumi.StackReference(`organization/output-gateway/${pulumi.getProject()}`);
const identityOutputs = identityStack.getOutput('output') as pulumi.Output<IdentityStackOutputs>;
const gcpSecretKeyName = identityOutputs.apply((o) => o['gcp-secret-key-name']);
const pulumiAccountName = identityOutputs.apply((o) => o['pulumi-account-name']);

const getEnabledMcpConfig = <T extends { enabled?: boolean }>(key: string): T | undefined => {
  const cfg = config.getObject<T>(key);

  if (!cfg) {
    pulumi.log.warn(`Configuration for '${key}' MCP server missing; disabling server.`);
    return undefined;
  }

  if (cfg.enabled === false) {
    pulumi.log.info(`'${key}' MCP server disabled via configuration.`);
    return undefined;
  }

  return cfg;
};

const githubMcpConfig = getEnabledMcpConfig<GithubMcpServerArgs>('githubMcp');
const pulumiMcpConfig = getEnabledMcpConfig<PulumiMcpServerArgs>('pulumiMcp');

type IdentityStackOutputs = {
  'gcp-secret-key-name': string;
  'pulumi-account-name': string;
};


let githubMcp: GithubMcpServer | undefined;
if (githubMcpConfig) {
  if (!githubMcpConfig.secret) {
    throw new pulumi.RunError("githubMcp.secret must be defined when the GitHub MCP server is enabled.");
  }

  githubMcp = new GithubMcpServer(
    'mcp-github',
    {
      namespace,
      image: githubMcpConfig.image,
      secret: githubMcpConfig.secret,
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
      labels: githubMcpConfig.labels,
      serviceAccountName: githubMcpConfig.serviceAccountName,
    },
  );
}

let pulumiMcp: PulumiMcpServer | undefined;
if (pulumiMcpConfig) {
  pulumiMcp = new PulumiMcpServer(
    'mcp-pulumi',
    {
      namespace,
      image: pulumiMcpConfig.image,
      gcpCredentialsSecretName: gcpSecretKeyName,
      port: pulumiMcpConfig.port,
      allowOrigins: pulumiMcpConfig.allowOrigins,
      replicas: pulumiMcpConfig.replicas,
      resources: pulumiMcpConfig.resources,
      command: pulumiMcpConfig.command,
      args: pulumiMcpConfig.args,
      additionalEnv: pulumiMcpConfig.additionalEnv ?? [],
      enableInspector: pulumiMcpConfig.enableInspector,
      inspectorImage: pulumiMcpConfig.inspectorImage,
      monitoring: pulumiMcpConfig.monitoring,
      labels: pulumiMcpConfig.labels,
      serviceAccountName: pulumiAccountName,
      sharedCodeMount: {
        enabled: true,
      }
    },
  );
}
