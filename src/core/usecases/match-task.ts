import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { MatchedTask, Task, Idea } from '../../types/task.js';
import { DEFAULT_AGENT, normalizeAgentList } from '../../types/agent.js';
import { LoggerPort } from '../ports/logger-port.js';
import { UsageServicePort } from '../ports/usage-service-port.js';
import { validateAndNormalizeTask } from './helpers.js';

function convertToTask(idea: Idea): Task {
  const task: Task = {
    ...idea,
    stage: 'planning',
  };
  return task;
}

export function pickNextTask(ideasFilePath: string): Task {
  if (!fs.existsSync(ideasFilePath)) {
    throw new Error(`Ideas file not found at ${ideasFilePath}`);
  }
  const content = fs.readFileSync(ideasFilePath, 'utf8');
  const tasks = yaml.load(content) as { ideas: Idea[] };
  const idea = tasks.ideas[0];

  return convertToTask(idea);
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
