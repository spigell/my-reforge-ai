import type { ChildProcess, SpawnOptions } from 'node:child_process';
import type { AgentRunResult } from '../../core/ports/agent-port.js';

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
