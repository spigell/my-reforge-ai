import type { MatchedTask, Task, Idea, TaskStage } from '../../types/task.js';
import type { LoggerPort } from '../ports/logger-port.js';
import { dump as dumpYaml } from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path'; // Import path module

export const DEFAULT_WORKSPACE_ROOT = './workspace';

export const resolveWorkspaceRoot = (workspaceRoot?: string) =>
  path.resolve(workspaceRoot ?? DEFAULT_WORKSPACE_ROOT);

export const deriveTimeout = (
  task: MatchedTask['task'],
  override?: number,
): number => {
  if (typeof override === 'number') {
    return override;
  }

  if (typeof task.timeout_ms === 'number') {
    return task.timeout_ms;
  }

  const legacyTimeout = (task as { timeoutMs?: unknown }).timeoutMs;
  return typeof legacyTimeout === 'number' ? legacyTimeout : 300_000;
};

export const setupAbortHandling = ({
  logger,
  label,
  timeoutMs,
  externalSignal,
}: {
  logger: LoggerPort;
  label: string;
  timeoutMs: number;
  externalSignal?: AbortSignal;
}) => {
  const abortController = new AbortController();

  const handleExternalAbort = () => {
    const reason =
      externalSignal && 'reason' in externalSignal
        ? (externalSignal as AbortSignal & { reason?: unknown }).reason
        : undefined;
    abortController.abort(reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      handleExternalAbort();
    } else {
      externalSignal.addEventListener('abort', handleExternalAbort, {
        once: true,
      });
    }
  }

  const timeoutId = setTimeout(() => {
    logger.warn(`${label} timed out after ${timeoutMs}ms. Aborting...`);
    abortController.abort(new Error(`${label} timeout`));
  }, timeoutMs);

  const dispose = () => {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', handleExternalAbort);
    }
  };

  return {
    signal: abortController.signal,
    dispose,
  };
};

export function writeYamlFile(
  filePath: string,
  data: Record<string, unknown>,
): void {
  const serialized = dumpYaml(data, { noRefs: true });
  fs.writeFileSync(filePath, serialized, 'utf8');
}

export const validateAndNormalizeTask = (entry: Task | Idea): Task => {
  const candidate = { ...entry } as Record<string, unknown>;

  const stageValue = candidate.stage;
  const stage: TaskStage =
    stageValue === 'planning' ||
    stageValue === 'implementing' ||
    stageValue === 'ready-for-implementing' ||
    stageValue === 'completed'
      ? stageValue
      : 'planning';
  const priorityValue = candidate.priority;
  const priority =
    priorityValue === 'high' ||
    priorityValue === 'medium' ||
    priorityValue === 'low'
      ? priorityValue
      : 'medium';

  const task: Task = {
    repo: typeof candidate.repo === 'string' ? candidate.repo : '',
    branch: typeof candidate.branch === 'string' ? candidate.branch : '',
    kind: typeof candidate.kind === 'string' ? candidate.kind : '',
    agents: [],
    task_dir: typeof candidate.task_dir === 'string' ? candidate.task_dir : '',
    stage,
    idea: typeof candidate.idea === 'string' ? candidate.idea : undefined,
    planning_pr_id:
      'planning_pr_id' in entry && typeof candidate.planning_pr_id === 'string'
        ? candidate.planning_pr_id
        : undefined,
    priority,
    review_required:
      typeof candidate.review_required === 'boolean'
        ? candidate.review_required
        : undefined,
    timeout_ms:
      typeof candidate.timeout_ms === 'number'
        ? candidate.timeout_ms
        : undefined,
  };

  if (Array.isArray(candidate.additionalRepos)) {
    task.additionalRepos = candidate.additionalRepos as Task['additionalRepos'];
  }

  return task;
};
