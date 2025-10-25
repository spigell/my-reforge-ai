import assert from 'node:assert';
import { afterEach, beforeEach, describe, test } from 'node:test';
import {
  resolveGithubToken,
  resetGithubTokenCache,
} from '../libs/github-token.js';

const snapshotEnv = () => ({
  githubToken: process.env.GITHUB_TOKEN,
  ghToken: process.env.GH_TOKEN,
});

const restoreEnv = ({
  githubToken,
  ghToken,
}: {
  githubToken?: string;
  ghToken?: string;
}) => {
  if (githubToken === undefined) {
    delete process.env.GITHUB_TOKEN;
  } else {
    process.env.GITHUB_TOKEN = githubToken;
  }

  if (ghToken === undefined) {
    delete process.env.GH_TOKEN;
  } else {
    process.env.GH_TOKEN = ghToken;
  }
};

describe('resolveGithubToken', () => {
  let originalEnv: ReturnType<typeof snapshotEnv>;

  beforeEach(() => {
    originalEnv = snapshotEnv();
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    resetGithubTokenCache();
  });

  afterEach(() => {
    restoreEnv(originalEnv);
    resetGithubTokenCache();
  });

  test('returns the value of GITHUB_TOKEN', () => {
    process.env.GITHUB_TOKEN = 'abc123';

    const token = resolveGithubToken();

    assert.strictEqual(token, 'abc123');
    // second call should come from cache
    assert.strictEqual(resolveGithubToken(), 'abc123');
  });

  test('throws when token is missing and required', () => {
    assert.throws(
      () => resolveGithubToken(),
      /GITHUB_TOKEN environment variable is not set/,
    );
  });

  test('returns undefined when token is optional', () => {
    assert.strictEqual(
      resolveGithubToken({ required: false }),
      undefined,
      'expected undefined when token not required',
    );
  });

  test('throws with rename hint when only GH_TOKEN is set', () => {
    process.env.GH_TOKEN = 'legacy-token';

    assert.throws(
      () => resolveGithubToken(),
      /Rename GH_TOKEN to GITHUB_TOKEN/,
    );
  });
});

