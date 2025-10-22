export interface WorkspacePort {
  prepare(params: {
    repo: string;
    branch: string;
    additionalRepos?: Array<{
      repo: string;
      branch?: string;
      directoryName?: string;
    }>;
    rootDir: string;
  }): Promise<string[]>;
}
