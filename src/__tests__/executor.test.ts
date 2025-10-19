import assert from 'node:assert';
import { afterEach, beforeEach, describe, test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import type { AgentRunOptions, AgentRunResult } from '../task-executor/agents/index.js';
import { AgentId, MatchedTask, Task } from '../types/task.js';
import {
  __resetExecutorDependencies,
  __setExecutorDependencies,
  main as executorMain,
} from '../task-executor/executor.js';

class ProcessExit extends Error {
  public readonly code: number;

  constructor(code: number) {
    super(`process.exit(${code}) called`);
    this.name = 'ProcessExit';
    this.code = code;
  }
}

describe('Task Executor', () => {
  let tempDir: string;
  let capturedConsole: string[];
  let originalExit: typeof process.exit;
  let originalConsoleLog: typeof console.log;
  let taskDataPath: string;
  let templatePath: string;
  let lastAgentOptions: AgentRunOptions | undefined;
  let lastAgentSignal: AbortSignal | undefined;
  let agentRunCallCount: number;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'task-executor-tests-'));
    capturedConsole = [];

    originalConsoleLog = console.log;
    console.log = (message?: unknown) => {
      capturedConsole.push(String(message ?? ''));
    };

    originalExit = process.exit;
    process.exit = ((code?: number) => {
      throw new ProcessExit(code ?? 0);
    }) as typeof process.exit;

    lastAgentOptions = undefined;
    lastAgentSignal = undefined;
    agentRunCallCount = 0;

    __setExecutorDependencies({
      prepareWorkspaces: async () => ['/fake/workspace'],
      getAgent: () => ({
        run: async (options: AgentRunOptions, signal: AbortSignal): Promise<AgentRunResult> => {
          agentRunCallCount += 1;
          lastAgentOptions = options;
          lastAgentSignal = signal;
          return {
            status: 'success',
            logs: 'dummy logs',
          };
        },
      }),
    });

    const task: Task = {
      repo: 'owner/repo',
      branch: 'main',
      agents: [AgentId.OpenAICodex],
      kind: 'feature',
      idea: 'Test idea',
      stage: 'planning',
      taskDir: 'tasks/test',
      sourceFile: 'tasks/test.yaml',
    };

    const matchedTask: MatchedTask = {
      task,
      selectedAgent: AgentId.OpenAICodex,
    };

    taskDataPath = path.join(tempDir, 'task-data.json');
    fs.writeFileSync(taskDataPath, JSON.stringify(matchedTask));

    templatePath = path.join(tempDir, 'template.md');
    fs.writeFileSync(
      templatePath,
      'Idea: {{task.idea}}, File Stem: {{file_stem}}',
    );
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    process.exit = originalExit;
    fs.rmSync(tempDir, { recursive: true, force: true });
    __resetExecutorDependencies();
  });

  test('should render planning template with correct context', async () => {
    process.argv = [
      'node',
      'dist/task-executor/executor.js',
      templatePath,
      taskDataPath,
    ];
    await executorMain();

    assert.strictEqual(agentRunCallCount, 1);
    assert.ok(lastAgentOptions, 'Agent run options should be captured');
    assert.ok(lastAgentSignal, 'Agent run AbortSignal should be captured');
    assert.strictEqual(
      lastAgentOptions?.prompt,
      'Idea: Test idea, File Stem: test',
    );
  });
});
