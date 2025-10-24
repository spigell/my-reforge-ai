import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type {
  Codex as CodexClient,
  ThreadEvent,
  ThreadOptions,
} from '@openai/codex-sdk';
import { CodexAgent } from '../adapters/agents/codex.js';

class StubThread {
  private readonly events: ThreadEvent[];
  private readonly onReturn?: () => void;
  public readonly prompts: string[] = [];

  constructor(events: ThreadEvent[], onReturn?: () => void) {
    this.events = events;
    this.onReturn = onReturn;
  }

  async runStreamed(input: string) {
    this.prompts.push(input);
    const onReturn = this.onReturn;
    const events = this.events;
    const generator = (async function* () {
      try {
        for (const event of events) {
          yield event;
        }
      } finally {
        onReturn?.();
      }
    })();
    return { events: generator };
  }
}

class HangingThread {
  public readonly prompts: string[] = [];
  public returnCalled = false;
  private readonly returnResolved: Promise<void>;
  private resolveReturn!: () => void;
  private readonly hangDeferred: Promise<void>;
  private resolveHang!: () => void;
  private hangResolved = false;

  constructor() {
    this.returnResolved = new Promise<void>((resolve) => {
      this.resolveReturn = resolve;
    });
    this.hangDeferred = new Promise<void>((resolve) => {
      this.resolveHang = resolve;
    });
  }

  async runStreamed(input: string) {
    this.prompts.push(input);
    const self = this;

    const generator = (async function* () {
      try {
        const turnStarted: ThreadEvent = { type: 'turn.started' };
        yield turnStarted;
        await self.hangDeferred;
      } finally {
        self.returnCalled = true;
        self.resolveReturn();
      }
    })();
    const originalReturn = generator.return?.bind(generator);
    const wrappedGenerator: AsyncGenerator<ThreadEvent> = {
      async next(...args) {
        return generator.next(...args);
      },
      async return(value?: unknown) {
        self.resolveHangOnce();
        if (originalReturn) {
          return originalReturn(value as never);
        }
        return { value: undefined, done: true };
      },
      async throw(err?: unknown) {
        self.resolveHangOnce();
        if (generator.throw) {
          return generator.throw(err);
        }
        throw err;
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };

    return { events: wrappedGenerator };
  }

  async waitForReturn() {
    await this.returnResolved;
  }

  private resolveHangOnce() {
    if (this.hangResolved) return;
    this.hangResolved = true;
    this.resolveHang();
  }
}

class StubCodex<
  TThread extends {
    runStreamed(
      input: string,
    ): Promise<{ events: AsyncGenerator<ThreadEvent> }>;
  },
> {
  public startOptions: ThreadOptions | undefined;
  public readonly thread: TThread;

  constructor(thread: TThread) {
    this.thread = thread;
  }

  startThread(options?: ThreadOptions) {
    this.startOptions = options;
    return this.thread;
  }
}

describe('CodexAgent', () => {
  test('runs Codex via the SDK and returns aggregated logs', async () => {
    const events: ThreadEvent[] = [
      { type: 'thread.started', thread_id: 'abc' },
      { type: 'turn.started' },
      {
        type: 'item.completed',
        item: {
          id: 'item-1',
          type: 'agent_message',
          text: 'hello world',
        },
      },
      {
        type: 'turn.completed',
        usage: {
          input_tokens: 1,
          cached_input_tokens: 0,
          output_tokens: 2,
        },
      },
    ];
    const thread = new StubThread(events);
    const codex = new StubCodex(thread);
    const agent = new CodexAgent(() => codex as unknown as CodexClient);
    const abortController = new AbortController();
    const resultPromise = agent.run(
      {
        targetWorkspace: '/tmp',
        prompt: 'test prompt',
        model: 'oai-codex',
      },
      abortController.signal,
    );

    const result = await resultPromise;

    assert.deepStrictEqual(thread.prompts, ['test prompt']);
    assert.equal(codex.startOptions?.workingDirectory, '/tmp');
    assert.equal(codex.startOptions?.model, 'oai-codex');
    assert.equal(result.status, 'success');
    assert.match(result.logs, /\[item.completed:agent_message]/);
    assert.match(result.logs, /\[turn.completed]/);
  });

  test('aborts run when signal is triggered and stops consuming events', async () => {
    const thread = new HangingThread();
    const codex = new StubCodex(thread);
    const agent = new CodexAgent(() => codex as unknown as CodexClient);
    const abortController = new AbortController();
    const resultPromise = agent.run(
      {
        targetWorkspace: '/tmp',
        prompt: 'prompt',
      },
      abortController.signal,
    );

    await new Promise((resolve) => setImmediate(resolve));
    abortController.abort();
    const result = await resultPromise;
    await thread.waitForReturn();

    assert.strictEqual(result.status, 'timeout');
    assert.strictEqual(thread.returnCalled, true);
  });
});
