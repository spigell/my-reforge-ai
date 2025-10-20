import assert from 'node:assert';
import { afterEach, beforeEach, describe, test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { runPlanner } from '../task-planner/planner.js';
import type { Agent } from '../task-executor/agents/base.js';
import { AgentId } from '../types/agent.js';
import type { Task } from '../types/task.js';

describe('Task Planner', () => {
  let tempDir: string;
  let workspacePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'task-planner-tests-'));
    workspacePath = path.join(tempDir, 'workspace');
    fs.mkdirSync(workspacePath, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('renders planning prompt and runs agent with plan file instruction', async () => {
    let capturedPrompt: string | undefined;
    const agentStub: Agent = {
      async run(options) {
        capturedPrompt = options.prompt;
        return {
          status: 'success',
          logs: 'done',
        };
      },
    };

    const task: Task = {
      repo: 'owner/repo',
      branch: 'plan',
      agents: [AgentId.GoogleGemini25Flash],
      kind: 'planning',
      idea: 'Create a plan to refactor modules',
      stage: 'planning',
      task_dir: 'tasks/plan-only',
    };

    const result = await runPlanner({
      task,
      agent: agentStub,
      agentId: AgentId.GoogleGemini25Flash,
      mainWorkspacePath: workspacePath,
      additionalWorkspaces: [],
      timeoutMs: 120000,
      signal: new AbortController().signal,
    });

    assert.strictEqual(result.status, 'success');
    assert.strictEqual(
      capturedPrompt,
      'Read the prompt file ./planning-prompt.md in this workspace and execute.',
    );

    const promptFile = path.join(workspacePath, 'planning-prompt.md');
    assert.ok(fs.existsSync(promptFile), 'expected planning prompt file to be created');
    const promptContents = fs.readFileSync(promptFile, 'utf8');
    assert.match(promptContents, /Create a plan to refactor modules/);
  });

  test('throws when idea is missing for planning stage', async () => {
    const agentStub: Agent = {
      async run() {
        return {
          status: 'success',
          logs: 'no-op',
        };
      },
    };

    const task = {
      repo: 'owner/repo',
      branch: 'plan',
      agents: [AgentId.GoogleGemini25Flash],
      kind: 'planning',
      stage: 'planning' as const,
      task_dir: 'tasks/plan-only',
    } satisfies Task;

    await assert.rejects(
      () =>
        runPlanner({
          task,
          agent: agentStub,
          agentId: AgentId.GoogleGemini25Flash,
          mainWorkspacePath: workspacePath,
          additionalWorkspaces: [],
          timeoutMs: 120000,
          signal: new AbortController().signal,
        }),
      /requires an idea/,
    );
  });
});
