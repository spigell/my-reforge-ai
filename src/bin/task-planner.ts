import { fileURLToPath } from 'node:url';
import path from 'path';
import { main as plannerMain } from '../core/entrypoints/plannerMain.js';

export async function main() {
  const taskDataFilePath = process.argv[2];

  if (!taskDataFilePath) {
    console.error(
      'Usage: node dist/task-planner/cli.js <path/to/task-data.json>',
    );
    process.exit(1);
  }

  try {
    const result = await plannerMain(taskDataFilePath);
    console.log(`Planner finished with status: ${result.status}`);
    console.log('Planner logs:\n', result.logs);
    if (result.diagnostics) {
      console.log('Planner diagnostics:', result.diagnostics);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

const isDirectExecution = () => {
  if (!process.argv[1]) return false;
  const modulePath = fileURLToPath(import.meta.url);
  return path.resolve(process.argv[1]) === path.resolve(modulePath);
};

if (isDirectExecution()) {
  void main();
}
