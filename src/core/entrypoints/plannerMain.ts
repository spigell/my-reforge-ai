import fs from 'node:fs';
import path from 'node:path';
import { planTask } from '../usecases/plan-task/plan-task.js';
import type { UseCaseRunOptions, Services } from '../usecases/types.js';
import { defaultServices } from './services.default.js';
import type { MatchedTask } from '../../types/task.js';

export type PlannerMainOptions = UseCaseRunOptions & {
  services?: Partial<Services>;
};

const resolveInputPath = (inputPath: string) =>
  path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);

export async function main(
  taskDataPath: string,
  options: PlannerMainOptions = {},
) {
  if (!taskDataPath) {
    throw new Error('Task data path must be provided.');
  }

  const { services: overrides, ...runOptions } = options;
  const services: Services = { ...defaultServices, ...overrides };
  const { logger } = services;

  const resolvedTaskDataPath = resolveInputPath(taskDataPath);
  const rawContent = fs.readFileSync(resolvedTaskDataPath, 'utf8');
  const matchedTask = JSON.parse(rawContent) as MatchedTask;

  if (matchedTask.task.stage !== 'planning') {
    logger.warn(
      `Warning: task stage is "${matchedTask.task.stage}", but planner expects "planning". Continuing...`,
    );
  }

  const result = await planTask(matchedTask, services, runOptions);
  if (result.status !== 'success') {
    logger.error(`Planner run was not successful. Status: ${result.status}`);
    throw new Error(`Planner finished with status ${result.status}`);
  }

  return result;
}
