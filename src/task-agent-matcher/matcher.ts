import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { UsageManager } from '../libs/usage-manager/usage-manager.js';
import { MatchedTask, Task, Idea } from '../types/task.js';
import { DEFAULT_AGENT, normalizeAgentList } from '../types/agent.js';
import { Logger } from '../libs/logger/logger.js';

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
    const data = yaml.load(fileContents) as
      | { tasks?: unknown; ideas?: unknown }
      | undefined;

    const rawTasks = Array.isArray(data?.tasks) ? data?.tasks : undefined;
    const rawIdeas = Array.isArray(data?.ideas) ? data?.ideas : undefined;

    const rawEntry =
      rawTasks?.[0] ??
      rawIdeas?.[0];

    if (!rawEntry) {
      logger.error('No tasks or ideas found in the YAML file or invalid format.');
      process.exit(1);
      return;
    }

    const task = normalizeTaskEntry(rawEntry as Task | Idea, taskFilePath);

    const rawAgents = Array.isArray((rawEntry as { agents?: unknown }).agents)
      ? ((rawEntry as { agents: unknown[] }).agents ?? [])
      : [];
    const normalizedAgents = normalizeAgentList(rawAgents);

    if (normalizedAgents.length === 0) {
      normalizedAgents.push(DEFAULT_AGENT);
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

    const outputPayload: MatchedTask = {
      selectedAgent: agent,
      task,
    };

    const serializedPayload = JSON.stringify(outputPayload);

    if (outputFilePath) {
      fs.writeFileSync(outputFilePath, serializedPayload);
      logger.info(`Task data written to ${outputFilePath}`);
    } else {
      console.log(serializedPayload);
    }
  } catch (error: any) {
    logger.error(`Error reading or parsing task file: ${error.message}`);
    process.exit(1);
  }
}

const normalizeTaskEntry = (entry: Task | Idea, sourceFile: string): Task => {
  const candidate = { ...entry } as Record<string, unknown>;

  if (
    typeof candidate.task_dir !== 'string' &&
    typeof candidate.taskDir === 'string'
  ) {
    candidate.task_dir = candidate.taskDir;
  }

  if (
    typeof candidate.timeout_ms !== 'number' &&
    typeof candidate.timeoutMs === 'number'
  ) {
    candidate.timeout_ms = candidate.timeoutMs;
  }

  const stageValue = candidate.stage;
  const stage: Task['stage'] =
    stageValue === 'planning' || stageValue === 'implementing'
      ? stageValue
      : 'planning';

  const task: Task = {
    repo: typeof candidate.repo === 'string' ? candidate.repo : '',
    branch: typeof candidate.branch === 'string' ? candidate.branch : '',
    kind: typeof candidate.kind === 'string' ? candidate.kind : '',
    agents: [],
    task_dir:
      typeof candidate.task_dir === 'string' ? candidate.task_dir : '',
    stage,
    idea:
      typeof candidate.idea === 'string'
        ? candidate.idea
        : undefined,
    pr_link:
      typeof candidate.pr_link === 'string' ? candidate.pr_link : undefined,
    review_required:
      typeof candidate.review_required === 'boolean'
        ? candidate.review_required
        : undefined,
    timeout_ms:
      typeof candidate.timeout_ms === 'number'
        ? candidate.timeout_ms
        : undefined,
    sourceFile,
  };

  if (Array.isArray(candidate.additionalRepos)) {
    task.additionalRepos = candidate.additionalRepos as Task['additionalRepos'];
  }

  return task;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
