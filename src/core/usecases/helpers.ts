import type { MatchedTask } from '../../types/task.js';
import type { LoggerPort } from '../ports/LoggerPort.js';
import { dump as dumpYaml } from 'js-yaml';
import fs from 'node:fs';

export const DEFAULT_WORKSPACE_ROOT = './workspace';

export const resolveWorkspaceRoot = (workspaceRoot?: string) =>
  workspaceRoot ?? process.env.WORKSPACE_ROOT ?? DEFAULT_WORKSPACE_ROOT;

export const deriveTimeout = (
  task: MatchedTask['task'],
  override?: number,
): number => {
  if (typeof override === 'number') {
    return override;
  }

  if (typeof task.timeout_ms === 'number') {
    return task.timeout_ms;
  }

  const legacyTimeout = (task as { timeoutMs?: unknown }).timeoutMs;
  return typeof legacyTimeout === 'number' ? legacyTimeout : 300_000;
};

export const setupAbortHandling = ({
  logger,
  label,
  timeoutMs,
  externalSignal,
}: {
  logger: LoggerPort;
  label: string;
  timeoutMs: number;
  externalSignal?: AbortSignal;
}) => {
  const abortController = new AbortController();

  const handleExternalAbort = () => {
    const reason =
      externalSignal && 'reason' in externalSignal
        ? (externalSignal as AbortSignal & { reason?: unknown }).reason
        : undefined;
    abortController.abort(reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      handleExternalAbort();
    } else {
      externalSignal.addEventListener('abort', handleExternalAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    logger.warn(`${label} timed out after ${timeoutMs}ms. Aborting...`);
    abortController.abort(new Error(`${label} timeout`));
  }, timeoutMs);

  const dispose = () => {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', handleExternalAbort);
    }
  };

  return {
    signal: abortController.signal,
    dispose,
  };
};

export function writeYamlFile(filePath: string, data: Record<string, unknown>): void {
  const serialized = dumpYaml(data, { noRefs: true });
  fs.writeFileSync(filePath, serialized, 'utf8');
};
