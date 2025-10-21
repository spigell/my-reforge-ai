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

  if (!task.planning_pr_id) {

    git.commitEmpty({cwd: mainWorkspacePath, message: 'Test commit'})
    git.push({cwd: mainWorkspacePath, branch: task.branch, setUpstream: true})

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
        prBody: `Auto-created planning PR for task with idea: \n${task.idea}`,
        draft: true,
      },
      { pr, logger },
    );

    await git.ensureBranchAndSync({cwd: mainWorkspacePath, branch: 'main'})

    task.planning_pr_id = prResult.number.toString();
    task.stage = 'planning';

    const absoluteTaskDir = path.join(mainWorkspacePath, task.task_dir);
    const yamlPath = path.join(absoluteTaskDir, 'task.yaml');

    fs.mkdirSync(absoluteTaskDir, { recursive: true });

    writeYamlFile(yamlPath, task);

    await git.commitAll({
      cwd: mainWorkspacePath,
      message: `chore(task): add ${task.task_dir}/task.yaml`,
    });

    await git.push({
      cwd: mainWorkspacePath,
      branch: 'main'
    });

    await git.ensureBranchAndSync({cwd: mainWorkspacePath, branch: task.branch})
    await git.mergeBranch({cwd: mainWorkspacePath, from: 'main'})
    await git.push({
      cwd: mainWorkspacePath,
      branch: task.branch
    });
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
