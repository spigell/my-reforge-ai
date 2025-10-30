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
      'workspace-root': {
        type: 'string',
        // No default, as it's optional and might be inferred or handled by the core logic
      },
      'non-interactive': {
        type: 'boolean',
        default: false,
      },
    },
  });

  const command = positionals[0];
  if (command !== 'init' && command !== 'update') {
    console.error(
      'Usage: task-planner <init|update> [--task-file <path/to/task.json>] [--workspace-root <path/to/workspace/root>] [--non-interactive]',
    );
    process.exit(1);
  }

  const taskDataFilePath = values['task-file'] as string;
  const workspaceRoot = values['workspace-root'] as string | undefined;
  const nonInteractive = values['non-interactive'] as boolean;

  try {
    const result = await plannerMain(command, taskDataFilePath, {
      workspaceRoot,
      nonInteractive,
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