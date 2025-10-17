import assert from 'node:assert';
import { afterEach, beforeEach, describe, test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import type winston from 'winston';
import { main as pickerMain } from '../task-picker/picker.js';
import { UsageManager } from '../libs/usage-manager/usage-manager.js';
import { Logger } from '../libs/logger/logger.js';

type PickerSummary = {
  repo?: string;
  branch?: string;
  agent: string;
  agents: string[];
  fallbackAgents: string[];
  task?: Record<string, unknown>;
};

class ProcessExit extends Error {
  public readonly code: number;

  constructor(code: number) {
    super(`process.exit(${code}) called`);
    this.name = 'ProcessExit';
    this.code = code;
  }
}

describe('Task Picker', () => {
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
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'task-picker-tests-'));
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

  const readOutputFile = (filePath: string) =>
    JSON.parse(fs.readFileSync(filePath, 'utf8')) as PickerSummary;

  const parseConsolePayload = (index = 0) =>
    JSON.parse(capturedConsole[index]) as PickerSummary;

  const expectProcessExit = async (promise: Promise<unknown>, code = 1) => {
    await assert.rejects(promise, (error: unknown) => {
      return error instanceof ProcessExit && error.code === code;
    });
  };

  test('should write full task to output file when --output-file is provided', async () => {
    const taskFile = createTaskFile(
      `
tasks:
  - repo: owner/repo
    branch: feature-branch
    agents: ['gemini-2.5-flash']
    idea: 'Do something cool'
`.trim(),
    );
    const outputFile = path.join(tempDir, 'output.json');

    await pickerMain(['--output-file', outputFile, taskFile]);

    const payload = readOutputFile(outputFile);
    assert.strictEqual(payload.repo, 'owner/repo');
    assert.strictEqual(payload.branch, 'feature-branch');
    assert.strictEqual(payload.agent, 'gemini-2.5-flash');
    assert.deepStrictEqual(payload.agents, ['gemini-2.5-flash']);
    assert.deepStrictEqual(payload.fallbackAgents, []);
    assert.deepStrictEqual(payload.task, {
      repo: 'owner/repo',
      branch: 'feature-branch',
      agents: ['gemini-2.5-flash'],
      idea: 'Do something cool',
      sourceFile: taskFile,
    });

    assert.ok(
      infoLogs.some((log) => log.includes(`Task data written to ${outputFile}`)),
      'expected a log about writing the output file',
    );
  });

  test('should log error and exit if no tokens are available', async () => {
    UsageManager.prototype.hasTokens = async () => false;
    const taskFile = path.join(tempDir, 'task.yaml');
    fs.writeFileSync(taskFile, '', 'utf8');

    await expectProcessExit(pickerMain([taskFile]));

    assert.ok(
      errorLogs.some((log) => /No tokens available/.test(log)),
      'expected error log about tokens',
    );
  });

  test('should output to console when --output-file is not provided', async () => {
    const taskFile = createTaskFile(
      `
tasks:
  - repo: owner/repo
    branch: feature-branch
`.trim(),
    );

    await pickerMain([taskFile]);

    assert.strictEqual(capturedConsole.length, 1);
    const payload = parseConsolePayload();
    assert.strictEqual(payload.repo, 'owner/repo');
    assert.strictEqual(payload.branch, 'feature-branch');
    assert.strictEqual(payload.agent, 'codex');
  });

  test('should log error and exit if no task file is provided', async () => {
    await expectProcessExit(pickerMain([]));

    assert.ok(
      errorLogs.some((log) => /Usage:/.test(log)),
      'expected usage error log',
    );
  });

  test('should log error and exit if --output-file is provided without a path', async () => {
    await expectProcessExit(pickerMain(['--output-file']));

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

    await expectProcessExit(pickerMain(['--output-file=', taskFile]));

    assert.ok(
      errorLogs.some((log) =>
        /Error: --output-file flag requires a non-empty file path\./.test(log),
      ),
      'expected empty path error log',
    );
  });

  test('should handle task with no agents and default to codex', async () => {
    const taskFile = createTaskFile(
      `
tasks:
  - repo: owner/repo
    branch: main
`.trim(),
    );

    await pickerMain([taskFile]);

    const payload = parseConsolePayload();
    assert.strictEqual(payload.agent, 'codex');
    assert.deepStrictEqual(payload.agents, ['codex']);
    assert.deepStrictEqual(payload.fallbackAgents, []);
  });

  test('should handle task with empty agents array and default to codex', async () => {
    const taskFile = createTaskFile(
      `
tasks:
  - repo: owner/repo
    branch: main
    agents: []
`.trim(),
    );

    await pickerMain([taskFile]);

    const payload = parseConsolePayload();
    assert.strictEqual(payload.agent, 'codex');
    assert.deepStrictEqual(payload.agents, ['codex']);
    assert.deepStrictEqual(payload.fallbackAgents, []);
  });

  test('should handle task with multiple agents and pick the first one', async () => {
    const taskFile = createTaskFile(
      `
tasks:
  - repo: owner/repo
    branch: main
    agents: ['gemini-2.5-flash', 'codex']
`.trim(),
    );

    await pickerMain([taskFile]);

    const payload = parseConsolePayload();
    assert.strictEqual(payload.agent, 'gemini-2.5-flash');
    assert.deepStrictEqual(payload.agents, ['gemini-2.5-flash', 'codex']);
    assert.deepStrictEqual(payload.fallbackAgents, ['codex']);
  });

  test('should handle task with no repo and default branch', async () => {
    const taskFile = createTaskFile(
      `
tasks:
  - idea: 'Just an idea'
`.trim(),
    );

    await pickerMain([taskFile]);

    const payload = parseConsolePayload();
    assert.strictEqual(payload.repo, undefined);
    assert.strictEqual(payload.branch, 'main');
  });

  test('should handle task with specified branch', async () => {
    const taskFile = createTaskFile(
      `
tasks:
  - repo: owner/repo
    branch: custom-branch
`.trim(),
    );

    await pickerMain([taskFile]);

    const payload = JSON.parse(capturedConsole[0]) as Record<string, unknown>;
    assert.strictEqual(payload.branch, 'custom-branch');
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

    await expectProcessExit(pickerMain([taskFile]));

    assert.ok(
      errorLogs.some((log) =>
        /Error reading or parsing task file:/.test(log),
      ),
      'expected parse error log',
    );
  });

  test('should handle non-existent task file', async () => {
    const missingFile = path.join(tempDir, 'missing.yaml');

    await expectProcessExit(pickerMain([missingFile]));

    assert.ok(
      errorLogs.some((log) =>
        /Error reading or parsing task file:/.test(log),
      ),
      'expected missing file error log',
    );
  });

  test('should embed source file path in task summary', async () => {
    const taskFile = createTaskFile(
      `
tasks:
  - repo: owner/repo
    branch: feature-branch
`.trim(),
      'nested/tasks/sample.yaml',
    );

    await pickerMain([taskFile]);

    const payload = parseConsolePayload();
    const task = payload.task as Record<string, unknown>;
    assert.strictEqual(task?.sourceFile, taskFile);
  });
});
