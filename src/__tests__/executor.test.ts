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
  let lastAgentOptions: AgentRunOptions | undefined;
  let lastAgentSignal: AbortSignal | undefined;
  let agentRunCallCount: number;
  let workspacePath: string;
  let fakeExecutorPath: string;

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

    workspacePath = path.join(tempDir, 'workspace');
    fs.mkdirSync(workspacePath, { recursive: true });

    const fakeDistDir = path.join(tempDir, 'dist', 'task-executor');
    fs.mkdirSync(fakeDistDir, { recursive: true });
    fakeExecutorPath = path.join(fakeDistDir, 'executor.js');
    const templatePath = path.join(fakeDistDir, 'planning-promt-tmpl.md');
    fs.writeFileSync(templatePath, 'Idea: {{task.idea}}');

    __setExecutorDependencies({
      prepareWorkspaces: async () => [workspacePath],
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
      fakeExecutorPath,
      taskDataPath,
    ];
    await executorMain();

    assert.strictEqual(agentRunCallCount, 1);
    assert.ok(lastAgentOptions, 'Agent run options should be captured');
    assert.ok(lastAgentSignal, 'Agent run AbortSignal should be captured');
    assert.strictEqual(
      lastAgentOptions?.prompt,
      'Read the prompt file ./planning-prompt.md in this workspace and execute.',
    );
    const promptFilePath = path.join(workspacePath, 'planning-prompt.md');
    assert.ok(fs.existsSync(promptFilePath), 'Prompt file should be written to workspace');
    const promptFileContent = fs.readFileSync(promptFilePath, 'utf8');
    assert.strictEqual(promptFileContent, 'Idea: Test idea');
  });
});
