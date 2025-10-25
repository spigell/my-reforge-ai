import assert from 'node:assert';
import { afterEach, beforeEach, describe, test } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import * as yaml from 'js-yaml';
import { pickNextTask } from '../core/usecases/match-task.js';

describe('pickNextTask', () => {
  let tempDir: string;

  const writeYaml = (filePath: string, data: unknown) => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, yaml.dump(data), 'utf8');
  };

  const writeIdeas = (ideas: Array<Record<string, unknown>>) => {
    const filePath = path.join(tempDir, 'ideas.yaml');
    writeYaml(filePath, { ideas });
    return filePath;
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'pick-next-task-tests-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('selects the highest priority task and preserves FIFO for ties', () => {
    const ideasFile = writeIdeas([
      {
        repo: 'example/high',
        branch: 'main',
        kind: 'feature',
        idea: 'High priority idea',
        priority: 'high',
        task_dir: 'tasks/high',
      },
      {
        repo: 'example/medium-first',
        branch: 'develop',
        kind: 'feature',
        idea: 'Medium priority first',
        priority: 'medium',
        task_dir: 'tasks/medium-first',
      },
      {
        repo: 'example/medium-second',
        branch: 'develop',
        kind: 'feature',
        idea: 'Medium priority second',
        priority: 'medium',
        task_dir: 'tasks/medium-second',
      },
    ]);

    const pickedFirst = pickNextTask(ideasFile);
    assert.strictEqual(pickedFirst.repo, 'example/high');

    // Remove the first entry and ensure FIFO ordering among equal priorities.
    const ideasFileUpdated = writeIdeas([
      {
        repo: 'example/medium-first',
        branch: 'develop',
        kind: 'feature',
        idea: 'Medium priority first',
        priority: 'medium',
        task_dir: 'tasks/medium-first',
      },
      {
        repo: 'example/medium-second',
        branch: 'develop',
        kind: 'feature',
        idea: 'Medium priority second',
        priority: 'medium',
        task_dir: 'tasks/medium-second',
      },
    ]);

    const pickedSecond = pickNextTask(ideasFileUpdated);
    assert.strictEqual(pickedSecond.repo, 'example/medium-first');
  });

  test('skips review-required tasks when a blocking task of the same kind exists', () => {
    const ideasFile = writeIdeas([
      {
        repo: 'example/review-feature',
        branch: 'main',
        kind: 'feature',
        idea: 'Review required feature',
        priority: 'high',
        review_required: true,
        task_dir: 'tasks/review-feature',
      },
      {
        repo: 'example/non-review',
        branch: 'main',
        kind: 'maintenance',
        idea: 'Non-review fallback task',
        priority: 'medium',
        review_required: false,
        task_dir: 'tasks/non-review',
      },
    ]);

    const existingTaskDir = path.join(tempDir, 'existing-task');
    writeYaml(path.join(existingTaskDir, 'task.yaml'), {
      repo: 'example/repo',
      branch: 'feat/existing',
      kind: 'feature',
      review_required: true,
      task_dir: 'tasks/existing',
      stage: 'planning',
    });

    const pickedTask = pickNextTask(ideasFile);

    assert.strictEqual(pickedTask.repo, 'example/non-review');
    assert.strictEqual(pickedTask.kind, 'maintenance');
  });

  test('returns tasks marked as ready-for-implementing without altering stage', () => {
    const ideasFile = writeIdeas([
      {
        repo: 'example/ready',
        branch: 'main',
        kind: 'feature',
        idea: 'Work ready to implement',
        priority: 'high',
        task_dir: 'tasks/ready',
        stage: 'ready-for-implementing',
      },
      {
        repo: 'example/planning',
        branch: 'main',
        kind: 'feature',
        idea: 'Still planning',
        priority: 'high',
        task_dir: 'tasks/planning',
        stage: 'planning',
      },
    ]);

    const pickedTask = pickNextTask(ideasFile);

    assert.strictEqual(pickedTask.repo, 'example/ready');
    assert.strictEqual(pickedTask.stage, 'ready-for-implementing');
  });
});
