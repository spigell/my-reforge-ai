import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import toml from 'toml';
import type { SandboxMode } from '@openai/codex-sdk';

export type CodexConfiguration = {
  sandbox_mode?: SandboxMode;
  mcp_servers?: Record<string, McpServerConfiguration>;
};

export type McpServerConfiguration = {
  url: string;
};

const DEFAULT_CONFIG_PATH = () => {
  const codexHome =
    process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex');
  return path.resolve(codexHome, 'config.toml');
};

const isSandboxMode = (value: unknown): value is SandboxMode =>
  value === 'read-only' ||
  value === 'workspace-write' ||
  value === 'danger-full-access';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const extractSandboxMode = (
  config: Record<string, unknown>,
  profileConfig: Record<string, unknown> | null,
) => {
  if (profileConfig) {
    const profileSandboxMode = profileConfig.sandbox_mode;
    if (isSandboxMode(profileSandboxMode)) return profileSandboxMode;
  }

  const directSandboxMode = config.sandbox_mode;
  return isSandboxMode(directSandboxMode) ? directSandboxMode : undefined;
};

const extractActiveProfile = (config: Record<string, unknown>) => {
  const activeProfile =
    typeof config.profile === 'string' ? config.profile : undefined;
  if (!activeProfile) return null;

  const profiles = config.profiles;
  if (!isRecord(profiles)) return null;

  const profileConfig = profiles[activeProfile];
  if (!isRecord(profileConfig)) return null;

  return profileConfig;
};

const extractMcpServers = (
  config: Record<string, unknown>,
  profileConfig: Record<string, unknown> | null,
) => {
  const baseServers = extractServersFrom(config);
  const profileServers = profileConfig
    ? extractServersFrom(profileConfig)
    : undefined;

  if (!baseServers && !profileServers) return undefined;

  return {
    ...(baseServers ?? {}),
    ...(profileServers ?? {}),
  };
};

const extractServersFrom = (config: Record<string, unknown>) => {
  const servers = config.mcp_servers;
  if (!isRecord(servers)) return undefined;

  const normalized: Record<string, McpServerConfiguration> = {};

  for (const [key, value] of Object.entries(servers)) {
    if (!isRecord(value)) continue;
    const url = value.url;
    if (typeof url === 'string' && url.trim().length > 0) {
      normalized[key] = { url };
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const loadTomlConfig = async (configPath: string) => {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return toml.parse(data) as Record<string, unknown>;
  } catch (error) {
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return {};
    }

    console.warn(
      `[CodexAgent] Failed to load configuration from ${configPath}:`,
      error,
    );
    return {};
  }
};

export const loadCodexConfiguration = async (): Promise<CodexConfiguration> => {
  const configPath = DEFAULT_CONFIG_PATH();
  const config = await loadTomlConfig(configPath);
  const profileConfig = extractActiveProfile(config);

  const sandboxMode = extractSandboxMode(config, profileConfig);
  const mcpServers = extractMcpServers(config, profileConfig);

  return {
    ...(sandboxMode ? { sandbox_mode: sandboxMode } : {}),
    ...(mcpServers ? { mcp_servers: mcpServers } : {}),
  };
};
