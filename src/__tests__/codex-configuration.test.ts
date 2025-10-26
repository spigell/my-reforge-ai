import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';
import path from 'node:path';
import { homedir } from 'node:os';
import { loadCodexConfiguration } from '../adapters/agents/codex-configuration.js';

describe('loadCodexConfiguration', () => {
  let originalCodexHome: string | undefined;

  beforeEach(() => {
    originalCodexHome = process.env.CODEX_HOME;
  });

  afterEach(() => {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
  });

  test('ensures CODEX_HOME is set and returns empty config', async () => {
    delete process.env.CODEX_HOME;
    const result = await loadCodexConfiguration();
    assert.deepStrictEqual(result, {});
    assert.equal(process.env.CODEX_HOME, path.join(homedir(), '.codex'));
  });

  test('respects existing CODEX_HOME value', async () => {
    process.env.CODEX_HOME = '/tmp/custom-codex-home';
    const result = await loadCodexConfiguration();
    assert.deepStrictEqual(result, {});
    assert.equal(process.env.CODEX_HOME, '/tmp/custom-codex-home');
  });
});
