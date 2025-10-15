import * as fs from 'fs';
import * as yaml from 'js-yaml';

async function main() {
  const taskFilePath = process.argv[2]; // Expecting task file path as argument

  if (!taskFilePath) {
    console.error('Usage: ts-node src/task-picker/cli.ts <path/to/task.yaml>');
    process.exit(1);
  }

  try {
    const fileContents = fs.readFileSync(taskFilePath, 'utf8');
    const data: any = yaml.load(fileContents);

    if (data && data.tasks && data.tasks.length > 0) {
      const repo = data.tasks[0].repo;
      console.log(repo);
    } else {
      console.error('No tasks found in the YAML file or invalid format.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`Error reading or parsing task file: ${error.message}`);
    process.exit(1);
  }
}

main();
