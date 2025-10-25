import { Codex, type SandboxMode, type ThreadEvent } from '@openai/codex-sdk';
import type {
  Agent,
  AgentRunOptions,
  AgentRunResult,
} from '../../core/ports/agent-port.js';
import type { CodexConfiguration } from './codex-configuration.js';
import { loadCodexConfiguration } from './codex-configuration.js';

const DEFAULT_SANDBOX_MODE: SandboxMode = 'danger-full-access';

const jsonStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return `[unserializable:${String(error)}]`;
  }
};

const formatEvent = (event: ThreadEvent): string => {
  switch (event.type) {
    case 'item.completed':
      return `[item.completed:${event.item.type}] ${jsonStringify(event.item)}`;
    case 'item.updated':
      return `[item.updated:${event.item.type}] ${jsonStringify(event.item)}`;
    case 'item.started':
      return `[item.started:${event.item.type}] ${jsonStringify(event.item)}`;
    case 'turn.completed':
      return `[turn.completed] usage=${jsonStringify(event.usage ?? null)}`;
    case 'turn.failed':
      return `[turn.failed] ${jsonStringify(event.error)}`;
    case 'error':
      return `[error] ${jsonStringify(event)}`;
    default:
      return `[${event.type}] ${jsonStringify(event)}`;
  }
};

export class CodexAgent implements Agent {
  private readonly createCodex: () => Codex;
  private readonly loadConfiguration: () => Promise<CodexConfiguration>;

  constructor(
    createCodex: () => Codex = () => new Codex(),
    loadConfiguration: () => Promise<CodexConfiguration> = loadCodexConfiguration,
  ) {
    this.createCodex = createCodex;
    this.loadConfiguration = loadConfiguration;
  }

  async run(
    options: AgentRunOptions,
    signal: AbortSignal,
  ): Promise<AgentRunResult> {
    signal.throwIfAborted();

    const codex = this.createCodex();
    let sandboxMode = DEFAULT_SANDBOX_MODE;
    try {
      const configuration = await this.loadConfiguration();
      sandboxMode = configuration.sandbox_mode ?? DEFAULT_SANDBOX_MODE;
      const mcpServers = configuration.mcp_servers;
      console.log(
        '[CodexAgent] starting thread with configuration:',
        JSON.stringify({
          sandboxMode,
          mcpServers: mcpServers
            ? Object.fromEntries(
                Object.entries(mcpServers).map(([id, server]) => [
                  id,
                  { url: server.url },
                ]),
              )
            : undefined,
        }),
      );
    } catch (error) {
      console.warn(
        '[CodexAgent] Falling back to default configuration; loading failed.',
        error,
      );
    }
    const thread = codex.startThread({
      model: options.model,
      sandboxMode,
      workingDirectory: options.targetWorkspace,
    });

    const logs: string[] = [];
    let turnFailedMessage: string | null = null;
    let unexpectedError: Error | null = null;
    let unexpectedErrorMessage: string | null = null;
    let turnCompleted = false;
    let aborted = false;

    const runTurn = async (): Promise<void> => {
      const { events } = await thread.runStreamed(options.prompt);
      const iterator = events[Symbol.asyncIterator]();

      const onAbort = () => {
        aborted = true;
        const returnFn = iterator.return?.bind(iterator);
        if (returnFn) {
          void returnFn(undefined).catch(() => {
            /* swallow iterator return errors */
          });
        }
      };

      signal.addEventListener('abort', onAbort, { once: true });

      try {
        while (true) {
          const { value, done } = await iterator.next();
          if (done) break;

          const event = value as ThreadEvent;
          const formatted = formatEvent(event);
          logs.push(formatted);
          options.onData?.(formatted + '\n');
          if (event.type === 'turn.failed') {
            console.error(
              '[CodexAgent] turn failed event',
              jsonStringify(event.error),
            );
          } else if (event.type === 'error') {
            console.error('[CodexAgent] codex thread error', formatted);
          }

          if (event.type === 'turn.failed') {
            turnFailedMessage = event.error.message;
            break;
          }
          if (event.type === 'turn.completed') {
            turnCompleted = true;
          }
        }
      } catch (error) {
        if (!aborted) {
          const normalizedError =
            error instanceof Error ? error : new Error(String(error));
          unexpectedError = normalizedError;
          unexpectedErrorMessage = normalizedError.message;
          logs.push(`[error] ${normalizedError.message}`);
          console.error(
            '[CodexAgent] unexpected error while streaming Codex events',
            normalizedError,
          );
        }
      } finally {
        signal.removeEventListener('abort', onAbort);
      }
    };

    await runTurn();

    const logsOutput = logs.join('\n');

    if (aborted || signal.aborted) {
      return { status: 'timeout', logs: logsOutput };
    }

    if (turnFailedMessage) {
      return {
        status: 'error',
        logs: logsOutput,
        diagnostics: { message: turnFailedMessage },
      };
    }

    if (unexpectedError !== null) {
      const message =
        unexpectedErrorMessage ?? 'Codex run failed with an unknown error.';
      return {
        status: 'error',
        logs: logsOutput,
        diagnostics: { message },
      };
    }

    if (!turnCompleted) {
      return {
        status: 'error',
        logs: logsOutput || 'Codex turn ended without a completion event.',
        diagnostics: { reason: 'missing-turn-completion' },
      };
    }

    return { status: 'success', logs: logsOutput };
  }
}
