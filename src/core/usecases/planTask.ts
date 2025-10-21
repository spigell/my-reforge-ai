import { runPlanner } from '../../task-planner/planner.js';
import type { MatchedTask } from '../../types/task.js';
import type { Services, UseCaseRunOptions } from './types.js';
import {
  deriveTaskStem,
  deriveTimeout,
  resolveWorkspaceRoot,
  setupAbortHandling,
} from './helpers.js';
import { openPlanningPr } from './openPlanningPr.js';

export async function planTask(
  matchedTask: MatchedTask,
  services: Services,
  options: UseCaseRunOptions = {},
) {
  const { task, selectedAgent } = matchedTask;
  const { workspace, agents, pr, logger, git } = services;

  if (!task.repo || !task.branch) {
    throw new Error('Task repo and branch must be defined.');
  }

  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  logger.info(
    `Preparing workspace for planning: ${task.repo}@${task.branch} (root: ${workspaceRoot})`,
  );

  const [owner, repoName] = task.repo.split('/');
  if (!owner || !repoName) {
    throw new Error(`Task repo must be in "owner/repo" format. Received "${task.repo}".`);
  }

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

  if (task.review_required && !task.planning_pr_id) {
    const taskStem = deriveTaskStem(task.task_dir);
    const prResult = await openPlanningPr(
      {
        owner,
        repo: repoName,
        workspacePath: mainWorkspacePath,
        taskId: taskStem,
        taskDir: task.task_dir,
        taskObject: { ...task },
        featureBranch: task.branch,
        baseBranch: undefined,
        prTitle: `planning: ${taskStem}`,
        prBody: `Auto-created planning PR for task ${taskStem}`,
        draft: true,
      },
      { git, pr, logger },
    );

    task.planning_pr_id = prResult.number.toString();
    (task as Record<string, unknown> & { staging?: string }).staging = 'planning';
  }
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

    return result;
  } finally {
    dispose();
  }
}
