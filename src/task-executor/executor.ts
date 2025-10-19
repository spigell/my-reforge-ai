import * as fs from 'fs';
import * as path from 'path';
import handlebars from 'handlebars'; // Changed import statement
import { fileURLToPath } from 'node:url';
import { prepareWorkspaces } from './workspace-manager.js';
import { MatchedTask } from '../types/task.js';
import { getAgent } from './agents/index.js';

type ExecutorDependencies = {
  prepareWorkspaces: typeof prepareWorkspaces;
  getAgent: typeof getAgent;
};

const defaultDependencies: ExecutorDependencies = {
  prepareWorkspaces,
  getAgent,
};

const dependencies: ExecutorDependencies = { ...defaultDependencies };

export const __setExecutorDependencies = (overrides: Partial<ExecutorDependencies>) => {
  Object.assign(dependencies, overrides);
};

export const __resetExecutorDependencies = () => {
  Object.assign(dependencies, defaultDependencies);
};

export async function main() {
  const taskDataFilePath = process.argv[2];

  if (!taskDataFilePath) {
    console.error(
      'Usage: node dist/task-executor/executor.js <path/to/task-data.json>',
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

    const preparedPaths = await dependencies.prepareWorkspaces(
      taskData.repo,
      taskData.branch,
      taskData.additionalRepos,
      workspaceRoot,
    );

    const mainWorkspacePath = preparedPaths[0]; // Assuming the first path is the main repo

    let promptTemplatePath = 'unknown';

    if (taskData.stage === 'planning') {
      promptTemplatePath = path.resolve(
        path.dirname(process.argv[1]),
        'planning-promt-tmpl.md',
      );
    }

    const resolvedTemplatePath = path.resolve(promptTemplatePath);

    console.log(`Using prompt template: ${resolvedTemplatePath}`);

    const templateContent = fs.readFileSync(resolvedTemplatePath, 'utf8');
    const template = handlebars.compile(templateContent, { noEscape: true });

    const context = {
      task: taskData,
    };

    const renderedPrompt = template(context);
    console.log(renderedPrompt);

    const unresolvedVars = renderedPrompt.match(/{{(.*?)}}/g);
    if (unresolvedVars) {
      console.warn(
        `Warning: The following template variables were not resolved: ${unresolvedVars.join(
          ', ',
        )}`,
      );
    }

    let agentPrompt = renderedPrompt;
    if (taskData.stage === 'planning') {
      const promptFileName = 'planning-prompt.md';
      const promptFilePath = path.join(mainWorkspacePath, promptFileName);

      fs.writeFileSync(promptFilePath, renderedPrompt, 'utf8');
      console.log(`Planning prompt written to: ${promptFilePath}`);

      agentPrompt =
        'Read the prompt file ./planning-prompt.md in this workspace and execute.';
    }

    const agent = dependencies.getAgent(data.selectedAgent);
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
        prompt: agentPrompt,
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
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

const isDirectExecution = () => {
  if (!process.argv[1]) return false;
  const executorPath = fileURLToPath(import.meta.url);
  return path.resolve(process.argv[1]) === path.resolve(executorPath);
};

if (isDirectExecution()) {
  void main();
}
