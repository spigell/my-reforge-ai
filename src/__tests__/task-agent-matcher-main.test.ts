import assert from 'node:assert';
import { afterEach, beforeEach, describe, test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import * as yaml from 'js-yaml';
import { main as matcherMain } from '../core/entrypoints/task-agent-matcher.js';
import { MatchedTask } from '../types/task.js';
import { UsageServiceAdapter } from '../adapters/usage/usage-service.js';
import { ConsoleLogger } from '../adapters/logger/logger.js'; // Import ConsoleLogger

const logger = new ConsoleLogger(); // Instantiate logger

describe('Task Agent Matcher Main', () => {
  let tempDir: string;
  let capturedConsole: string[];
  let originalHasTokens: UsageServiceAdapter['hasTokens'];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(
      path.join(tmpdir(), 'task-agent-matcher-main-tests-'),
    );
    capturedConsole = [];

    originalHasTokens = UsageServiceAdapter.prototype.hasTokens;
    UsageServiceAdapter.prototype.hasTokens = async () => true;

    global.console.log = (message?: unknown) => {
      capturedConsole.push(String(message ?? ''));
    };
  });

  afterEach(() => {
    UsageServiceAdapter.prototype.hasTokens = originalHasTokens;
    global.console.log = console.log;

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const createTaskFile = (
    dir: string,
    fileName: string,
    content: Record<string, any>,
  ) => {
    const filePath = path.join(dir, fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, yaml.dump(content), 'utf8');
    return filePath;
  };

  const readOutputFile = (filePath: string) =>
    JSON.parse(fs.readFileSync(filePath, 'utf8')) as MatchedTask;

  test('pick command should select a task from a file', async () => {
    const task = { ideas: [{ repo: 'owner/repo', idea: 'my idea' }] };
    const taskFile = createTaskFile(tempDir, 'task.yaml', task);
    const outputFile = path.join(tempDir, 'output.json');

    await matcherMain('pick', { outputFile, ideasFilePath: taskFile });

    const payload = readOutputFile(outputFile);
    logger.debug(JSON.stringify(payload, null, 2)); // Changed to logger.debug
    assert.strictEqual(payload.task.idea, 'my idea');
  });

  test('take-from-pr should find task by pr number', async () => {
    const tasksDir = path.join(tempDir, 'tasks');
    createTaskFile(tasksDir, 'task1/task.yaml', {
      planning_pr_id: '123',
      idea: 'idea 1',
    });
    createTaskFile(tasksDir, 'task2/task.yaml', {
      planning_pr_id: '456',
      idea: 'idea 2',
    });
    const outputFile = path.join(tempDir, 'output.json');

    await matcherMain('take-from-pr', {
      prNumber: '456',
      outputFile,
      taskDir: tasksDir,
    });

    const payload = readOutputFile(outputFile);
    assert.strictEqual(payload.task.idea, 'idea 2');
  });

  test('take-from-pr should exit if no matching pr is found', async () => {
    const tasksDir = path.join(tempDir, 'tasks');
    createTaskFile(tasksDir, 'task1/task.yaml', { planning_pr_id: '123' });

    await assert.rejects(
      matcherMain('take-from-pr', {
        prNumber: '999',
        taskDir: tasksDir,
        outputFile: '',
      }),
    );
  });

  test('should exit for invalid command', async () => {
    await assert.rejects(matcherMain('invalid-command', { outputFile: '' }));
  });
});
