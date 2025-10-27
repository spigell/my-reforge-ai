import { runPlanner } from '../../../task-planner/planner.js';
import type { MatchedTask } from '../../../types/task.js';
import type { Services, UseCaseRunOptions } from '../types.js';
import fs from 'node:fs';
import path from 'node:path';
import { deriveTimeout, resolveWorkspaceRoot, setupAbortHandling, writeYamlFile } from '../helpers.js';
import { openPlanningPr } from './open-pr.js';

export type PlanTaskOptions = UseCaseRunOptions & {
  tasksRepoPath?: string;
};

export async function planTask(
  command: string,
  matchedTask: MatchedTask,
  services: Services,
  options: PlanTaskOptions = {},
) {
  const { task, selectedAgent } = matchedTask;
  const { workspace, agents, pr, logger, git } = services;

  // TO DO: It should be checked in validation layer. @spigell
  if (!task.repo || !task.branch) {
    throw new Error('Task repo and branch must be defined.');
  }

  if (command === 'init') {
    if (!task.idea) {
      throw new Error('Planning stage requires an idea to generate a plan.');
    }
  } else {
    if (!task.planning_pr_id) {
      throw new Error(
        `Command "${command}" requires a planning_pr_id, but it's missing.`,
      );
    }
  }

  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);

  const [owner, repoName] = ['spigell', 'my-reforge-ai']

  if (!options.tasksRepoPath) {
    throw new Error(
      'tasksRepoPath must be provided so the planning agent can write to the tasks repository.',
    );
  }

  const allAdditionalRepos = [
    ...(task.additionalRepos || []),
    {
      repo: `${owner}/${repoName}`,
      branch: 'main',
      rootDir: options.tasksRepoPath
    }
  ];

  const preparedPaths = await workspace.prepare({
    repo: task.repo,
    branch: task.branch,
    additionalRepos: allAdditionalRepos,
    rootDir: workspaceRoot,
  });

  // It should rewritten in prepare() @spigell
  if (preparedPaths.length === 0) {
    throw new Error('Workspace preparation returned no paths.');
  }

  const mainWorkspacePath = preparedPaths[0];
  let tasksRepoWorkspace = '';

  // Find the tasks repository workspace path
  for (const p of preparedPaths) {
    if (p.includes(options.tasksRepoPath)) {
      tasksRepoWorkspace = p;
      break;
    }
  }

  if (!tasksRepoWorkspace) {
    throw new Error(
      `Tasks repository path ${options.tasksRepoPath} not found in prepared workspaces.`,
    );
  }

  // Filter out the tasksRepoWorkspace from additionalWorkspaces for the agent's perspective
  const additionalWorkspaces = preparedPaths.filter(
    (p) => p !== mainWorkspacePath && p !== tasksRepoWorkspace,
  );

  if (command === 'init') {
    await git.ensureBranchAndSync({ cwd: tasksRepoWorkspace, branch: task.branch });

    logger.info(`Git: Committing empty commit in ${tasksRepoWorkspace}`);
    const emptyCommitCreated = await git.commitEmpty({
      cwd: tasksRepoWorkspace,
      message: 'Empty commit',
    });

    if (!emptyCommitCreated) {
      throw new Error('Failed to create bootstrap empty commit.');
    }
    logger.info(
      `Git: Pushing branch ${task.branch} to upstream from ${tasksRepoWorkspace}`,
    );
    await git.push({
      cwd: tasksRepoWorkspace,
      branch: task.branch,
      setUpstream: true,
    });

    const prResult = await openPlanningPr(
      {
        owner,
        repo: repoName,
        workspacePath: tasksRepoWorkspace,
        prTitle: 'Auto created PR',
        featureBranch: task.branch,
        baseBranch: 'main',
        prBody: `Auto-created planning PR for task with idea: 
${task.idea}`,
        draft: false,
      },
      { pr, logger },
    );

    logger.info(
      `Git: Ensuring and syncing branch 'main' in ${tasksRepoWorkspace}`,
    );
    await git.ensureBranchAndSync({ cwd: tasksRepoWorkspace, branch: 'main' });

    task.planning_pr_id = prResult.number.toString();
    task.stage = 'planning';

    const absoluteTaskDir = path.join(tasksRepoWorkspace, task.task_dir);
    const yamlPath = path.join(absoluteTaskDir, 'task.yaml');

    fs.mkdirSync(absoluteTaskDir, { recursive: true });

    writeYamlFile(yamlPath, task);

    logger.info(
      `Git: Commiting all changes in ${tasksRepoWorkspace} with message: "chore(task): add ${task.task_dir}/task.yaml"`,
    );
    await git.commitAll({
      cwd: tasksRepoWorkspace,
      message: `chore(task): add ${task.task_dir}/task.yaml`,
    });

    logger.info(`Git: Pushing branch 'main' from ${tasksRepoWorkspace}`);
    await git.push({
      cwd: tasksRepoWorkspace,
      branch: 'main',
    });

    logger.info(
      `Git: Ensuring and syncing branch ${task.branch} in ${tasksRepoWorkspace}`,
    );
    await git.ensureBranchAndSync({
      cwd: tasksRepoWorkspace,
      branch: task.branch,
    });
    logger.info(
      `Git: Merging branch 'main' into ${task.branch} in ${tasksRepoWorkspace}`,
    );
    await git.mergeBranch({ cwd: tasksRepoWorkspace, from: 'main' });
    logger.info(`Git: Pushing branch ${task.branch} from ${tasksRepoWorkspace}`);
    await git.push({
      cwd: tasksRepoWorkspace,
      branch: task.branch,
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
      command,
      task,
      agent,
      agentId: selectedAgent,
      mainWorkspacePath,
      additionalWorkspaces,
      tasksRepositoryWorkspace: tasksRepoWorkspace,
      timeoutMs,
      signal,
      onData: options.onData,
    });

    logger.info(`Planner finished with status: ${result.status}`);

    return result;
  } finally {
    dispose();
  }
}