import type { LoggerPort } from '../../ports/logger-port.js';
import type { PullRequestPort } from '../../ports/pull-request-port.js';

export type OpenPlanningPrDeps = {
  pr: PullRequestPort;
  logger: LoggerPort;
};

export type OpenPlanningPrInput = {
  owner: string;
  repo: string;
  workspacePath: string;
  taskDir: string;
  taskObject: Record<string, unknown>;
  featureBranch: string;
  baseBranch?: string;
  prTitle?: string;
  prBody?: string;
  draft?: boolean;
};

export async function openPlanningPr(
  input: OpenPlanningPrInput,
  deps: OpenPlanningPrDeps,
) {
  const { owner, repo, featureBranch, baseBranch, prTitle, prBody, draft } =
    input;
  const { pr, logger } = deps;

  const prResult = await pr.openOrGetPullRequest({
    owner,
    repo,
    headBranch: featureBranch,
    baseBranch,
    title: prTitle ?? 'test',
    body: prBody,
    draft: draft ?? true,
  });

  logger.info(
    `Planning PR ${prResult.url} ${prResult.created ? 'created' : 'already existed'}; task.yaml updated.`,
  );

  return prResult;
}
