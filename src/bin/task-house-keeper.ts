import { parseArgs } from 'node:util';
import { main as houseKeeperMain } from '../core/entrypoints/house-keeper.js';

export async function main() {
  const { values } = parseArgs({
    options: {
      'tasks-root': {
        type: 'string',
        default: 'tasks',
      },
      'completed-dir': {
        type: 'string',
        default: 'completed',
      },
    },
  });

  try {
    await houseKeeperMain({
      tasksRoot: values['tasks-root'],
      completedDirName: values['completed-dir'],
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`House keeper failed: ${message}`);
    process.exit(1);
  }
}

void main();
