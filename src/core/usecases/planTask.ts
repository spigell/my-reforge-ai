import { runPlanner } from '../../task-planner/planner.js';
import type { MatchedTask } from '../../types/task.js';
import type { Services, UseCaseRunOptions } from './types.js';
import {
  deriveTaskStem,
  deriveTimeout,
  resolveWorkspaceRoot,
  setupAbortHandling,
} from './helpers.js';

export async function planTask(
  matchedTask: MatchedTask,
  services: Services,
  options: UseCaseRunOptions = {},
) {
  const { task, selectedAgent } = matchedTask;
  const { workspace, agents, pr, logger } = services;

  if (!task.repo || !task.branch) {
    throw new Error('Task repo and branch must be defined.');
  }

  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  logger.info(
    `Preparing workspace for planning: ${task.repo}@${task.branch} (root: ${workspaceRoot})`,
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
    label: 'Planner',
    timeoutMs,
    externalSignal: options.signal,
  });

  try {
    const result = await runPlanner({
      task,
      agent,
      agentId: selectedAgent,
      mainWorkspacePath,
      additionalWorkspaces,
      timeoutMs,
      signal,
    });

    logger.info(`Planner finished with status: ${result.status}`);

    const shouldCreatePlanningPr =
      result.status === 'success' && task.review_required && !task.planning_pr_id;

    if (shouldCreatePlanningPr) {
      const taskStem = deriveTaskStem(task.task_dir);
      const title = `plan(${task.repo}@${task.branch}): ${taskStem}`;
      logger.info(
        `Ensuring planning PR exists for ${task.repo}@${task.branch} (title: "${title}")`,
      );
      await pr.ensurePr({
        repo: task.repo,
        branch: task.branch,
        title,
        body: result.logs,
        draft: true,
      });
    }

    return result;
  } finally {
    dispose();
  }
}
