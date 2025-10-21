import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import type { GitService } from '../core/services/GitService.js';
import type { PullRequestPort } from '../core/ports/PullRequestPort.js';
import { openPlanningPr } from '../core/usecases/openPlanningPr.js';

describe('openPlanningPr', () => {
  let workspaceRoot: string;
  let gitCalls: Array<{ method: string; args: unknown }>;

  const gitStub: GitService = {
    async ensureBranchAndSync(opts) {
      gitCalls.push({ method: 'ensureBranchAndSync', args: opts });
    },
    async commitAll(opts) {
      gitCalls.push({ method: 'commitAll', args: opts });
      return true;
    },
    async push(opts) {
      gitCalls.push({ method: 'push', args: opts });
    },
  };

  const loggerStub = {
    info() {},
    warn() {},
    error() {},
  };

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'open-planning-pr-'));
    gitCalls = [];
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  test('writes task yaml, creates PR metadata, and performs git operations', async () => {
    const prStub: PullRequestPort = {
      async openOrGetPullRequest() {
        return {
          id: 42,
          number: 42,
          url: 'http://example.com/pr/42',
          created: true,
          baseBranch: 'main',
        };
      },
    };

    const taskDir = 'tasks/sample';
    const result = await openPlanningPr(
      {
        owner: 'owner',
        repo: 'repo',
        workspacePath: workspaceRoot,
        taskId: 'sample',
        taskDir,
        taskObject: { key: 'value' },
        featureBranch: 'feature/sample',
        baseBranch: 'main',
        prTitle: 'planning: sample',
        prBody: 'Auto-created planning PR for sample',
        draft: true,
      },
      {
        git: gitStub,
        pr: prStub,
        logger: loggerStub,
      },
    );

    assert.strictEqual(result.number, 42);
    const yamlPath = path.join(workspaceRoot, taskDir, 'task.yaml');
    assert.ok(fs.existsSync(yamlPath));
    const contents = fs.readFileSync(yamlPath, 'utf8');
    assert.match(contents, /key: value/);
    assert.match(contents, /staging: planning/);
    assert.match(contents, /planning_pr_id: 42/);
    assert.strictEqual(gitCalls.length, 5);
    assert.deepStrictEqual(
      gitCalls.map((c) => c.method),
      [
        'ensureBranchAndSync',
        'commitAll',
        'push',
        'commitAll',
        'push',
      ],
    );
  });
});
