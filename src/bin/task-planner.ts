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
    },
  });

  const command = positionals[0];
  if (command !== 'init' && command !== 'update') {
    console.error(
      'Usage: task-planner <init|update> [--task-file <path/to/task.json>]',
    );
    process.exit(1);
  }

  const taskDataFilePath = values['task-file'] as string;

  try {
    const result = await plannerMain(command, taskDataFilePath);
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
