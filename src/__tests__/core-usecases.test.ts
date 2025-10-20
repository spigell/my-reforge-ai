import assert from 'node:assert';
import { afterEach, beforeEach, describe, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Agent } from '../libs/agents/base.js';
import { AgentId } from '../types/agent.js';
import type { MatchedTask } from '../types/task.js';
import type { Services } from '../core/usecases/types.js';
import { planTask } from '../core/usecases/planTask.js';
import { implementTask } from '../core/usecases/implementTask.js';

const createAgentStub = (onRun?: (options: Parameters<Agent['run']>[0]) => void): Agent => ({
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

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'usecase-tests-'));
    mainWorkspace = path.join(tmpDir, 'main');
    fs.mkdirSync(mainWorkspace, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('planTask prepares workspace, runs agent, and ensures PR when review is required', async () => {
    const workspaceCalls: Array<Parameters<Services['workspace']['prepare']>[0]> = [];
    const prCalls: Array<Parameters<Services['pr']['ensurePr']>[0]> = [];
    const agent = createAgentStub();
    const loggerStub = createLoggerStub();

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
        async ensurePr(params) {
          prCalls.push(params);
          return { url: 'http://example.com/pr/1', number: 1, created: true };
        },
      },
      logger: loggerStub.logger,
    };

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

    const result = await planTask(matchedTask, services, {
      workspaceRoot: tmpDir,
    });

    assert.strictEqual(result.status, 'success');
    assert.strictEqual(workspaceCalls.length, 1);
    assert.deepStrictEqual(workspaceCalls[0], {
      repo: 'owner/repo',
      branch: 'feature/refactor',
      additionalRepos: undefined,
      rootDir: tmpDir,
    });
    assert.strictEqual(prCalls.length, 1);
    const planPrompt = path.join(mainWorkspace, 'planning-prompt.md');
    assert.ok(
      fs.existsSync(planPrompt),
      'expected planning prompt to be written in workspace',
    );
    assert.ok(
      loggerStub.messages.some((message) => message.includes('Planner finished')),
      'expected planner to log completion',
    );
  });

  test('implementTask prepares workspace and ensures PR when review is required', async () => {
    const workspaceCalls: Array<Parameters<Services['workspace']['prepare']>[0]> = [];
    const prCalls: Array<Parameters<Services['pr']['ensurePr']>[0]> = [];
    let capturedPrompt: string | undefined;
    const agent = createAgentStub((options) => {
      capturedPrompt = options.prompt;
    });
    const loggerStub = createLoggerStub();

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
        async ensurePr(params) {
          prCalls.push(params);
          return { url: 'http://example.com/pr/2', number: 2, created: true };
        },
      },
      logger: loggerStub.logger,
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
    assert.ok(
      capturedPrompt?.includes('plan.md'),
      'implementor prompt should reference plan.md',
    );
  });
});
