import { runPlanner } from '../../../task-planner/planner.js';
import type { MatchedTask } from '../../../types/task.js';
import type { Services, UseCaseRunOptions } from '../types.js';
import fs from 'node:fs';
import {
  deriveTimeout,
  resolveWorkspaceRoot,
  setupAbortHandling,
  writeYamlFile,
} from '../helpers.js';
import { openPlanningPr } from './open-pr.js';
import path from 'node:path';

export async function planTask(
  matchedTask: MatchedTask,
  services: Services,
  options: UseCaseRunOptions = {},
) {
  const { task, selectedAgent } = matchedTask;
  const { workspace, agents, pr, logger, git } = services;

  // TO DO: It should be checked in validation layer. @spigell
  if (!task.repo || !task.branch) {
    throw new Error('Task repo and branch must be defined.');
  }

  if (!task.idea) {
    throw new Error('Planning stage requires an idea to generate a plan.');
  }

  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  logger.info(
    `Preparing workspace for planning: ${task.repo}@${task.branch} (root: ${workspaceRoot})`,
  );

  const [owner, repoName] = task.repo.split('/');
  if (!owner || !repoName) {
    throw new Error(
      `Task repo must be in "owner/repo" format. Received "${task.repo}".`,
    );
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

  if (!task.planning_pr_id) {
    try {
      logger.info(`Git: Committing empty commit in ${mainWorkspacePath}`);
      git.commitEmpty({ cwd: mainWorkspacePath, message: 'Test commit' });
      logger.info(
        `Git: Pushing branch ${task.branch} to upstream from ${mainWorkspacePath}`,
      );
      git.push({
        cwd: mainWorkspacePath,
        branch: task.branch,
        setUpstream: true,
      });

      const prResult = await openPlanningPr(
        {
          owner,
          repo: repoName,
          workspacePath: mainWorkspacePath,
          taskDir: task.task_dir,
          taskObject: { ...task },
          featureBranch: task.branch,
          baseBranch: undefined,
          prTitle: `planning: <change here>`,
          prBody: `Auto-created planning PR for task with idea: 
${task.idea}`,
          draft: true,
        },
        { pr, logger },
      );

      logger.info(
        `Git: Ensuring and syncing branch 'main' in ${mainWorkspacePath}`,
      );
      await git.ensureBranchAndSync({ cwd: mainWorkspacePath, branch: 'main' });

      task.planning_pr_id = prResult.number.toString();
      task.stage = 'planning';

      const absoluteTaskDir = path.join(mainWorkspacePath, task.task_dir);
      const yamlPath = path.join(absoluteTaskDir, 'task.yaml');

      fs.mkdirSync(absoluteTaskDir, { recursive: true });

      writeYamlFile(yamlPath, task);

      logger.info(
        `Git: Committing all changes in ${mainWorkspacePath} with message: "chore(task): add ${task.task_dir}/task.yaml"`,
      );
      await git.commitAll({
        cwd: mainWorkspacePath,
        message: `chore(task): add ${task.task_dir}/task.yaml`,
      });

      logger.info(`Git: Pushing branch 'main' from ${mainWorkspacePath}`);
      await git.push({
        cwd: mainWorkspacePath,
        branch: 'main',
      });

      logger.info(
        `Git: Ensuring and syncing branch ${task.branch} in ${mainWorkspacePath}`,
      );
      await git.ensureBranchAndSync({
        cwd: mainWorkspacePath,
        branch: task.branch,
      });
      logger.info(
        `Git: Merging branch 'main' into ${task.branch} in ${mainWorkspacePath}`,
      );
      await git.mergeBranch({ cwd: mainWorkspacePath, from: 'main' });
      logger.info(
        `Git: Pushing branch ${task.branch} from ${mainWorkspacePath}`,
      );
      await git.push({
        cwd: mainWorkspacePath,
        branch: task.branch,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(`Git operation failed: ${error.message}`);
      } else {
        logger.error(`Git operation failed: ${String(error)}`);
      }
      throw error;
    }
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
