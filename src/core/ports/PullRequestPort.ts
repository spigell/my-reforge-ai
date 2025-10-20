export interface PullRequestPort {
  ensurePr(params: {
    repo: string;
    branch: string;
    title: string;
    body?: string;
    draft?: boolean;
  }): Promise<{ url: string; number: number; created: boolean }>;
}
