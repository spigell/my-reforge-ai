import type {
  PullRequestPort,
  PullRequestStatusPort,
} from '../../core/ports/pull-request-port.js';
import { Octokit } from '@octokit/rest';
import { resolveGithubToken } from '../../libs/github-token.js';

type GithubPrServiceOptions = {
  token?: string;
};

export class GithubPrService
  implements PullRequestPort, PullRequestStatusPort
{
  private octokit: Octokit;

  constructor(options: GithubPrServiceOptions = {}) {
    const githubToken =
      options.token ??
      resolveGithubToken({
        required: true,
      });
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN environment variable is not set.');
    }
    this.octokit = new Octokit({ auth: githubToken });
  }

  async openPullRequest({
    owner,
    repo,
    headBranch,
    baseBranch,
    title,
    body,
    draft,
  }: Parameters<PullRequestPort['openPullRequest']>[0]) {
    const actualBaseBranch = baseBranch ?? 'main';

    // If no existing PR, create a new one
    const newPr = await this.octokit.rest.pulls.create({
      owner,
      repo,
      title,
      head: headBranch,
      base: actualBaseBranch,
      body,
      draft,
    });

    return {
      id: newPr.data.id,
      number: newPr.data.number,
      url: newPr.data.html_url,
      created: true,
      baseBranch: newPr.data.base.ref,
    };
  }

  async getPullRequestStatus({
    owner,
    repo,
    prNumber,
  }: Parameters<PullRequestStatusPort['getPullRequestStatus']>[0]) {
    const pr = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    const merged =
      typeof pr.data.merged === 'boolean'
        ? pr.data.merged
        : pr.data.merged_at !== null;

    const state: 'open' | 'closed' = pr.data.state === 'open' ? 'open' : 'closed';

    return {
      merged,
      state,
      url: pr.data.html_url,
      title: pr.data.title,
    };
  }
}
