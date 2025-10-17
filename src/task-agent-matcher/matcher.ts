import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { UsageManager } from '../libs/usage-manager/usage-manager.js';
import { Logger } from '../libs/logger/logger.js';

export interface Task {
  repo: string;
  branch?: string;
  agents?: string[];
  kind?: string;
  idea?: string;
  'description-file'?: string;
  stage?: 'planning' | 'implementing';
  pr_link?: string;
  review_required?: boolean;
  sourceFile?: string;
}

export interface MatcherOutput {
  repo: string;
  branch: string;
  agent: string;
  task: Task;
}

export async function main(argv: string[]) {
  const logger = Logger.getLogger();

  let parsedArgs;
  try {
    parsedArgs = parseArgs({
      args: argv,
      options: {
        'output-file': {
          type: 'string',
        },
      },
      allowPositionals: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown argument parsing error';
    logger.error(`Error parsing arguments: ${message}`);
    process.exit(1);
    return;
  }

  const { values, positionals } = parsedArgs;

  const outputFilePath = values['output-file'];
  const taskFilePath = positionals[0];

  if (!taskFilePath) {
    logger.error(
      'Usage: ts-node src/task-agent-matcher/matcher.ts [--output-file <path>] <path/to/task.yaml>',
    );
    process.exit(1);
  }

  if (outputFilePath === '') {
    logger.error('Error: --output-file flag requires a non-empty file path.');
    process.exit(1);
  }

  try {
    logger.info(`Reading task file: ${taskFilePath}`);
    const fileContents = fs.readFileSync(taskFilePath, 'utf8');
    const data: any = yaml.load(fileContents);

    if (data && data.tasks && data.tasks.length > 0) {
      const task: Task = data.tasks[0] ?? {};
      task.sourceFile = taskFilePath;

      const rawAgents = Array.isArray(task.agents) ? task.agents : [];
      const normalizedAgents = rawAgents
        .map((agent: unknown) =>
          typeof agent === 'string' ? agent.trim() : '',
        )
        .filter((agent: string) => agent.length > 0);

      if (normalizedAgents.length === 0) {
        normalizedAgents.push('codex');
      }

      const agent = normalizedAgents[0];
      task.agents = normalizedAgents;

      const usageManager = new UsageManager(agent, logger);
      logger.info('Checking for available tokens...');
      const hasTokens = await usageManager.hasTokens();

      if (!hasTokens) {
        logger.error('No tokens available for today. Exiting.');
        process.exit(1);
      }
      logger.info('Tokens are available.');

      const outputPayload: MatcherOutput = {
        repo: task.repo,
        branch: task.branch || 'main',
        agent,
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
