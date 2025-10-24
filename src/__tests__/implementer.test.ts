import assert from 'node:assert';
import { afterEach, beforeEach, describe, test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { runImplementer } from '../task-implementor/implementor.js';
import type { Agent } from '../core/ports/agent-port.js';
import { AgentId } from '../types/agent.js';
import type { Task } from '../types/task.js';

describe('Task Implementer', () => {
  let tempDir: string;
  let workspacePath: string;
  let capturedPrompt: string | undefined;
  let capturedMetadata: Record<string, unknown> | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'task-implementor-tests-'));
    workspacePath = path.join(tempDir, 'workspace');
    fs.mkdirSync(workspacePath, { recursive: true });
    capturedPrompt = undefined;
    capturedMetadata = undefined;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('runs agent with implementation prompt referencing plan file', async () => {
    const agentStub: Agent = {
      async run(options) {
        capturedPrompt = options.prompt;
        capturedMetadata = options.runMetadata;
        return {
          status: 'success',
          logs: 'done',
        };
      },
    };

    const task: Task = {
      repo: 'owner/repo',
      branch: 'feature/add',
      agents: [AgentId.OpenAICodex],
      kind: 'feature',
      stage: 'implementing',
      task_dir: 'tasks/sample',
    };

    const result = await runImplementer({
      task,
      agent: agentStub,
      agentId: AgentId.OpenAICodex,
      mainWorkspacePath: workspacePath,
      additionalWorkspaces: [],
      timeoutMs: 60000,
      signal: new AbortController().signal,
    });

    assert.strictEqual(result.status, 'success');
    assert.ok(capturedPrompt, 'expected implementer to provide a prompt');
    assert.match(
      capturedPrompt ?? '',
      /tasks\/sample\/plan\.md/,
      'prompt should reference plan.md location',
    );
    assert.deepStrictEqual(
      capturedMetadata,
      {
        planPath: path.join(workspacePath, 'tasks/sample/plan.md'),
      },
      'expected run metadata to expose absolute plan path',
    );
  });
});
