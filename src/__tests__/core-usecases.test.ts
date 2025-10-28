import assert from 'node:assert';
import { afterEach, beforeEach, describe, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Agent } from '../core/ports/agent-port.js';
import { AgentId } from '../types/agent.js';
import type { MatchedTask } from '../types/task.js';
import type { Services } from '../core/usecases/types.js';
import type { GitService } from '../core/services/git-service.js';
import { planTask } from '../core/usecases/plan-task/plan-task.js';
import { implementTask } from '../core/usecases/implementTask.js';

const createAgentStub = (
  onRun?: (options: Parameters<Agent['run']>[0]) => void,
): Agent => ({
  async run(options) {
    onRun?.(options);
    return {
      status: 'success',
      logs: 'stub logs',
      diagnostics: { ok: true },
    };
  },
});

const createLoggerStub = () => {
  const messages: string[] = [];
  return {
    messages,
    logger: {
      info(message: string) {
        messages.push(`info:${message}`);
      },
      warn(message: string) {
        messages.push(`warn:${message}`);
      },
      error(message: string) {
        messages.push(`error:${message}`);
      },
      debug(message: string) {
        messages.push(`debug:${message}`);
      },
    },
  };
};

describe('core usecases', () => {
  let tmpDir: string;
  let mainWorkspace: string;
  let tasksRepoPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'usecase-tests-'));
    mainWorkspace = path.join(tmpDir, 'main');
    fs.mkdirSync(mainWorkspace, { recursive: true });
    tasksRepoPath = path.join(tmpDir, 'tasks-repo');
    // No need to create the directory, workspace.prepare will do it
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('planTask prepares workspace, runs agent, and ensures PR when review is required', async () => {
    const workspaceCalls: Array<
      Parameters<Services['workspace']['prepare']>[0]
    > = [];
    const prCalls: Array<Parameters<Services['pr']['openPullRequest']>[0]> = [];
    const gitCalls: Array<{ method: string; args: unknown }> = [];
    const loggerStub = createLoggerStub();
    let commitInvocation = 0;

    const matchedTask: MatchedTask = {
      selectedAgent: AgentId.GoogleGemini25Flash,
      task: {
        repo: 'owner/repo',
        branch: 'feature/refactor',
        agents: [AgentId.GoogleGemini25Flash],
        kind: 'feature',
        idea: 'Improve structure',
        stage: 'planning',
        task_dir: 'tasks/refactor',
        review_required: true,
      },
    };

    const agent = createAgentStub((options) => {
      const agentWorkspaces = options.additionalWorkspaces ?? [];
      assert.ok(
        agentWorkspaces.some((p) => p.includes(tasksRepoPath)),
        'expected tasks repository workspace to be provided',
      );
      const planPath = path.join(
        tasksRepoPath,
        matchedTask.task.task_dir,
        'plan.md',
      );
      fs.mkdirSync(path.dirname(planPath), { recursive: true });
      fs.writeFileSync(planPath, '# Plan\n- refactor', 'utf8');
    });

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
        commitInvocation += 1;
        return true;
      },
      async push(opts) {
        gitCalls.push({ method: 'push', args: opts });
      },
    };

    const services: Services = {
      workspace: {
        async prepare(params) {
          workspaceCalls.push(params);
          fs.mkdirSync(tasksRepoPath, { recursive: true }); // Simulate prepare creating the dir
          return [mainWorkspace, tasksRepoPath];
        },
      },
      agents: {
        getAgent() {
          return agent;
        },
      },
      pr: {
        async openPullRequest(params) {
          prCalls.push(params);
          return {
            id: 1,
            number: 1,
            url: 'http://example.com/pr/1',
            created: true,
            baseBranch: params.baseBranch ?? 'main',
          };
        },
      },
      logger: loggerStub.logger,
      git: gitStub,
    };

    const result = await planTask('init', matchedTask, services, {
      workspaceRoot: tmpDir,
      tasksRepoPath,
    });

    assert.strictEqual(result.status, 'success');
    assert.strictEqual(workspaceCalls.length, 1);
    assert.deepStrictEqual(workspaceCalls[0].repo, 'owner/repo');
    assert.ok(workspaceCalls[0].additionalRepos?.some(r => r.repo === 'spigell/my-reforge-ai')); // Corrected assertion
    assert.strictEqual(prCalls.length, 1);
    assert.strictEqual(gitCalls.length, 8);
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
    assert.strictEqual(commitInvocation, 1);
    assert.deepStrictEqual(gitCalls[0].args, {
      cwd: tasksRepoPath,
      message: 'Empty commit',
    });
    assert.deepStrictEqual(prCalls[0], {
      owner: 'spigell',
      repo: 'my-reforge-ai',
      title: 'Auto created PR',
      headBranch: matchedTask.task.branch,
      baseBranch: 'main',
      body: `Auto-created planning PR for task with idea: 
${matchedTask.task.idea}`,
      draft: false,
    });
    const taskYamlPath = path.join(tasksRepoPath, 'tasks/refactor/task.yaml');
    assert.ok(fs.existsSync(taskYamlPath), 'expected task.yaml to be written');
    const yamlContent = fs.readFileSync(taskYamlPath, 'utf8');
    assert.match(yamlContent, /stage: planning/);
    assert.match(yamlContent, /planning_pr_id: '?1'?/);
    assert.strictEqual(matchedTask.task.planning_pr_id, '1');
    const planPrompt = path.join(mainWorkspace, 'planning-prompt.md');
    assert.ok(
      fs.existsSync(planPrompt),
      'expected planning prompt to be written in workspace',
    );
    assert.ok(
      loggerStub.messages.some((message) =>
        message.includes('Planner finished'),
      ),
      'expected planner to log completion',
    );
    const syncedPlanPath = path.join(
      tasksRepoPath,
      matchedTask.task.task_dir,
      'plan.md',
    );
    assert.ok(
      fs.existsSync(syncedPlanPath),
      'expected plan.md to be written into tasks repository workspace by agent',
    );
  });

  test('implementTask prepares workspace and ensures PR when review is required', async () => {
    const workspaceCalls: Array<
      Parameters<Services['workspace']['prepare']>[0]
    > = [];
    const prCalls: Array<Parameters<Services['pr']['openPullRequest']>[0]> = [];
    let capturedPrompt: string | undefined;
    const agent = createAgentStub((options) => {
      capturedPrompt = options.prompt;
    });
    const loggerStub = createLoggerStub();
    const gitStub: GitService = {
      async ensureBranchAndSync() {}
      ,
      async commitEmpty() {
        return false;
      },
      async mergeBranch() {
        return false;
      },
      async commitAll() {
        return false;
      },
      async push() {},
    };

    const services: Services = {
      workspace: {
        async prepare(params) {
          workspaceCalls.push(params);
          return [mainWorkspace];
        },
      },
      agents: {
        getAgent() {
          return agent;
        },
      },
      pr: {
        async openPullRequest(params) {
          prCalls.push(params);
          return {
            id: 2,
            number: 2,
            url: 'http://example.com/pr/2',
            created: true,
            baseBranch: params.baseBranch ?? 'main',
          };
        },
      },
      logger: loggerStub.logger,
      git: gitStub,
    };

    const matchedTask: MatchedTask = {
      selectedAgent: AgentId.OpenAICodex,
      task: {
        repo: 'owner/repo',
        branch: 'feature/implement',
        agents: [AgentId.OpenAICodex],
        kind: 'feature',
        stage: 'implementing',
        task_dir: 'tasks/implement',
        review_required: true,
      },
    };

    const result = await implementTask(matchedTask, services, {
      workspaceRoot: tmpDir,
    });

    assert.strictEqual(result.status, 'success');
    assert.strictEqual(workspaceCalls.length, 1);
    assert.deepStrictEqual(workspaceCalls[0], {
      repo: 'owner/repo',
      branch: 'feature/implement',
      additionalRepos: undefined,
      rootDir: tmpDir,
    });
    assert.strictEqual(prCalls.length, 1);
    assert.strictEqual(prCalls[0].owner, 'owner');
    assert.strictEqual(prCalls[0].repo, 'repo');
    assert.strictEqual(prCalls[0].headBranch, matchedTask.task.branch);
    assert.strictEqual(
      prCalls[0].title,
      `feat(${matchedTask.task.repo}@${matchedTask.task.branch}): ${matchedTask.task.task_dir}`,
    );
    assert.ok(
      capturedPrompt?.includes('plan.md'),
      'implementor prompt should reference plan.md',
    );
  });
});