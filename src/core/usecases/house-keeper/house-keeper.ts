import path from 'node:path';
import type { LoggerPort } from '../../ports/logger-port.js';
import type { PullRequestStatusPort } from '../../ports/pull-request-port.js';
import type {
  TaskRecord,
  TaskRepositoryPort,
} from '../../ports/task-repository-port.js';

export type HouseKeeperDeps = {
  logger: LoggerPort;
  pullRequest: PullRequestStatusPort;
  taskRepository: TaskRepositoryPort;
};

export type HouseKeeperOptions = {
  tasksRoot: string;
  completedDirName?: string;
};

const parseRepositorySlug = (
  slug: string,
): { owner: string; repo: string } | null => {
  const [owner, repo] = slug.split('/');
  if (!owner || !repo) {
    return null;
  }
  return { owner, repo };
};

const parsePullNumber = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const shouldSkipTask = (record: TaskRecord): boolean => {
  const prId = record.task.planning_pr_id;
  const stage = record.task.stage;
  return !prId || stage === 'completed';
};

export async function runHouseKeeper(
  options: HouseKeeperOptions,
  deps: HouseKeeperDeps,
) {
  const { tasksRoot, completedDirName } = options;
  const { logger, taskRepository, pullRequest } = deps;

  const taskRecords = await taskRepository.listActiveTasks(tasksRoot);

  if (taskRecords.length === 0) {
    logger.info(`No active tasks found under ${tasksRoot}.`);
    return;
  }

  for (const record of taskRecords) {
    if (shouldSkipTask(record)) {
      continue;
    }

    const pullNumber = parsePullNumber(record.task.planning_pr_id);
    if (pullNumber === null) {
      logger.warn(
        `Skipping task at ${record.relativeDir}; invalid planning_pr_id "${record.task.planning_pr_id}".`,
      );
      continue;
    }

    const repoInfo = parseRepositorySlug(record.task.repo);
    if (!repoInfo) {
      logger.warn(
        `Skipping task at ${record.relativeDir}; invalid repo slug "${record.task.repo}".`,
      );
      continue;
    }

    let prStatus: Awaited<
      ReturnType<PullRequestStatusPort['getPullRequestStatus']>
    >;
    try {
      prStatus = await pullRequest.getPullRequestStatus({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        prNumber: pullNumber,
      });
    } catch (error) {
      logger.error(
        `Failed to fetch PR status for ${record.task.repo}#${pullNumber}: ${
          (error as Error).message
        }`,
      );
      continue;
    }

    if (!prStatus.merged) {
      logger.debug?.(
        `PR ${record.task.repo}#${pullNumber} (${prStatus.state}) not merged; task ${record.relativeDir} remains active.`,
      );
      continue;
    }

    const completionResult = await taskRepository.markTaskAsCompleted(record, {
      completedDirName,
    });

    const relativeDestination = path.relative(
      process.cwd(),
      completionResult.newAbsolutePath,
    );
    logger.info(
      `Task ${record.relativeDir} moved to ${relativeDestination} after PR merge.`,
    );
  }
}
