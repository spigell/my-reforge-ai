import fs from 'node:fs';
import path from 'node:path';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import type { LoggerPort } from '../ports/LoggerPort.js';
import type { GitService } from '../services/GitService.js';
import type { PullRequestPort } from '../ports/PullRequestPort.js';

export type OpenPlanningPrDeps = {
  git: GitService;
  pr: PullRequestPort;
  logger: LoggerPort;
};

export type OpenPlanningPrInput = {
  owner: string;
  repo: string;
  workspacePath: string;
  taskId: string;
  taskDir: string;
  taskObject: Record<string, unknown>;
  featureBranch: string;
  baseBranch?: string;
  prTitle?: string;
  prBody?: string;
  draft?: boolean;
};

const readYamlFile = (filePath: string): Record<string, unknown> => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = loadYaml(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch (error) {
    return {};
  }
};

const writeYamlFile = (filePath: string, data: Record<string, unknown>) => {
  const serialized = dumpYaml(data, { noRefs: true });
  fs.writeFileSync(filePath, serialized, 'utf8');
};

export async function openPlanningPr(
  input: OpenPlanningPrInput,
  deps: OpenPlanningPrDeps,
) {
  const {
    owner,
    repo,
    workspacePath,
    taskId,
    taskDir,
    taskObject,
    featureBranch,
    baseBranch,
    prTitle,
    prBody,
    draft,
  } = input;
  const { git, pr, logger } = deps;

  await git.ensureBranchAndSync({
    cwd: workspacePath,
    branch: featureBranch,
    base: baseBranch,
  });

  const absoluteTaskDir = path.join(workspacePath, taskDir);
  const yamlPath = path.join(absoluteTaskDir, 'task.yaml');

  fs.mkdirSync(absoluteTaskDir, { recursive: true });

  const mergedTask = {
    ...readYamlFile(yamlPath),
    ...taskObject,
  };

  writeYamlFile(yamlPath, mergedTask);

  const firstCommitCreated = await git.commitAll({
    cwd: workspacePath,
    message: `chore(task): add ${taskDir}/task.yaml`,
  });

  if (firstCommitCreated) {
    await git.push({
      cwd: workspacePath,
      branch: featureBranch,
      setUpstream: true,
    });
  } else {
    logger.info('No changes detected after writing task.yaml; skipping initial push.');
  }

  const prResult = await pr.openOrGetPullRequest({
    owner,
    repo,
    headBranch: featureBranch,
    baseBranch,
    title: prTitle ?? `planning: ${taskId}`,
    body: prBody ?? `Auto-created planning PR for task ${taskId}`,
    draft: draft ?? true,
  });

  const updatedTask = {
    ...readYamlFile(yamlPath),
    staging: 'planning',
    planning_pr_id: prResult.number,
  };

  writeYamlFile(yamlPath, updatedTask);

  const secondCommitCreated = await git.commitAll({
    cwd: workspacePath,
    message: `chore(task): reference planning PR #${prResult.number}`,
  });

  if (secondCommitCreated) {
    await git.push({
      cwd: workspacePath,
      branch: featureBranch,
    });
  } else {
    logger.info('No changes detected after PR metadata update; skipping second push.');
  }

  logger.info(
    `Planning PR ${prResult.url} ${prResult.created ? 'created' : 'already existed'}; task.yaml updated.`,
  );

  return prResult;
}
