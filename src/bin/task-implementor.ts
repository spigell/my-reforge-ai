import { parseArgs } from 'node:util';
import { main as implementorMain } from '../core/entrypoints/implementorMain.js';

export async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'task-file': {
        type: 'string',
      },
    },
  });

  const command = positionals[0];

  if (command !== 'run') {
    console.error(
      'Usage: task-implementor run --task-file <path/to/task-data.json>',
    );
    process.exit(1);
  }

  const taskDataFilePath = values['task-file'];

  if (!taskDataFilePath) {
    console.error(
      'Usage: task-implementor run --task-file <path/to/task-data.json>',
    );
    process.exit(1);
  }

  try {
    const result = await implementorMain(taskDataFilePath);
    console.log(`Implementor finished with status: ${result.status}`);
    console.log('Implementor logs:\n', result.logs);
    if (result.diagnostics) {
      console.log('Implementor diagnostics:', result.diagnostics);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

void main();
