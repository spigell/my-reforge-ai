import type { PullRequestPort } from '../../core/ports/PullRequestPort.js';

export class GithubPrService implements PullRequestPort {
  async ensurePr({
    repo,
    branch,
    title,
    body,
    draft,
  }: Parameters<PullRequestPort['ensurePr']>[0]) {
    const pseudoUrl = `https://github.com/${repo}/pull/${encodeURIComponent(branch)}`;
    const draftLabel = draft ? 'draft ' : '';
    console.warn(
      `[GithubPrService] ${draftLabel}PR requested for ${repo}@${branch} with title "${title}". This is a stub implementation.`,
    );
    if (body) {
      console.warn('[GithubPrService] PR body preview:', body.slice(0, 200));
    }
    return { url: pseudoUrl, number: 0, created: false };
  }
}
