export interface GitService {
  ensureBranchAndSync(opts: {
    cwd: string;
    branch: string;
    base?: string;
  }): Promise<void>;

  commitAll(opts: {
    cwd: string;
    message: string;
  }): Promise<boolean>;

  push(opts: {
    cwd: string;
    branch: string;
    setUpstream?: boolean;
  }): Promise<void>;
}
