import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import * as yaml from 'js-yaml';
import { prepareWorkspaces } from './workspace-manager.js';
import { MatchedTask } from '../types/task.js';
import { getAgent } from './agents/index.js';

async function main() {
  const [, , arg1, arg2] = process.argv;
  let promptTemplatePath = arg2 ? arg1 : undefined;
  const taskDataFilePath = arg2 ?? arg1;

  if (!taskDataFilePath) {
    console.error(
      'Usage: node dist/task-executor/executor.js <path/to/prompt-template.md> <path/to/task-data.json>',
    );
    console.error(
      '       node dist/task-executor/executor.js <path/to/task-data.json> (planning stage only)',
    );
    process.exit(1);
  }

  const resolvedTaskDataPath = path.resolve(taskDataFilePath);

  try {
    const taskDataContent = fs.readFileSync(resolvedTaskDataPath, 'utf8');
    const data: MatchedTask = JSON.parse(taskDataContent);
    const taskData = data.task;
    const workspaceRoot = `./workspace`;

    if (!taskData.repo || !taskData.branch) {
      throw new Error('Task repo and branch must be defined.');
    }

    const preparedPaths = await prepareWorkspaces(
      taskData.repo,
      taskData.branch,
      taskData.additionalRepos,
      workspaceRoot,
    );

    const mainWorkspacePath = preparedPaths[0]; // Assuming the first path is the main repo

    if (!promptTemplatePath) {
      if (taskData.stage === 'planning') {
        promptTemplatePath = path.resolve(
          path.dirname(process.argv[1]),
          'planning-promt-tmpl.md',
        );
      } else {
        throw new Error(
          'Prompt template path is required for non-planning stages.',
        );
      }
    }

    const resolvedTemplatePath = path.resolve(promptTemplatePath);

    console.log(`Using prompt template: ${resolvedTemplatePath}`);

    const templateContent = fs.readFileSync(resolvedTemplatePath, 'utf8');
    const template = handlebars.compile(templateContent, { noEscape: true });

    const file_stem = taskData.sourceFile
      ? path.basename(taskData.sourceFile, path.extname(taskData.sourceFile))
      : 'unknown';

    const context = {
      task: taskData,
      file_stem: file_stem,
      serialized_task_yaml: yaml.dump(taskData),
      review_context: '{{review_context}}',
      repo_tree_context: '{{repo_tree_context}}',
      current_pr_url: '{{current_pr_url}}',
      tasks_repo_url: '{{tasks_repo_url}}',
    };

    const renderedPrompt = template(context);

    const unresolvedVars = renderedPrompt.match(/{{(.*?)}}/g);
    if (unresolvedVars) {
      console.warn(
        `Warning: The following template variables were not resolved: ${unresolvedVars.join(
          ', ',
        )}`,
      );
    }

    const agent = getAgent(data.selectedAgent);
    const abortController = new AbortController();
    const timeout = taskData.timeoutMs || 300000; // Default 5 mins

    const timeoutId = setTimeout(() => {
      console.log(`Task timed out after ${timeout}ms. Aborting...`);
      abortController.abort();
    }, timeout);

    console.log(
      `Running agent "${data.selectedAgent}" with a timeout of ${timeout}ms...`,
    );

    const agentResult = await agent.run(
      {
        targetWorkspace: mainWorkspacePath,
        additionalWorkspaces: preparedPaths.slice(1),
        prompt: renderedPrompt,
        timeoutMs: timeout,
        model: data.selectedAgent,
      },
      abortController.signal,
    );

    clearTimeout(timeoutId);

    console.log(`Agent finished with status: ${agentResult.status}`);
    console.log('Agent logs:\n', agentResult.logs);
    if (agentResult.diagnostics) {
      console.log('Agent diagnostics:', agentResult.diagnostics);
    }

    if (agentResult.status !== 'success') {
      console.error('Agent run was not successful.');
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
