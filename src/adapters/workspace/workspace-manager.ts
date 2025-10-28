import fs from 'node:fs';
import path from 'node:path';
import simpleGit, { SimpleGit } from 'simple-git';
import type { WorkspacePort } from '../../core/ports/workspace-port.js';
import type { AdditionalRepo } from '../../types/task.js';
import { resolveGithubToken } from '../../libs/github-token.js';

type WorkspaceManagerOptions = {
  githubToken?: string;
};

export class WorkspaceManager implements WorkspacePort {
  constructor(options: WorkspaceManagerOptions = {}) {
    this.githubToken =
      options.githubToken ??
      resolveGithubToken({
        required: false,
      });
  }

  private readonly githubToken: string | undefined;

  async prepare(
    options: Parameters<WorkspacePort['prepare']>[0],
  ): Promise<string[]> {
    const resolvedRoot = path.resolve(options.rootDir);
    fs.mkdirSync(resolvedRoot, { recursive: true });
    return this.prepareWorkspaces(
      options.repo,
      options.branch,
      options.additionalRepos,
      resolvedRoot,
    );
  }

  private async prepareWorkspaces(
    mainRepoSlug: string,
    mainBranch: string,
    additionalRepos: AdditionalRepo[] | undefined,
    workspaceRoot: string,
  ): Promise<string[]> {
    const preparedPaths: string[] = [];
    const git: SimpleGit = simpleGit();

    const prepareSingleRepo = async (
      repoSlug: string,
      targetBranch: string | undefined,
      directoryName: string | undefined,
    ): Promise<string> => {
      let repoUrl = `https://github.com/${repoSlug}.git`;
      if (this.githubToken) {
        console.log('Using GITHUB_TOKEN for authentication in repo URL.');
        repoUrl = `https://x-access-token:${this.githubToken}@github.com/${repoSlug}.git`;
      }

      const targetDirectoryName = directoryName ?? repoSlug;
      const repoPath = path.join(workspaceRoot, targetDirectoryName);

      try {
        if (fs.existsSync(repoPath)) {
          console.log(`Recursively deleting existing directory: ${repoPath}`);
          fs.rmSync(repoPath, { recursive: true, force: true });
        }

        console.log(`Cloning ${repoSlug} into ${repoPath}`);
        await git.clone(repoUrl, repoPath);
        await git.cwd(repoPath);

        if (targetBranch) {
          const branches = await git.branch();
          if (branches.all.includes(`remotes/origin/${targetBranch}`)) {
            console.log(`Checking out existing remote branch: ${targetBranch}`);
            await git.checkout(targetBranch);
          } else {
            console.log(`Creating new local branch: ${targetBranch}`);
            await git.checkoutLocalBranch(targetBranch);
          }
        }

        console.log(
          `Workspace prepared at: ${repoPath} for branch: ${targetBranch ?? 'default'}`,
        );
        return repoPath;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to prepare workspace for ${repoSlug}: ${message}`,
        );
      }
    };

    const mainRepoPath = await prepareSingleRepo(
      mainRepoSlug,
      mainBranch,
      workspaceRoot,
    );
    preparedPaths.push(mainRepoPath);

    if (additionalRepos) {
      for (const additionalRepo of additionalRepos) {
        const additionalRepoPath = await prepareSingleRepo(
          additionalRepo.repo,
          additionalRepo.branch,
          additionalRepo.directoryName,
        );
        preparedPaths.push(additionalRepoPath);
      }
    }

    return preparedPaths;
  }
}
