import type { PullRequestPort } from '../../core/ports/pull-request-port.js';
import { Octokit } from '@octokit/rest';

export class GithubPrService implements PullRequestPort {
  private octokit: Octokit;

  constructor() {
    // We should take the token in the only one place. @spigell.
    const githubToken = process.env.GH_TOKEN;
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
}
