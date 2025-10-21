import type { PullRequestPort } from '../../core/ports/PullRequestPort.js';

export class GithubPrService implements PullRequestPort {
  async openOrGetPullRequest({
    owner,
    repo,
    headBranch,
    baseBranch,
    title,
    body,
    draft,
  }: Parameters<PullRequestPort['openOrGetPullRequest']>[0]) {
    const pseudoUrl = `https://github.com/${owner}/${repo}/pull/${encodeURIComponent(headBranch)}`;
    const draftLabel = draft ? 'draft ' : '';
    console.warn(
      `[GithubPrService] ${draftLabel}PR requested for ${owner}/${repo}@${headBranch} -> ${baseBranch ?? 'default'} (title: "${title}"). This is a stub implementation.`,
    );
    if (body) {
      console.warn('[GithubPrService] PR body preview:', body.slice(0, 200));
    }
    return {
      id: 0,
      number: 0,
      url: pseudoUrl,
      created: false,
      baseBranch: baseBranch ?? 'main',
    };
  }
}
