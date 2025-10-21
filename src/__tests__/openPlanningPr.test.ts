import assert from 'node:assert';
import { describe, test } from 'node:test';
import type { PullRequestPort } from '../core/ports/PullRequestPort.js';
import { openPlanningPr } from '../core/usecases/plan-task/open-pr.js';

describe('openPlanningPr', () => {
  test('passes provided PR metadata through to the pull request port', async () => {
    const receivedCalls: Array<
      Parameters<PullRequestPort['openOrGetPullRequest']>[0]
    > = [];
    const prStub: PullRequestPort = {
      async openOrGetPullRequest(params) {
        receivedCalls.push(params);
        return {
          id: 42,
          number: 42,
          url: 'http://example.com/pr/42',
          created: true,
          baseBranch: params.baseBranch ?? 'main',
        };
      },
    };
    const infoMessages: string[] = [];
    const loggerStub = {
      info(message: string) {
        infoMessages.push(message);
      },
      warn() {},
      error() {},
    };

    const result = await openPlanningPr(
      {
        owner: 'owner',
        repo: 'repo',
        workspacePath: '/tmp/workspace',
        taskDir: 'tasks/sample',
        taskObject: { key: 'value' },
        featureBranch: 'feature/sample',
        baseBranch: 'main',
        prTitle: 'planning: sample',
        prBody: 'Auto-created planning PR for sample',
        draft: false,
      },
      {
        pr: prStub,
        logger: loggerStub,
      },
    );

    assert.strictEqual(result.number, 42);
    assert.strictEqual(receivedCalls.length, 1);
    assert.deepStrictEqual(receivedCalls[0], {
      owner: 'owner',
      repo: 'repo',
      headBranch: 'feature/sample',
      baseBranch: 'main',
      title: 'planning: sample',
      body: 'Auto-created planning PR for sample',
      draft: false,
    });
    assert.strictEqual(infoMessages.length, 1);
    assert.match(infoMessages[0], /Planning PR .*created/);
  });

  test('applies defaults when optional fields are omitted', async () => {
    let receivedParams:
      | Parameters<PullRequestPort['openOrGetPullRequest']>[0]
      | undefined;
    const loggerStub = {
      info() {},
      warn() {},
      error() {},
    };

    await openPlanningPr(
      {
        owner: 'owner',
        repo: 'repo',
        workspacePath: '/tmp/workspace',
        taskDir: 'tasks/sample',
        taskObject: {},
        featureBranch: 'feature/sample',
      },
      {
        pr: {
          async openOrGetPullRequest(params) {
            receivedParams = params;
            return {
              id: 1,
              number: 1,
              url: 'http://example.com/pr/1',
              created: false,
              baseBranch: 'main',
            };
          },
        },
        logger: loggerStub,
      },
    );

    assert.deepStrictEqual(receivedParams, {
      owner: 'owner',
      repo: 'repo',
      headBranch: 'feature/sample',
      baseBranch: undefined,
      title: 'test',
      body: undefined,
      draft: true,
    });
  });
});
