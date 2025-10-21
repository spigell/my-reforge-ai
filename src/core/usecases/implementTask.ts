import { runImplementer } from '../../task-implementor/implementor.js';
import type { MatchedTask } from '../../types/task.js';
import type { Services, UseCaseRunOptions } from './types.js';
import {
  deriveTimeout,
  resolveWorkspaceRoot,
  setupAbortHandling,
} from './helpers.js';

export async function implementTask(
  matchedTask: MatchedTask,
  services: Services,
  options: UseCaseRunOptions = {},
) {
  const { task, selectedAgent } = matchedTask;
  const { workspace, agents, pr, logger } = services;

  if (!task.repo || !task.branch) {
    throw new Error('Task repo and branch must be defined.');
  }

  const [owner, repoName] = task.repo.split('/');
  if (!owner || !repoName) {
    throw new Error(`Task repo must be in "owner/repo" format. Received "${task.repo}".`);
  }

  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  logger.info(
    `Preparing workspace for implementation: ${task.repo}@${task.branch} (root: ${workspaceRoot})`,
  );

  const preparedPaths = await workspace.prepare({
    repo: task.repo,
    branch: task.branch,
    additionalRepos: task.additionalRepos,
    rootDir: workspaceRoot,
  });

  if (preparedPaths.length === 0) {
    throw new Error('Workspace preparation returned no paths.');
  }

  const [mainWorkspacePath, ...additionalWorkspaces] = preparedPaths;
  const agent = agents.getAgent(selectedAgent);
  const timeoutMs = deriveTimeout(task, options.timeoutMs);

  const { signal, dispose } = setupAbortHandling({
    logger,
    label: 'Implementor',
    timeoutMs,
    externalSignal: options.signal,
  });

  try {
    const result = await runImplementer({
      task,
      agent,
      agentId: selectedAgent,
      mainWorkspacePath,
      additionalWorkspaces,
      timeoutMs,
      signal,
    });

    logger.info(`Implementor finished with status: ${result.status}`);

    const shouldEnsurePr = result.status === 'success' && task.review_required;

    if (shouldEnsurePr) {
      const title = `feat(${task.repo}@${task.branch}): ${task.task_dir}`;
      logger.info(
        `Ensuring implementation PR exists for ${task.repo}@${task.branch} (title: "${title}")`,
      );
      await pr.openOrGetPullRequest({
        owner,
        repo: repoName,
        headBranch: task.branch,
        title,
        body: result.logs,
      });
    }

    return result;
  } finally {
    dispose();
  }
}
