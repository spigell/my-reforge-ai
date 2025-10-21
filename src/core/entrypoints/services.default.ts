import { AgentsRegistry } from '../../adapters/agents/AgentsRegistry.js';
import { ConsoleLogger } from '../../adapters/logger/ConsoleLogger.js';
import { GithubPrService } from '../../adapters/pr/GithubPrService.js';
import { WorkspaceManager } from '../../adapters/workspace/WorkspaceManager.js';
import { SimpleGitService } from '../../adapters/git/SimpleGitService.js';
import type { Services } from '../usecases/types.js';

const logger = new ConsoleLogger();

export const defaultServices: Services = {
  logger,
  workspace: new WorkspaceManager(),
  pr: new GithubPrService(),
  agents: new AgentsRegistry(),
  git: new SimpleGitService(),
};
