import { parseArgs } from 'node:util';
import { main as matcherMain } from '../core/entrypoints/task-agent-matcher.js';

async function main() {
  let parsedArgs;
  try {
    parsedArgs = parseArgs({
      args: process.argv.slice(2),
      options: {
        'output-file': {
          type: 'string',
          default: 'task.json',
        },
        'pr-number': {
          type: 'string',
        },
        'task-dir': {
          type: 'string',
          default: 'tasks',
        },
      },
      allowPositionals: true,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown argument parsing error';
    console.error(`Error parsing arguments: ${message}`);
    process.exit(1);
  }

  const { values, positionals } = parsedArgs;
  const command = positionals[0];
  const ideasFilePath = positionals[1];

  if (command !== 'pick' && command !== 'take-from-pr') {
    console.error(
      'Usage: task-agent-matcher <pick|take-from-pr> [--task-dir <path/to/tasks>] [--output-file <path>] [--pr-number <number>]',
    );
    process.exit(1);
  }

  if (!ideasFilePath && command == 'pick') {
    throw new Error('ideas file is required for pick command');
  }

  const options = {
    outputFile: values['output-file'],
    prNumber: values['pr-number'] as string | undefined,
    taskDir: values['task-dir'] as string | undefined,
    ideasFilePath: ideasFilePath,
  };

  if (command === 'take-from-pr' && !options.prNumber) {
    console.error('--pr-number is required for take-from-pr command');
    process.exit(1);
  }

  try {
    await matcherMain(command, options);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

void main();
