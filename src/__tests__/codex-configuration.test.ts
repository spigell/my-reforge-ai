import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { homedir, tmpdir } from 'node:os';
import { loadCodexConfiguration } from '../adapters/agents/codex-configuration.js';

const createTempDir = () =>
  fs.mkdtempSync(path.join(tmpdir(), 'codex-config-tests-'));

describe('loadCodexConfiguration', () => {
  let originalCodexHome: string | undefined;
  let originalEnableConfig: string | undefined;
  let tempDir: string;

  beforeEach(() => {
    originalCodexHome = process.env.CODEX_HOME;
    originalEnableConfig = process.env.CODEX_ENABLE_CONFIG;
    process.env.CODEX_ENABLE_CONFIG = '1';
    tempDir = createTempDir();
    process.env.CODEX_HOME = tempDir;
  });

  afterEach(() => {
    if (originalCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = originalCodexHome;
    }
    if (originalEnableConfig === undefined) {
      delete process.env.CODEX_ENABLE_CONFIG;
    } else {
      process.env.CODEX_ENABLE_CONFIG = originalEnableConfig;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('returns empty configuration when config file is absent', async () => {
    const config = await loadCodexConfiguration();
    assert.deepStrictEqual(config, {});
  });

  test('returns empty configuration when config loading disabled', async () => {
    process.env.CODEX_ENABLE_CONFIG = '0';
    const config = await loadCodexConfiguration();
    assert.deepStrictEqual(config, {});
  });

  test('sets CODEX_HOME when not provided', async () => {
    delete process.env.CODEX_HOME;
    const expectedCodexHome = path.resolve(homedir(), '.codex');
    const config = await loadCodexConfiguration();
    assert.deepStrictEqual(config, {});
    assert.equal(process.env.CODEX_HOME, expectedCodexHome);
  });

  test('loads sandbox mode and MCP servers from config', async () => {
    const configPath = path.join(tempDir, 'config.toml');
    const contents = `
sandbox_mode = "workspace-write"

[mcp_servers.github]
url = "http://mcp-github.test/endpoint"
`;
    fs.writeFileSync(configPath, contents.trimStart(), 'utf8');

    const config = await loadCodexConfiguration();
    assert.equal(config.sandbox_mode, 'workspace-write');
    assert.deepStrictEqual(config.mcp_servers, {
      github: { url: 'http://mcp-github.test/endpoint' },
    });
  });

  test('applies profile overrides for sandbox mode and MCP servers', async () => {
    const configPath = path.join(tempDir, 'config.toml');
    const contents = `
sandbox_mode = "danger-full-access"
profile = "restricted"

[mcp_servers.github]
url = "http://base-server/"

[profiles.restricted]
sandbox_mode = "read-only"

[profiles.restricted.mcp_servers.github]
url = "http://profile-server/"
[profiles.restricted.mcp_servers.issue-tracker]
url = "http://issues/"
`;
    fs.writeFileSync(configPath, contents.trimStart(), 'utf8');

    const config = await loadCodexConfiguration();
    assert.equal(config.sandbox_mode, 'read-only');
    assert.deepStrictEqual(config.mcp_servers, {
      github: { url: 'http://profile-server/' },
      'issue-tracker': { url: 'http://issues/' },
    });
  });
});
