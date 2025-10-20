import { fileURLToPath } from 'node:url';
import path from 'path';
import { main as implementorMain } from '../core/entrypoints/implementorMain.js';

export async function main() {
  const taskDataFilePath = process.argv[2];

  if (!taskDataFilePath) {
    console.error(
      'Usage: node dist/task-implementor/cli.js <path/to/task-data.json>',
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

const isDirectExecution = () => {
  if (!process.argv[1]) return false;
  const modulePath = fileURLToPath(import.meta.url);
  return path.resolve(process.argv[1]) === path.resolve(modulePath);
};

if (isDirectExecution()) {
  void main();
}
