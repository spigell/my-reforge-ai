
import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs';

export async function prepareWorkspace(
  repoUrl: string,
  branch: string,
  path: string,
): Promise<void> {
  const git: SimpleGit = simpleGit();

  if (fs.existsSync(path)) {
    console.log(`Directory ${path} already exists. Pulling latest changes.`);
    await git.cwd(path);
    await git.pull();
  } else {
    console.log(`Cloning ${repoUrl} to ${path}`);
    await git.clone(repoUrl, path);
  }

  await git.cwd(path);

  const branches = await git.branch();
  if (branches.all.includes(`remotes/origin/${branch}`)) {
    console.log(`Branch '${branch}' exists remotely. Switching to it.`);
    await git.checkout(branch);
  } else {
    console.log(`Branch '${branch}' does not exist remotely. Creating it.`);
    await git.checkoutLocalBranch(branch);
  }
}
