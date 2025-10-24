import fs from 'node:fs';
import path from 'node:path';
import simpleGit, { SimpleGit } from 'simple-git';
import type { WorkspacePort } from '../../core/ports/workspace-port.js';
import type { Task } from '../../types/task.js';

export class WorkspaceManager implements WorkspacePort {
  async prepare({
    repo,
    branch,
    additionalRepos,
    rootDir,
  }: Parameters<WorkspacePort['prepare']>[0]): Promise<string[]> {
    const resolvedRoot = path.resolve(rootDir);
    fs.mkdirSync(resolvedRoot, { recursive: true });
    return this.prepareWorkspaces(repo, branch, additionalRepos, resolvedRoot);
  }

  private async prepareWorkspaces(
    mainRepoSlug: string,
    mainBranch: string,
    additionalRepos: Task['additionalRepos'],
    workspaceRoot: string,
  ): Promise<string[]> {
    const preparedPaths: string[] = [];
    const git: SimpleGit = simpleGit();

    const prepareSingleRepo = async (
      repoSlug: string,
      targetBranch: string | undefined,
      directoryName?: string,
    ): Promise<string> => {
      let repoUrl = `https://github.com/${repoSlug}.git`;
      if (process.env.GH_TOKEN) {
        console.log('Using GH_TOKEN for authentication in repo URL.');
        repoUrl = `https://x-access-token:${process.env.GH_TOKEN}@github.com/${repoSlug}.git`;
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

    const mainRepoPath = await prepareSingleRepo(mainRepoSlug, mainBranch);
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
