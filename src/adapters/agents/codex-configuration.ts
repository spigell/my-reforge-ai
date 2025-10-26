import os from 'node:os';
import path from 'node:path';
import type { SandboxMode } from '@openai/codex-sdk';

export type CodexConfiguration = {
  sandbox_mode?: SandboxMode;
  mcp_servers?: Record<string, { url: string }>;
};

export const loadCodexConfiguration = async (): Promise<CodexConfiguration> => {
  if (!process.env.CODEX_HOME) {
    process.env.CODEX_HOME = path.join(os.homedir(), '.codex');
  }
  return {};
};
