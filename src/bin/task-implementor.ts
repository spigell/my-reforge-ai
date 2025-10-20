import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { MatchedTask } from '../types/task.js';
import { prepareWorkspaces } from '../task-implementor/workspace-manager.js';
import { getAgent } from '../libs/agents/index.js';
import { runImplementer } from '../task-implementor/implementor.js';

const resolveInputPath = (inputPath: string) =>
  path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath);

export async function main() {
  const taskDataFilePath = process.argv[2];

  if (!taskDataFilePath) {
    console.error(
      'Usage: node dist/task-implementor/cli.js <path/to/task-data.json>',
    );
    process.exit(1);
  }

  const resolvedTaskDataPath = resolveInputPath(taskDataFilePath);

  try {
    const taskDataContent = fs.readFileSync(resolvedTaskDataPath, 'utf8');
    const data: MatchedTask = JSON.parse(taskDataContent);
    const task = data.task;

    if (task.stage !== 'implementing') {
      console.warn(
        `Warning: task stage is "${task.stage}", but implementor expects "implementing". Continuing...`,
      );
    }

    if (!task.repo || !task.branch) {
      throw new Error('Task repo and branch must be defined.');
    }

    const workspaceRoot = './workspace';
    const preparedPaths = await prepareWorkspaces(
      task.repo,
      task.branch,
      task.additionalRepos,
      workspaceRoot,
    );

    const mainWorkspacePath = preparedPaths[0];
    const additionalWorkspaces = preparedPaths.slice(1);

    const agent = getAgent(data.selectedAgent);
    const abortController = new AbortController();
    const legacyTimeoutValue = (task as Record<string, unknown>).timeoutMs;
    const legacyTimeout =
      typeof legacyTimeoutValue === 'number' ? legacyTimeoutValue : undefined;
    const timeout = task.timeout_ms ?? legacyTimeout ?? 300000;

    const timeoutId = setTimeout(() => {
      console.log(`Implementor timed out after ${timeout}ms. Aborting...`);
      abortController.abort();
    }, timeout);

    const result = await runImplementer({
      task,
      agent,
      agentId: data.selectedAgent,
      mainWorkspacePath,
      additionalWorkspaces,
      timeoutMs: timeout,
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);

    console.log(`Implementor finished with status: ${result.status}`);
    console.log('Implementor logs:\n', result.logs);
    if (result.diagnostics) {
      console.log('Implementor diagnostics:', result.diagnostics);
    }

    if (result.status !== 'success') {
      console.error('Implementor run was not successful.');
      process.exit(1);
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
