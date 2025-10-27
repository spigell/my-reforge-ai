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
      'tasks-repo-path': {
        type: 'string',
        default: 'remove it'
      },
    },
  });

  const command = positionals[0];
  if (command !== 'init' && command !== 'update') {
    console.error(
      'Usage: task-planner <init|update> [--task-file <path/to/task.json>] [--tasks-repo-path <path/to/tasks/repo>]',
    );
    process.exit(1);
  }

  const taskDataFilePath = values['task-file'] as string;
  const tasksRepoPath = values['tasks-repo-path'] as string;

  try {
    const result = await plannerMain(command, taskDataFilePath, {
      tasksRepoPath,
    });
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