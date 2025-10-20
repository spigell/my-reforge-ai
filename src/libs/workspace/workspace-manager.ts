import fs from 'node:fs';
import path from 'node:path';
import simpleGit, { SimpleGit } from 'simple-git';
import type { Task } from '../../types/task.js';

export async function prepareWorkspaces(
  mainRepoSlug: string,
  mainBranch: string,
  additionalRepos: Task['additionalRepos'],
  workspaceRoot: string,
): Promise<string[]> {
  const preparedPaths: string[] = [];
  const git: SimpleGit = simpleGit();

  const prepareSingleRepo = async (
    repoSlug: string,
    branch: string | undefined,
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

      if (branch) {
        const branches = await git.branch();
        if (branches.all.includes(`remotes/origin/${branch}`)) {
          console.log(`Checking out existing remote branch: ${branch}`);
          await git.checkout(branch);
        } else {
          console.log(`Creating new local branch: ${branch}`);
          await git.checkoutLocalBranch(branch);
        }
      }

      console.log(
        `Workspace prepared at: ${repoPath} for branch: ${branch ?? 'default'}`,
      );
      return repoPath;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error preparing workspace for ${repoSlug}: ${errorMessage}`,
      );
      process.exit(1);
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
