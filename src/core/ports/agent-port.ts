import type { ChildProcess, SpawnOptions } from 'node:child_process';

export interface AgentRunOptions {
  targetWorkspace: string;
  additionalWorkspaces?: string[];
  model?: string;
  timeoutMs?: number;
  prompt: string;
  runMetadata?: Record<string, unknown>;
  onData?: (chunk: string) => void;
}

export interface AgentRunResult {
  status: 'success' | 'timeout' | 'error';
  logs: string;
  diagnostics?: Record<string, unknown>;
}

export interface Agent {
  run(options: AgentRunOptions, signal: AbortSignal): Promise<AgentRunResult>;
}

export const terminationSignal =
  process.platform === 'win32' ? undefined : 'SIGKILL';
export type SpawnFunction = (
  command: string,
  args: ReadonlyArray<string>,
  options: SpawnOptions,
) => ChildProcess;

export const handleAbort = (
  child: ChildProcess,
  resolve: (result: AgentRunResult) => void,
  collectLogs: () => string,
) => {
  if (child.exitCode === null && child.signalCode === null) {
    try {
      child.kill(terminationSignal);
    } catch {
      /* ignore errors when the process is already closed */
    }
  }
  resolve({ status: 'timeout', logs: collectLogs() });
};
