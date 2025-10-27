import assert from 'node:assert';
import { afterEach, beforeEach, describe, test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { runPlanner } from '../task-planner/planner.js';
import type { Agent } from '../core/ports/agent-port.js';
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
      command: 'init',
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
    assert.ok(
      fs.existsSync(promptFile),
      'expected planning prompt file to be created',
    );
    const promptContents = fs.readFileSync(promptFile, 'utf8');
    assert.match(promptContents, /Create a plan to refactor modules/);
    assert.match(promptContents, /Command: init/);
  });

  test('still runs when idea is missing (validated earlier in pipeline)', async () => {
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

    const result = await runPlanner({
      command: 'init',
      task,
      agent: agentStub,
      agentId: AgentId.GoogleGemini25Flash,
      mainWorkspacePath: workspacePath,
      additionalWorkspaces: [],
      timeoutMs: 120000,
      signal: new AbortController().signal,
    });

    assert.strictEqual(result.status, 'success');
    const promptFile = path.join(workspacePath, 'planning-prompt.md');
    assert.ok(fs.existsSync(promptFile));
  });

  test('includes update-specific instructions when command is update', async () => {
    const agentStub: Agent = {
      async run() {
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
      idea: 'Refine plan based on review',
      stage: 'planning',
      task_dir: 'tasks/plan-only',
      planning_pr_id: '123',
      review_required: true,
    };

    const result = await runPlanner({
      command: 'update',
      task,
      agent: agentStub,
      agentId: AgentId.GoogleGemini25Flash,
      mainWorkspacePath: workspacePath,
      additionalWorkspaces: [],
      timeoutMs: 120000,
      signal: new AbortController().signal,
    });

    assert.strictEqual(result.status, 'success');
    const promptFile = path.join(workspacePath, 'planning-prompt.md');
    const promptContents = fs.readFileSync(promptFile, 'utf8');
    assert.match(promptContents, /Command: update/);
    assert.match(promptContents, /PLAN UPDATE \(update command\)/);
  });

  test('syncs generated plan into provided tasks repository workspace', async () => {
    const tasksRepoWorkspace = path.join(tempDir, 'tasks-repo');
    const additionalWorkspace = path.join(tempDir, 'additional');
    fs.mkdirSync(tasksRepoWorkspace, { recursive: true });
    fs.mkdirSync(additionalWorkspace, { recursive: true });

    const task: Task = {
      repo: 'owner/repo',
      branch: 'plan',
      agents: [AgentId.GoogleGemini25Flash],
      kind: 'planning',
      idea: 'Sync plan document',
      stage: 'planning',
      task_dir: 'tasks/planning-sync',
    };

    const planBody = '# Plan\n- step 1';

    const agentStub: Agent = {
      async run() {
        const planPath = path.join(workspacePath, task.task_dir, 'plan.md');
        fs.mkdirSync(path.dirname(planPath), { recursive: true });
        fs.writeFileSync(planPath, planBody, 'utf8');
        return {
          status: 'success',
          logs: 'plan created',
        };
      },
    };

    const result = await runPlanner({
      command: 'init',
      task,
      agent: agentStub,
      agentId: AgentId.GoogleGemini25Flash,
      mainWorkspacePath: workspacePath,
      additionalWorkspaces: [additionalWorkspace, tasksRepoWorkspace],
      timeoutMs: 120000,
      signal: new AbortController().signal,
    });

    assert.strictEqual(result.status, 'success');

    const syncedPlanPath = path.join(
      tasksRepoWorkspace,
      'tasks/planning-sync/plan.md',
    );
    assert.ok(
      fs.existsSync(syncedPlanPath),
      'expected plan.md to be copied into tasks repo workspace',
    );
    const syncedPlan = fs.readFileSync(syncedPlanPath, 'utf8');
    assert.strictEqual(syncedPlan, planBody);
  });
});
