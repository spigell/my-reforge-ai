import * as pulumi from '@pulumi/pulumi';
import { createGithubMcpServerDeployment } from './mcp/mcp-github.js';

const config = new pulumi.Config();
const namespaceName = config.get('namespace') ?? 'my-reforge-ai';

const githubMcp = createGithubMcpServerDeployment({
  name: 'mcp-github',
  namespace: namespaceName,
  personalAccessTokenSecret: {
    name: 'github-mcp-credentials',
    key: 'github-pat',
  },
});

export const githubMcpDeploymentName = githubMcp.deployment.metadata.name;
export const githubMcpServiceName = githubMcp.service.metadata.name;
