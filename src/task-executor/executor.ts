import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { spawn } from 'child_process';
import { prepareWorkspaces } from './workspace-manager.js';
import { MatchedTask } from '../types/task.js';

async function main() {
  const promptTemplatePath = process.argv[2];
  const taskDataFilePath = process.argv[3]; // Expecting path to task data file

  if (!promptTemplatePath || !taskDataFilePath) {
    console.error(
      'Usage: ts-node src/task-executor/executor.ts <path/to/prompt-template.md> <path/to/task-data.json>',
    );
    process.exit(1);
  }

  try {
    const taskDataContent = fs.readFileSync(taskDataFilePath, 'utf8');
    const data: MatchedTask = JSON.parse(taskDataContent);
    const taskData = data.task;
    const workspaceRoot = `./workspace`;

    const preparedPaths = await prepareWorkspaces(
      taskData.repo,
      taskData.branch,
      taskData.additionalRepos,
      workspaceRoot,
    );

    const mainWorkspacePath = preparedPaths[0]; // Assuming the first path is the main repo

    const templateContent = fs.readFileSync(promptTemplatePath, 'utf8');
    const template = handlebars.compile(templateContent);

    // Placeholder for additional context data that might be needed by the template
    const context = {
      task: taskData,
      // Add other context variables as needed by the template, e.g., review_context, repo_tree_context, current_pr_url
      // For now, we'll just pass the task data.
    };

    const renderedPrompt = template(context);

    // Execute codex cli
    const codexProcess = spawn('codex', ['cli', '--non-interactive'], {
      // Assuming '--non-interactive' is the flag
      cwd: mainWorkspacePath, // Run codex in the prepared workspace
      stdio: ['pipe', process.stdout, process.stderr],
    });

    codexProcess.stdin.write(renderedPrompt);
    codexProcess.stdin.end();

    codexProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Codex CLI exited with code ${code}`);
        process.exit(code || 1);
      }
    });
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
