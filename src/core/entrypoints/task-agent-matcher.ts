import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { ConsoleLogger } from '../../adapters/logger/logger.js';
import { UsageServiceAdapter } from '../../adapters/usage/usage-service.js';
import {
  matchTaskAgent,
  MatchTaskAgentServices,
  findTaskByPrId,
  pickNextTask,
} from '../usecases/match-task.js';
import { Idea, Task } from '../../types/task.js';

export interface MatcherMainOptions {
  outputFile: string;
  prNumber?: string;
  taskDir?: string;
  ideasFilePath?: string;
}

export async function main(
  command: string,
  options: MatcherMainOptions = { outputFile: 'task.json' },
) {
  const logger = new ConsoleLogger();

  const { outputFile, prNumber, taskDir, ideasFilePath } = options;

  let task: Task | Idea;

  switch (command) {
    case 'take-from-pr': {
      // prNumber and taskDir are guaranteed by the calling cli command.
      const foundTaskFile = findTaskByPrId(taskDir!, prNumber!, logger);
      if (!foundTaskFile) {
        throw new Error(
          `No task found for PR number ${prNumber} in ${taskDir}`,
        );
      }
      const taskFileContent = fs.readFileSync(foundTaskFile, 'utf8');
      task = yaml.load(taskFileContent) as Task;
      break;
    }
    case 'pick': {
      task = pickNextTask(ideasFilePath as string);
      if (!task) {
        throw new Error(`No task could be picked from ${ideasFilePath}`);
      }
      break;
    }
    default:
      // This path should not be reachable due to validation in the bin script.
      throw new Error(`Internal error: unexpected command "${command}"`);
  }

  if (!task) {
    throw new Error(
      'No tasks or ideas found in the YAML file or invalid format.',
    );
  }

  const services: MatchTaskAgentServices = {
    logger,
    usageService: new UsageServiceAdapter(logger),
  };

  const outputPayload = await matchTaskAgent({ entry: task }, services);

  const serializedPayload = JSON.stringify(outputPayload);

  fs.writeFileSync(outputFile, serializedPayload);
  logger.info(`Task data written to ${outputFile}`);
}
