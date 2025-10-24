import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import simpleGit from 'simple-git';
import { SimpleGitService } from '../adapters/git/simple-git.js';

describe('SimpleGitService commitEmpty', () => {
  let tmpDir: string;
  let repoPath: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simple-git-service-'));
    repoPath = path.join(tmpDir, 'repo');
    fs.mkdirSync(repoPath, { recursive: true });

    const git = simpleGit({ baseDir: repoPath });
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('creates an empty commit when repository has no prior commits', async () => {
    const gitService = new SimpleGitService();
    const git = simpleGit({ baseDir: repoPath });

    const beforeLog = await git.log().catch(() => ({ total: 0 }));
    assert.strictEqual(beforeLog.total ?? 0, 0);

    const created = await gitService.commitEmpty({
      cwd: repoPath,
      message: 'bootstrap empty commit',
    });

    assert.strictEqual(created, true);

    const afterLog = await git.log();
    assert.strictEqual(afterLog.total, 1);
    assert.strictEqual(afterLog.latest?.message, 'bootstrap empty commit');
  });
});
