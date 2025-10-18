import { spawn } from 'node:child_process';
import type {
  Agent,
  AgentRunOptions,
  AgentRunResult,
  SpawnFunction,
} from './base.js';
import { handleAbort } from './base.js';

export class GeminiAgent implements Agent {
  private readonly spawnFn: SpawnFunction;

  constructor(spawnFn: SpawnFunction = spawn as SpawnFunction) {
    this.spawnFn = spawnFn;
  }

  async run(
    options: AgentRunOptions,
    signal: AbortSignal,
  ): Promise<AgentRunResult> {
    signal.throwIfAborted();

    return new Promise((resolve) => {
      const args = ['--model', options.model || 'gemini-pro'];
      const geminiProcess = this.spawnFn('gemini', args, {
        cwd: options.targetWorkspace,
        stdio: ['pipe', 'pipe', 'pipe'],
        signal,
      });

      let logs = '';
      const collectLogs = () => logs;

      let abortHandler: () => void;
      const resolveOnce = (result: AgentRunResult) => {
        signal.removeEventListener('abort', abortHandler);
        resolve(result);
      };
      abortHandler = () => handleAbort(geminiProcess, resolveOnce, collectLogs);

      signal.addEventListener('abort', abortHandler, { once: true });

      geminiProcess.stdout?.on('data', (data: Buffer) => {
        logs += data.toString();
      });
      geminiProcess.stderr?.on('data', (data: Buffer) => {
        logs += data.toString();
      });

      geminiProcess.stdin?.write(options.prompt);
      geminiProcess.stdin?.end();

      geminiProcess.on('close', (code) => {
        if (signal.aborted) {
          return;
        }
        if (code === 0) {
          resolveOnce({ status: 'success', logs });
        } else {
          resolveOnce({
            status: 'error',
            logs,
            diagnostics: { exitCode: code ?? 1 },
          });
        }
      });

      geminiProcess.on('error', (err) => {
        if (err.name === 'AbortError') return;
        logs += `\nProcess error: ${err.message}`;
        resolveOnce({ status: 'error', logs });
      });
    });
  }
}
