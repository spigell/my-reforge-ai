import assert from 'node:assert';
import { afterEach, beforeEach, describe, test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import type winston from 'winston';
import * as yaml from 'js-yaml';
import { main as matcherMain } from '../task-agent-matcher/matcher.js';
import { UsageManager } from '../libs/usage-manager/usage-manager.js';
import { Logger } from '../libs/logger/logger.js';
import { AgentId, DEFAULT_AGENT, MatchedTask } from '../types/task.js';

class ProcessExit extends Error {
  public readonly code: number;

  constructor(code: number) {
    super(`process.exit(${code}) called`);
    this.name = 'ProcessExit';
    this.code = code;
  }
}

describe('Task Agent Matcher', () => {
  let tempDir: string;
  let capturedConsole: string[];
  let infoLogs: string[];
  let errorLogs: string[];
  let warnLogs: string[];
  let originalExit: typeof process.exit;
  let originalConsoleLog: typeof console.log;
  let originalHasTokens: UsageManager['hasTokens'];
  let originalLoggerFactory: typeof Logger.getLogger;
  let originalLoggerInstance: unknown;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'task-agent-matcher-tests-'));
    capturedConsole = [];
    infoLogs = [];
    errorLogs = [];
    warnLogs = [];

    originalHasTokens = UsageManager.prototype.hasTokens;
    UsageManager.prototype.hasTokens = async () => true;

    const loggerStub = {
      info: (message: unknown) => infoLogs.push(String(message)),
      error: (message: unknown) => errorLogs.push(String(message)),
      warn: (message: unknown) => warnLogs.push(String(message)),
    } as unknown as winston.Logger;

    originalLoggerFactory = Logger.getLogger;
    Logger.getLogger = () => loggerStub;

    originalLoggerInstance = Reflect.get(Logger, 'instance');
    Reflect.set(Logger, 'instance', loggerStub);

    originalConsoleLog = console.log;
    console.log = (message?: unknown) => {
      capturedConsole.push(String(message ?? ''));
    };

    originalExit = process.exit;
    process.exit = ((code?: number) => {
      throw new ProcessExit(code ?? 0);
    }) as typeof process.exit;
  });

  afterEach(() => {
    UsageManager.prototype.hasTokens = originalHasTokens;
    Logger.getLogger = originalLoggerFactory;
    Reflect.set(Logger, 'instance', originalLoggerInstance);
    console.log = originalConsoleLog;
    process.exit = originalExit;

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const createTaskFile = (content: string, fileName = 'task.yaml') => {
    const filePath = path.join(tempDir, fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  };

  const createTaskFileFromTask = (
    overrides: Record<string, unknown> = {},
    fileName = 'task.yaml',
  ) => {
    const baseTask = {
      repo: 'owner/repo',
      branch: 'main',
      kind: 'feature',
      idea: 'Default task idea',
      stage: 'planning' as const,
      taskDir: 'tasks/default-task',
    };

    const task = { ...baseTask, ...overrides };

    if (!Object.hasOwn(task, 'agents')) {
      delete (task as Record<string, unknown>).agents;
    }

    const content = yaml.dump({ tasks: [task] }, { lineWidth: -1 });
    return createTaskFile(content, fileName);
  };

  const readOutputFile = (filePath: string) =>
    JSON.parse(fs.readFileSync(filePath, 'utf8')) as MatchedTask;

  const parseConsolePayload = (index = 0) =>
    JSON.parse(capturedConsole[index]) as MatchedTask;

  const expectProcessExit = async (promise: Promise<unknown>, code = 1) => {
    await assert.rejects(promise, (error: unknown) => {
      return error instanceof ProcessExit && error.code === code;
    });
  };

  test('should write full task to output file when --output-file is provided', async () => {
    const taskFile = createTaskFileFromTask({
      branch: 'feature-branch',
      agents: ['gemini-2.5-flash'],
      idea: 'Do something cool',
      taskDir: 'tasks/feature-branch',
    });
    const outputFile = path.join(tempDir, 'output.json');

    await matcherMain(['--output-file', outputFile, taskFile]);

    const payload = readOutputFile(outputFile);
    assert.strictEqual(payload.task.repo, 'owner/repo');
    assert.strictEqual(payload.task.branch, 'feature-branch');
    assert.strictEqual(payload.selectedAgent, AgentId.GoogleGemini25Flash);
    assert.deepStrictEqual(
      payload.task,
      {
        repo: 'owner/repo',
        branch: 'feature-branch',
        kind: 'feature',
        idea: 'Do something cool',
        stage: 'planning',
        taskDir: 'tasks/feature-branch',
        agents: [AgentId.GoogleGemini25Flash],
        sourceFile: taskFile,
      },
      'expected task payload to include required fields',
    );

    assert.ok(
      infoLogs.some((log) =>
        log.includes(`Task data written to ${outputFile}`),
      ),
      'expected a log about writing the output file',
    );
  });

  test('should log error and exit if no tokens are available', async () => {
    UsageManager.prototype.hasTokens = async () => false;
    const taskFile = createTaskFileFromTask();

    await expectProcessExit(matcherMain([taskFile]));

    assert.ok(
      errorLogs.some((log) => /No tokens available/.test(log)),
      'expected error log about tokens',
    );
  });

  test('should output to console when --output-file is not provided', async () => {
    const taskFile = createTaskFileFromTask({
      branch: 'feature-branch',
    });

    await matcherMain([taskFile]);

    assert.strictEqual(capturedConsole.length, 1);
    const payload = parseConsolePayload();
    assert.strictEqual(payload.selectedAgent, DEFAULT_AGENT);
  });

  test('should log error and exit if no task file is provided', async () => {
    await expectProcessExit(matcherMain([]));

    assert.ok(
      errorLogs.some((log) => /Usage:/.test(log)),
      'expected usage error log',
    );
  });

  test('should log error and exit if --output-file is provided without a path', async () => {
    await expectProcessExit(matcherMain(['--output-file']));

    assert.ok(
      errorLogs.some((log) =>
        /Error parsing arguments: Option '--output-file <value>' argument missing/.test(
          log,
        ),
      ),
      'expected missing path error log',
    );
  });

  test('should log error and exit if --output-file is provided with an empty path', async () => {
    const taskFile = path.join(tempDir, 'task.yaml');
    fs.writeFileSync(taskFile, '', 'utf8');

    await expectProcessExit(matcherMain(['--output-file=', taskFile]));

    assert.ok(
      errorLogs.some((log) =>
        /Error: --output-file flag requires a non-empty file path\./.test(log),
      ),
      'expected empty path error log',
    );
  });

  test('should handle task with no agents and default to codex', async () => {
    const taskFile = createTaskFileFromTask();

    await matcherMain([taskFile]);

    const payload = parseConsolePayload();
    assert.strictEqual(payload.selectedAgent, DEFAULT_AGENT);
    assert.deepStrictEqual(payload.task.agents, [DEFAULT_AGENT]);
  });

  test('should handle task with empty agents array and default to codex', async () => {
    const taskFile = createTaskFileFromTask({
      agents: [],
    });

    await matcherMain([taskFile]);

    const payload = parseConsolePayload();
    assert.strictEqual(payload.selectedAgent, DEFAULT_AGENT);
    assert.deepStrictEqual(payload.task.agents, [DEFAULT_AGENT]);
  });

  test('should handle task with multiple agents and pick the first one', async () => {
    const taskFile = createTaskFileFromTask({
      agents: ['gemini-2.5-flash', 'codex'],
    });

    await matcherMain([taskFile]);

    const payload = parseConsolePayload();
    assert.strictEqual(payload.selectedAgent, AgentId.GoogleGemini25Flash);
    assert.deepStrictEqual(payload.task.agents, [
      AgentId.GoogleGemini25Flash,
      AgentId.OpenAICodex,
    ]);
  });

  test('should handle task with specified branch', async () => {
    const taskFile = createTaskFileFromTask({
      branch: 'custom-branch',
    });

    await matcherMain([taskFile]);

    const payload = parseConsolePayload();
    assert.strictEqual(payload.task.branch, 'custom-branch');
  });

  test('should handle invalid YAML file', async () => {
    const taskFile = createTaskFile(
      `
tasks:
  - repo: owner/repo
    branch: main
    agents: [
`.trim(),
    );

    await expectProcessExit(matcherMain([taskFile]));

    assert.ok(
      errorLogs.some((log) => /Error reading or parsing task file:/.test(log)),
      'expected parse error log',
    );
  });

  test('should handle non-existent task file', async () => {
    const missingFile = path.join(tempDir, 'missing.yaml');

    await expectProcessExit(matcherMain([missingFile]));

    assert.ok(
      errorLogs.some((log) => /Error reading or parsing task file:/.test(log)),
      'expected missing file error log',
    );
  });

  test('should embed source file path in task summary', async () => {
    const taskFile = createTaskFileFromTask(
      {
        branch: 'feature-branch',
        taskDir: 'tasks/sample',
      },
      'nested/tasks/sample.yaml',
    );

    await matcherMain([taskFile]);

    const payload = parseConsolePayload();
    const task = payload.task;
    assert.ok(task, 'expected task to be defined in payload');
  });

  test('should retain required fields from task definition', async () => {
    const taskFile = createTaskFileFromTask({
      kind: 'bugfix',
      idea: 'Fix a bug',
      stage: 'implementing',
      taskDir: 'tasks/fix-bug',
    });

    await matcherMain([taskFile]);

    const payload = parseConsolePayload();
    assert.strictEqual(payload.task.kind, 'bugfix');
    assert.strictEqual(payload.task.idea, 'Fix a bug');
    assert.strictEqual(payload.task.stage, 'implementing');
    assert.strictEqual(payload.task.taskDir, 'tasks/fix-bug');
  });
});
