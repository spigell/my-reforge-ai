import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { afterEach } from 'node:test';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { FsTaskRepository } from '../adapters/task-repository/fs-task-repository.js';

const tempDirs: string[] = [];

const createTempTasksRoot = (): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'house-keeper-'));
  tempDirs.push(dir);
  return path.join(dir, 'tasks');
};

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('listActiveTasks returns tasks that are not completed', async () => {
  const tasksRoot = createTempTasksRoot();
  await fsp.mkdir(path.join(tasksRoot, 'task-a'), { recursive: true });
  await fsp.mkdir(path.join(tasksRoot, 'completed', 'task-b'), {
    recursive: true,
  });

  await fsp.writeFile(
    path.join(tasksRoot, 'task-a', 'task.yaml'),
    dumpYaml({
      repo: 'example/monorepo',
      branch: 'main',
      kind: 'feature',
      agents: [],
      task_dir: 'tasks/task-a',
      stage: 'planning',
    }),
  );

  await fsp.writeFile(
    path.join(tasksRoot, 'completed', 'task-b', 'task.yaml'),
    dumpYaml({
      repo: 'example/monorepo',
      branch: 'main',
      kind: 'feature',
      agents: [],
      task_dir: 'tasks/completed/task-b',
      stage: 'completed',
    }),
  );

  const repository = new FsTaskRepository();
  const records = await repository.listActiveTasks(tasksRoot);

  assert.equal(records.length, 1);
  assert.equal(records[0].relativeDir, 'task-a');
});

test('markTaskAsCompleted updates task.yaml and moves directory', async () => {
  const tasksRoot = createTempTasksRoot();
  const taskDir = path.join(tasksRoot, 'task-a');
  await fsp.mkdir(taskDir, { recursive: true });

  const taskFile = path.join(taskDir, 'task.yaml');
  await fsp.writeFile(
    taskFile,
    dumpYaml({
      repo: 'example/monorepo',
      branch: 'main',
      kind: 'feature',
      agents: [],
      task_dir: 'tasks/task-a',
      stage: 'planning',
      planning_pr_id: '42',
    }),
  );

  const repository = new FsTaskRepository();
  const [record] = await repository.listActiveTasks(tasksRoot);
  assert.ok(record);

  const result = await repository.markTaskAsCompleted(record);

  const destination = path.join(tasksRoot, 'completed', 'task-a');
  assert.equal(result.newAbsolutePath, destination);
  assert.equal(fs.existsSync(destination), true);
  assert.equal(fs.existsSync(taskDir), false);

  const updatedContents = await fsp.readFile(
    path.join(destination, 'task.yaml'),
    'utf8',
  );
  const updatedTask = loadYaml(updatedContents) as Record<string, unknown>;

  assert.equal(updatedTask?.stage, 'completed');
  assert.equal(updatedTask?.task_dir, 'tasks/completed/task-a');
});
