import type { WorkspacePort } from '../ports/workspace-port.js';
import type { PullRequestPort } from '../ports/pull-request-port.js';
import type { AgentsPort } from '../ports/agents-port.js';
import type { LoggerPort } from '../ports/logger-port.js';
import type { GitService } from '../services/git-service.js';

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
  onData?: (chunk: string) => void;
  tasksRepoPath?: string;
  nonInteractive?: boolean; // Added nonInteractive flag
};