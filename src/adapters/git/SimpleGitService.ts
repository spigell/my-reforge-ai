import simpleGit, { SimpleGit } from 'simple-git';
import type { GitService } from '../../core/services/GitService.js';

export class SimpleGitService implements GitService {
  private getGit(cwd: string): SimpleGit {
    return simpleGit({ baseDir: cwd });
  }

  async ensureBranchAndSync({
    cwd,
    branch,
    base,
  }: Parameters<GitService['ensureBranchAndSync']>[0]): Promise<void> {
    const git = this.getGit(cwd);
    await git.fetch(['--all', '--prune']);

    let checkedOut = false;
    try {
      await git.checkout(branch);
      checkedOut = true;
      try {
        await git.pull('origin', branch);
      } catch {
        /* ignore pull errors when branch has no remote */
      }
    } catch {
      if (base) {
        await git.checkoutBranch(branch, `origin/${base}`);
      } else {
        await git.checkoutLocalBranch(branch);
      }
      checkedOut = true;
    }

    if (base) {
      await git.pull('origin', base);
    }

    if (!checkedOut) {
      await git.checkout(branch);
    }
  }

  async commitAll({
    cwd,
    message,
  }: Parameters<GitService['commitAll']>[0]): Promise<boolean> {
    const git = this.getGit(cwd);
    await git.add(['-A']);
    const status = await git.status();

    if (
      status.staged.length === 0 &&
      status.created.length === 0 &&
      status.deleted.length === 0 &&
      status.modified.length === 0 &&
      status.renamed.length === 0
    ) {
      return false;
    }

    await git.commit(message);
    return true;
  }

  async commitEmpty({
    cwd,
    message,
  }: Parameters<GitService['commitEmpty']>[0]): Promise<boolean> {
    const git = this.getGit(cwd);
    await git.commit(['--allow-empty', '-m', message]);
    return true;
  }

  async mergeBranch({
    cwd,
    from,
  }: Parameters<GitService['mergeBranch']>[0]): Promise<boolean> {
    const git = this.getGit(cwd);
    const mergeResult = await git.merge([from]);
    return mergeResult.failed
  }

  async push({
    cwd,
    branch,
    setUpstream,
  }: Parameters<GitService['push']>[0]): Promise<void> {
    const git = this.getGit(cwd);
    if (setUpstream) {
      try {
        await git.push(['--set-upstream', 'origin', branch]);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/set-upstream/i.test(message)) {
          throw error;
        }
      }
    }

    await git.push('origin', branch);
  }
}
