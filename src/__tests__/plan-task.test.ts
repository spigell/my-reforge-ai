import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import type { Agent } from '../core/ports/agent-port.js';
import type { GitService } from '../core/services/git-service.js';
import type { Services } from '../core/usecases/types.js';
import { planTask } from '../core/usecases/plan-task/plan-task.js';
import type { MatchedTask } from '../types/task.js';
import { AgentId } from '../types/agent.js';

const createAgentStub = (taskDir: string, workspaceRoot: string): Agent => ({
  async run(options) {
    const tasksRepoWorkspace = path.join(workspaceRoot, 'tasks');
    // The tasksRepoWorkspace is no longer passed as an additionalWorkspace to the agent
    // as it's now assumed to be part of the main workspace structure.
    // const agentWorkspaces = options.additionalWorkspaces ?? [];
    // assert.ok(
    //   agentWorkspaces.some((p) => p.includes(tasksRepoWorkspace)),
    //   'expected tasks repository workspace to be provided to agent',
    // );
    const planPath = path.join(tasksRepoWorkspace, taskDir, 'plan.md');
    fs.mkdirSync(path.dirname(planPath), { recursive: true });
    fs.writeFileSync(planPath, '# Plan\n- stub planner run', 'utf8');
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
    const prCalls: Array<Parameters<Services['pr']['openPullRequest']>[0]> = [];

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

    const services: Services = {
      workspace: {
        async prepare() {
          fs.mkdirSync(path.join(tmpDir, 'tasks'), { recursive: true }); // Simulate prepare creating the tasks dir
          return [mainWorkspace];
        },
      },
      agents: {
        getAgent() {
          return createAgentStub(matchedTask.task.task_dir, tmpDir);
        },
      },
      pr: {
        async openPullRequest(params) {
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

    const result = await planTask('init', matchedTask, services, {
      workspaceRoot: tmpDir,
    });

    assert.strictEqual(result.status, 'success');
    assert.strictEqual(prCalls.length, 1);
    assert.deepStrictEqual(prCalls[0], {
      owner: 'spigell', // Corrected owner
      repo: 'my-reforge-ai', // Corrected repo
      title: 'Auto created PR',
      headBranch: 'feature/sample',
      baseBranch: 'main',
      body: `Auto-created planning PR for task with idea: 
${matchedTask.task.idea}`,
      draft: false,
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
    assert.strictEqual(result.status, 'success');
    const taskYamlPath = path.join(tmpDir, 'tasks', 'tasks/sample/task.yaml'); // Corrected path
    assert.ok(fs.existsSync(taskYamlPath));
    const yamlContents = fs.readFileSync(taskYamlPath, 'utf8');
    assert.match(yamlContents, /stage: planning/);
    assert.match(yamlContents, /planning_pr_id: '?42'?/);
    assert.strictEqual(matchedTask.task.planning_pr_id, '42');
    const syncedPlanPath = path.join(
      tmpDir,
      'tasks',
      matchedTask.task.task_dir,
      'plan.md',
    );
    assert.ok(
      fs.existsSync(syncedPlanPath),
      'expected plan.md to be written into tasks repo workspace by agent',
    );
  });

  test('throws when repo or branch are missing', async () => {
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

    const services: Services = {
      workspace: {
        async prepare() {
          return [mainWorkspace];
        },
      },
      agents: {
        getAgent() {
          return createAgentStub(invalidTask.task.task_dir, tmpDir);
        },
      },
      pr: {
        async openPullRequest() {
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

    await assert.rejects(
      () =>
        planTask('init', invalidTask, services, {
          workspaceRoot: tmpDir,
        }),
      /Task repo and branch must be defined/,
    );
  });

  test('throws when idea is missing', async () => {
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

    const services: Services = {
      workspace: {
        async prepare() {
          return [mainWorkspace];
        },
      },
      agents: {
        getAgent() {
          return createAgentStub(invalidTask.task.task_dir, tmpDir);
        },
      },
      pr: {
        async openPullRequest() {
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

    await assert.rejects(
      () =>
        planTask('init', invalidTask, services, {
          workspaceRoot: tmpDir,
        }),
      /Planning stage requires an idea/,
    );
  });

  test('requires planning_pr_id when command is update', async () => {
    const matchedTask: MatchedTask = {
      selectedAgent: AgentId.OpenAICodex,
      task: {
        repo: 'owner/repo',
        branch: 'feature/sample',
        agents: [AgentId.OpenAICodex],
        kind: 'feature',
        idea: 'Initial plan exists',
        stage: 'planning',
        task_dir: 'tasks/sample',
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
          return createAgentStub(matchedTask.task.task_dir, tmpDir);
        },
      },
      pr: {
        async openPullRequest() {
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

    await assert.rejects(
      () =>
        planTask('update', matchedTask, services, {
          workspaceRoot: tmpDir,
        }),
      /requires a planning_pr_id/,
    );
  });

  test('runs update command without creating empty commit when planning_pr_id is provided', async () => {
    const gitCalls: Array<{ method: string; args: unknown }> = [];

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

    const matchedTask: MatchedTask = {
      selectedAgent: AgentId.OpenAICodex,
      task: {
        repo: 'owner/repo',
        branch: 'feature/sample',
        agents: [AgentId.OpenAICodex],
        kind: 'feature',
        stage: 'planning',
        task_dir: 'tasks/sample',
        planning_pr_id: '99',
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
          return createAgentStub(matchedTask.task.task_dir, tmpDir);
        },
      },
      pr: {
        async openPullRequest(params) {
          return {
            id: 99,
            number: 99,
            url: 'http://example.com/pr/99',
            created: false,
            baseBranch: params.baseBranch ?? 'main',
          };
        },
      },
      logger: createLoggerStub(),
      git: gitStub,
    };

    const result = await planTask('update', matchedTask, services, {
      workspaceRoot: tmpDir,
    });

    assert.strictEqual(result.status, 'success');
    assert.ok(
      gitCalls.every((call) => call.method !== 'commitEmpty'),
      'commitEmpty should not be called during update runs',
    );
  });

  test('throws when empty commit cannot be created during init', async () => {
    const gitStub: GitService = {
      async ensureBranchAndSync() {},
      async commitEmpty() {
        return false;
      },
      async mergeBranch() {
        return true;
      },
      async commitAll() {
        return true;
      },
      async push() {},
    };

    const matchedTask: MatchedTask = {
      selectedAgent: AgentId.OpenAICodex,
      task: {
        repo: 'owner/repo',
        branch: 'feature/sample',
        agents: [AgentId.OpenAICodex],
        kind: 'feature',
        idea: 'Initial plan',
        stage: 'planning',
        task_dir: 'tasks/sample',
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
          return createAgentStub(matchedTask.task.task_dir, tmpDir);
        },
      },
      pr: {
        async openPullRequest() {
          throw new Error('should not reach PR creation when commit fails');
        },
      },
      logger: createLoggerStub(),
      git: gitStub,
    };

    await assert.rejects(
      () =>
        planTask('init', matchedTask, services, {
          workspaceRoot: tmpDir,
        }),
      /Failed to create bootstrap empty commit/,
    );
  });
});
