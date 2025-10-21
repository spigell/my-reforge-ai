import type { WorkspacePort } from '../ports/WorkspacePort.js';
import type { PullRequestPort } from '../ports/PullRequestPort.js';
import type { AgentsPort } from '../ports/AgentsPort.js';
import type { LoggerPort } from '../ports/LoggerPort.js';
import type { GitService } from '../services/GitService.js';

export type Services = {
  workspace: WorkspacePort;
  pr: PullRequestPort;
  agents: AgentsPort;
  logger: LoggerPort;
  git: GitService;
};

export type UseCaseRunOptions = {
  workspaceRoot?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
};
