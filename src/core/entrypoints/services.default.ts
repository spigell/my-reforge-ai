import { AgentsRegistry } from '../../adapters/agents/agent-registry.js';
import { ConsoleLogger } from '../../adapters/logger/logger.js';
import { GithubPrService } from '../../adapters/pr/github-pr.js';
import { WorkspaceManager } from '../../adapters/workspace/workspace-manager.js';
import { SimpleGitService } from '../../adapters/git/simple-git.js';
import type { Services } from '../usecases/types.js';
import { resolveGithubToken } from '../../libs/github-token.js';

const logger = new ConsoleLogger();
const githubToken = resolveGithubToken();

export const defaultServices: Services = {
  logger,
  workspace: new WorkspaceManager({ githubToken }),
  pr: new GithubPrService({ token: githubToken }),
  agents: new AgentsRegistry(),
  git: new SimpleGitService(),
};
