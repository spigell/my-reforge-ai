import { parseArgs } from 'node:util';
import { main as plannerMain } from '../core/entrypoints/task-planner.js';

export async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'task-file': {
        type: 'string',
        default: 'tasks/test-task.json',
      },
      'pr-number': {
        type: 'string',
      },
    },
  });

  const command = positionals[0];
  if (command !== 'init' && command !== 'update') {
    console.error(
      'Usage: task-planner <init|update> [--task-file <path/to/task.json>] [--pr-number <number>]',
    );
    process.exit(1);
  }

  const taskDataFilePath = values['task-file'] as string;
  const prNumber = values['pr-number'] as string | undefined;

  if (command === 'update' && !prNumber) {
    console.error('--pr-number is required for the "update" command.');
    process.exit(1);
  }

  try {
    const result = await plannerMain(command, taskDataFilePath, { prNumber });
    console.log(`Planner finished with status: ${result.status}`);
    console.log('Planner logs:', result.logs);
    if (result.diagnostics) {
      console.log('Planner diagnostics:', result.diagnostics);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

void main();
