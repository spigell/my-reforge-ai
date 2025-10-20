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

void main();
