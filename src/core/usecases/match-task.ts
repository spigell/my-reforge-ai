import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  MatchedTask,
  Task,
  Idea,
  TaskPriority,
} from '../../types/task.js';
import { DEFAULT_AGENT, normalizeAgentList } from '../../types/agent.js';
import { LoggerPort } from '../ports/logger-port.js';
import { UsageServicePort } from '../ports/usage-service-port.js';
import { validateAndNormalizeTask } from './helpers.js';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const ensurePriority = (value?: unknown): TaskPriority => {
  return value === 'high' || value === 'medium' || value === 'low'
    ? value
    : 'medium';
};

type TaskLike = Task | Idea;

function convertToTask(idea: Idea): Task {
  const task: Task = {
    ...idea,
    stage: 'planning',
  };
  task.priority = ensurePriority(task.priority);
  return task;
}

const normalizeTaskEntry = (entry: TaskLike): Task => {
  const normalized = validateAndNormalizeTask(entry);
  const task =
    'stage' in entry
      ? ({ ...entry } as Task)
      : convertToTask(entry as Idea);

  return {
    ...task,
    repo: normalized.repo,
    branch: normalized.branch,
    kind: normalized.kind,
    task_dir: normalized.task_dir,
    stage: normalized.stage,
    idea: normalized.idea,
    planning_pr_id: normalized.planning_pr_id,
    review_required: normalized.review_required,
    timeout_ms: normalized.timeout_ms,
    additionalRepos: normalized.additionalRepos,
    priority: normalized.priority,
  };
};

const collectBlockingReviewKeys = (ideasFilePath: string): Set<string> => {
  const dir = path.dirname(ideasFilePath);
  const blockingReviewKeys = new Set<string>();

  if (!fs.existsSync(dir)) {
    return blockingReviewKeys;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const maybeTaskFile = path.join(dir, entry.name, 'task.yaml');
    if (!fs.existsSync(maybeTaskFile)) continue;

    try {
      const rawContent = fs.readFileSync(maybeTaskFile, 'utf8');
      const parsed = yaml.load(rawContent) as TaskLike;
      const normalized = validateAndNormalizeTask(parsed);
      if (normalized.review_required && normalized.kind && normalized.repo) {
        blockingReviewKeys.add(`${normalized.kind}::${normalized.repo}`);
      }
    } catch {
      // If a task definition cannot be read, skip it to avoid blocking the queue.
      continue;
    }
  }

  return blockingReviewKeys;
};

const parseTaskEntries = (ideasFilePath: string): Task[] => {
  if (!fs.existsSync(ideasFilePath)) {
    throw new Error(`Ideas file not found at ${ideasFilePath}`);
  }
  const content = fs.readFileSync(ideasFilePath, 'utf8');
  const parsed = yaml.load(content) as {
    ideas?: TaskLike[];
    tasks?: TaskLike[];
  };

  const entries =
    (Array.isArray(parsed?.ideas) ? parsed?.ideas : undefined) ??
    (Array.isArray(parsed?.tasks) ? parsed?.tasks : undefined);

  if (!entries || entries.length === 0) {
    throw new Error(
      'No tasks or ideas found in the YAML file or invalid format.',
    );
  }

  return entries.map((entry) => normalizeTaskEntry(entry));
};

export function pickNextTask(ideasFilePath: string): Task {
  const blockingReviewKeys = collectBlockingReviewKeys(ideasFilePath);
  const tasks = parseTaskEntries(ideasFilePath);

  const prioritized = tasks
    .map((task, index) => ({
      task: {
        ...task,
        priority: ensurePriority(task.priority),
      },
      index,
    }))
    .sort((a, b) => {
      const priorityDiff =
        PRIORITY_ORDER[a.task.priority!] - PRIORITY_ORDER[b.task.priority!];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return a.index - b.index;
    });

  if (prioritized.length === 0) {
    throw new Error(
      'No tasks or ideas found in the YAML file or invalid format.',
    );
  }

  let selectedTask: Task | undefined;

  for (const candidate of prioritized) {
    const { task } = candidate;
    if (
      task.review_required &&
      task.kind &&
      task.repo &&
      blockingReviewKeys.has(`${task.kind}::${task.repo}`)
    ) {
      continue;
    }
    selectedTask = task;
    break;
  }

  if (!selectedTask) {
    throw new Error('No eligible task found after applying filters.');
  }

  return selectedTask;
}

export function findTaskByPrId(
  tasksDir: string,
  prId: string,
  logger: LoggerPort,
): string | undefined {
  for (const entry of fs.readdirSync(tasksDir, { withFileTypes: true })) {
    const fullPath = path.join(tasksDir, entry.name);
    logger.info(fullPath);
    if (entry.isDirectory()) {
      const found = findTaskByPrId(fullPath, prId, logger);
      if (found) return found;
    } else if (entry.isFile() && entry.name.endsWith('task.yaml')) {
      try {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const data = yaml.load(fileContent) as Task;
        if (data?.planning_pr_id === prId) {
          logger.info(`Found matching task file: ${fullPath}`);
          return fullPath;
        }
      } catch (e: any) {
        logger.warn(`Could not read or parse ${fullPath}: ${e.message}`);
      }
    }
  }
  return undefined;
}

export interface MatchTaskAgentParams {
  entry: Task | Idea;
}

export interface MatchTaskAgentServices {
  logger: LoggerPort;
  usageService: UsageServicePort;
}

export async function matchTaskAgent(
  params: MatchTaskAgentParams,
  services: MatchTaskAgentServices,
): Promise<MatchedTask> {
  const { logger, usageService } = services;
  const { entry } = params;

  const task = validateAndNormalizeTask(entry);

  const rawAgents = entry.agents ?? [];
  const normalizedAgents = normalizeAgentList(rawAgents);

  if (normalizedAgents.length === 0) {
    normalizedAgents.push(DEFAULT_AGENT);
  }

  const agent = normalizedAgents[0];
  task.agents = normalizedAgents;

  logger.info('Checking for available tokens...');
  const hasTokens = await usageService.hasTokens(agent);

  if (!hasTokens) {
    throw new Error('No tokens available for today.');
  }
  logger.info('Tokens are available.');

  const outputPayload: MatchedTask = {
    selectedAgent: agent,
    task,
  };

  return outputPayload;
}