
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { spawn } from 'child_process';
import { prepareWorkspace } from './workspace-manager.js';

async function main() {
  const promptTemplatePath = process.argv[2];
  const taskDataJson = process.argv[3]; // Expecting task data as JSON string

  if (!promptTemplatePath || !taskDataJson) {
    console.error('Usage: ts-node src/task-executor/executor.ts <path/to/prompt-template.md> <task-data-json>');
    process.exit(1);
  }

  try {
    const taskData = JSON.parse(taskDataJson);
    const workspacePath = `./workspace/${taskData.repo}`;
    const repoUrl = `https://github.com/${taskData.repo}.git`;

    await prepareWorkspace(repoUrl, taskData.branch, workspacePath);

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
    const codexProcess = spawn('codex', ['cli', '--non-interactive'], { // Assuming '--non-interactive' is the flag
      cwd: workspacePath, // Run codex in the prepared workspace
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
