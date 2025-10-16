import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { UsageManager } from '../libs/usage-manager/usage-manager.js';
import { Logger } from '../libs/logger/logger.js';

async function main() {
  const logger = Logger.getLogger();
  const usageManager = new UsageManager(logger);

  logger.info('Checking for available tokens...');
  const hasTokens = await usageManager.hasTokens();

  if (!hasTokens) {
    logger.error('No tokens available for today. Exiting.');
    process.exit(1);
  }
  logger.info('Tokens are available.');

  const rawArgs = process.argv.slice(2);
  let outputFilePath: string | undefined;
  const positionalArgs: string[] = [];

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === '--output-file') {
      const nextValue = rawArgs[index + 1];

      if (!nextValue) {
        logger.error('Error: --output-file flag requires a file path.');
        process.exit(1);
      }

      outputFilePath = nextValue;
      index += 1;
      continue;
    }

    if (arg.startsWith('--output-file=')) {
      const value = arg.slice('--output-file='.length);

      if (!value) {
        logger.error('Error: --output-file flag requires a non-empty file path.');
        process.exit(1);
      }

      outputFilePath = value;
      continue;
    }

    positionalArgs.push(arg);
  }

  const taskFilePath = positionalArgs[0];

  if (!taskFilePath) {
    logger.error('Usage: ts-node src/task-picker/picker.ts [--output-file <path>] <path/to/task.yaml>');
    process.exit(1);
  }

  try {
    logger.info(`Reading task file: ${taskFilePath}`);
    const fileContents = fs.readFileSync(taskFilePath, 'utf8');
    const data: any = yaml.load(fileContents);

    if (data && data.tasks && data.tasks.length > 0) {
      const task = data.tasks[0] ?? {};
      task.sourceFile = taskFilePath;

      const rawAgents = Array.isArray(task.agents) ? task.agents : [];
      const normalizedAgents = rawAgents
        .map((agent: unknown) => (typeof agent === 'string' ? agent.trim() : ''))
        .filter((agent: string) => agent.length > 0);

      if (normalizedAgents.length === 0) {
        normalizedAgents.push('codex');
      }

      const agent = normalizedAgents[0];
      task.agents = normalizedAgents;

      const outputPayload = {
        repo: task.repo,
        branch: task.branch || 'main',
        agent,
        agents: normalizedAgents,
        fallbackAgents: normalizedAgents.slice(1),
        task,
      };

      const serializedPayload = JSON.stringify(outputPayload);

      if (outputFilePath) {
        fs.writeFileSync(outputFilePath, serializedPayload);
        logger.info(`Task data written to ${outputFilePath}`);
      } else {
        console.log(serializedPayload);
      }
    } else {
      logger.error('No tasks found in the YAML file or invalid format.');
      process.exit(1);
    }
  } catch (error: any) {
    logger.error(`Error reading or parsing task file: ${error.message}`);
    process.exit(1);
  }
}

main();
