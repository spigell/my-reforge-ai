export interface PullRequestPort {
  openPullRequest(params: {
    owner: string;
    repo: string;
    headBranch: string;
    baseBranch?: string;
    title: string;
    body?: string;
    draft?: boolean;
  }): Promise<{
    id: number;
    number: number;
    url: string;
    created: boolean;
    baseBranch: string;
  }>;
}

export interface PullRequestStatusPort {
  getPullRequestStatus(params: {
    owner: string;
    repo: string;
    prNumber: number;
  }): Promise<{
    merged: boolean;
    state: 'open' | 'closed';
    url: string;
    title: string;
  }>;
}
