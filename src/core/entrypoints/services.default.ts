import { AgentsRegistry } from '../../adapters/agents/agent-registry.js';
import { ConsoleLogger } from '../../adapters/logger/logger.js';
import { GithubPrService } from '../../adapters/pr/github-pr.js';
import { WorkspaceManager } from '../../adapters/workspace/workspace-manager.js';
import { SimpleGitService } from '../../adapters/git/simple-git.js';
import type { Services } from '../usecases/types.js';

const logger = new ConsoleLogger();

export const defaultServices: Services = {
  logger,
  workspace: new WorkspaceManager(),
  pr: new GithubPrService(),
  agents: new AgentsRegistry(),
  git: new SimpleGitService(),
};
