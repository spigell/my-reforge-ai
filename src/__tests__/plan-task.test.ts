import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import type { Agent } from '../libs/agents/base.js';
import type { GitService } from '../core/services/GitService.js';
import type { Services } from '../core/usecases/types.js';
import { planTask } from '../core/usecases/plan-task/plan-task.js';
import type { MatchedTask } from '../types/task.js';
import { AgentId } from '../types/agent.js';

const createAgentStub = (): Agent => ({
  async run() {
    return {
      status: 'success',
      logs: 'stub planner run',
      diagnostics: {},
    };
  },
});

const createLoggerStub = () => ({
  info() {},
  warn() {},
  error() {},
});

describe('planTask use case', () => {
  let tmpDir: string;
  let mainWorkspace: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-task-tests-'));
    mainWorkspace = path.join(tmpDir, 'main');
    fs.mkdirSync(mainWorkspace, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('prepares workspace, ensures planning PR, writes task.yaml, and runs planner', async () => {
    const gitCalls: Array<{ method: string; args: unknown }> = [];
    const prCalls: Array<Parameters<Services['pr']['openOrGetPullRequest']>[0]> = [];

    const gitStub: GitService = {
      async ensureBranchAndSync(opts) {
        gitCalls.push({ method: 'ensureBranchAndSync', args: opts });
      },
      async commitEmpty(opts) {
        gitCalls.push({ method: 'commitEmpty', args: opts });
        return true;
      },
      async mergeBranch(opts) {
        gitCalls.push({ method: 'mergeBranch', args: opts });
        return true;
      },
      async commitAll(opts) {
        gitCalls.push({ method: 'commitAll', args: opts });
        return true;
      },
      async push(opts) {
        gitCalls.push({ method: 'push', args: opts });
      },
    };

    const services: Services = {
      workspace: {
        async prepare() {
          return [mainWorkspace];
        },
      },
      agents: {
        getAgent() {
          return createAgentStub();
        },
      },
      pr: {
        async openOrGetPullRequest(params) {
          prCalls.push(params);
          return {
            id: 42,
            number: 42,
            url: 'http://example.com/pr/42',
            created: true,
            baseBranch: params.baseBranch ?? 'main',
          };
        },
      },
      logger: createLoggerStub(),
      git: gitStub,
    };

    const matchedTask: MatchedTask = {
      selectedAgent: AgentId.OpenAICodex,
      task: {
        repo: 'owner/repo',
        branch: 'feature/sample',
        agents: [AgentId.OpenAICodex],
        kind: 'feature',
        idea: 'Draft the new architecture',
        stage: 'planning',
        task_dir: 'tasks/sample',
        review_required: true,
      },
    };

    const result = await planTask(matchedTask, services, { workspaceRoot: tmpDir });

    assert.strictEqual(result.status, 'success');
    assert.strictEqual(prCalls.length, 1);
    assert.deepStrictEqual(prCalls[0], {
      owner: 'owner',
      repo: 'repo',
      headBranch: 'feature/sample',
      baseBranch: undefined,
      title: 'planning: <change here>',
      body: `Auto-created planning PR for task with idea: \n${matchedTask.task.idea}`,
      draft: true,
    });
    assert.deepStrictEqual(
      gitCalls.map((call) => call.method),
      [
        'commitEmpty',
        'push',
        'ensureBranchAndSync',
        'commitAll',
        'push',
        'ensureBranchAndSync',
        'mergeBranch',
        'push',
      ],
    );
    const taskYamlPath = path.join(mainWorkspace, 'tasks/sample/task.yaml');
    assert.ok(fs.existsSync(taskYamlPath));
    const yamlContents = fs.readFileSync(taskYamlPath, 'utf8');
    assert.match(yamlContents, /stage: planning/);
    assert.match(yamlContents, /planning_pr_id: '?42'?/);
    assert.strictEqual(matchedTask.task.planning_pr_id, '42');
  });

  test('throws when repo or branch are missing', async () => {
    const services: Services = {
      workspace: {
        async prepare() {
          return [mainWorkspace];
        },
      },
      agents: {
        getAgent() {
          return createAgentStub();
        },
      },
      pr: {
        async openOrGetPullRequest() {
          return {
            id: 1,
            number: 1,
            url: 'http://example.com/pr/1',
            created: true,
            baseBranch: 'main',
          };
        },
      },
      logger: createLoggerStub(),
      git: {
        async ensureBranchAndSync() {},
        async commitEmpty() {
          return true;
        },
        async mergeBranch() {
          return true;
        },
        async commitAll() {
          return true;
        },
        async push() {},
      },
    };

    const invalidTask = {
      selectedAgent: AgentId.OpenAICodex,
      task: {
        repo: '',
        branch: '',
        agents: [AgentId.OpenAICodex],
        kind: 'feature',
        idea: 'Anything',
        stage: 'planning' as const,
        task_dir: 'tasks/sample',
      },
    } satisfies MatchedTask;

    await assert.rejects(
      () => planTask(invalidTask, services, { workspaceRoot: tmpDir }),
      /Task repo and branch must be defined/,
    );
  });

  test('throws when idea is missing', async () => {
    const services: Services = {
      workspace: {
        async prepare() {
          return [mainWorkspace];
        },
      },
      agents: {
        getAgent() {
          return createAgentStub();
        },
      },
      pr: {
        async openOrGetPullRequest() {
          return {
            id: 1,
            number: 1,
            url: 'http://example.com/pr/1',
            created: true,
            baseBranch: 'main',
          };
        },
      },
      logger: createLoggerStub(),
      git: {
        async ensureBranchAndSync() {},
        async commitEmpty() {
          return true;
        },
        async mergeBranch() {
          return true;
        },
        async commitAll() {
          return true;
        },
        async push() {},
      },
    };

    const invalidTask: MatchedTask = {
      selectedAgent: AgentId.OpenAICodex,
      task: {
        repo: 'owner/repo',
        branch: 'feature/sample',
        agents: [AgentId.OpenAICodex],
        kind: 'feature',
        stage: 'planning',
        task_dir: 'tasks/sample',
      },
    };

    await assert.rejects(
      () => planTask(invalidTask, services, { workspaceRoot: tmpDir }),
      /Planning stage requires an idea/,
    );
  });
});
