import assert from 'node:assert/strict';
import test from 'node:test';
import type { LoggerPort } from '../core/ports/logger-port.js';
import type { PullRequestStatusPort } from '../core/ports/pull-request-port.js';
import type {
  TaskRecord,
  TaskRepositoryPort,
} from '../core/ports/task-repository-port.js';
import { runHouseKeeper } from '../core/usecases/house-keeper/house-keeper.js';
import type { Task } from '../types/task.js';

class StubLogger implements LoggerPort {
  info() {}
  warn() {}
  error() {}
  debug() {}
}

class StubTaskRepository implements TaskRepositoryPort {
  private readonly records: TaskRecord[];
  readonly completed: TaskRecord[] = [];

  constructor(records: TaskRecord[]) {
    this.records = records;
  }

  async listActiveTasks(_tasksRoot: string): Promise<TaskRecord[]> {
    return this.records;
  }

  async markTaskAsCompleted(
    record: TaskRecord,
    _options?: { completedDirName?: string },
  ) {
    this.completed.push(record);
    return { newAbsolutePath: `/completed/${record.relativeDir}` };
  }
}

class StubPullRequestService implements PullRequestStatusPort {
  constructor(
    private readonly statuses: Record<
      string,
      {
        merged: boolean;
        state: 'open' | 'closed';
        url?: string;
        title?: string;
      }
    >,
  ) {}

  async getPullRequestStatus({
    owner,
    repo,
    prNumber,
  }: Parameters<PullRequestStatusPort['getPullRequestStatus']>[0]) {
    const key = `${owner}/${repo}#${prNumber}`;
    const status = this.statuses[key];
    if (!status) {
      throw new Error(`Status not found for ${key}`);
    }
    return {
      merged: status.merged,
      state: status.state,
      url: status.url ?? `https://example.com/${key}`,
      title: status.title ?? key,
    };
  }
}

const createTask = (overrides: Partial<Task> = {}): Task => ({
  repo: 'example/monorepo',
  branch: 'feature/task',
  kind: 'feature',
  agents: [],
  task_dir: 'tasks/sample-task',
  stage: 'planning',
  planning_pr_id: '42',
  priority: 'high',
  ...overrides,
});

test('moves tasks with merged planning PR to completed directory', async () => {
  const taskA = createTask({
    task_dir: 'tasks/task-a',
    planning_pr_id: '101',
  });
  const taskB = createTask({
    task_dir: 'tasks/task-b',
    planning_pr_id: '102',
  });

  const records: TaskRecord[] = [
    {
      task: taskA,
      absolutePath: '/tasks/task-a',
      relativeDir: 'task-a',
    },
    {
      task: taskB,
      absolutePath: '/tasks/task-b',
      relativeDir: 'task-b',
    },
  ];

  const repository = new StubTaskRepository(records);
  const pullRequests = new StubPullRequestService({
    'example/monorepo#101': { merged: true, state: 'closed' },
    'example/monorepo#102': { merged: false, state: 'open' },
  });

  await runHouseKeeper(
    { tasksRoot: 'tasks' },
    {
      logger: new StubLogger(),
      taskRepository: repository,
      pullRequest: pullRequests,
    },
  );

  assert.equal(repository.completed.length, 1);
  assert.equal(repository.completed[0].relativeDir, 'task-a');
});

test('ignores tasks without valid planning PR identifiers', async () => {
  const taskA = createTask({
    task_dir: 'tasks/task-a',
    planning_pr_id: undefined,
  });
  const taskB = createTask({
    task_dir: 'tasks/task-b',
    planning_pr_id: 'not-a-number',
  });

  const records: TaskRecord[] = [
    {
      task: taskA,
      absolutePath: '/tasks/task-a',
      relativeDir: 'task-a',
    },
    {
      task: taskB,
      absolutePath: '/tasks/task-b',
      relativeDir: 'task-b',
    },
  ];

  const repository = new StubTaskRepository(records);
  const pullRequests = new StubPullRequestService({});

  await runHouseKeeper(
    { tasksRoot: 'tasks' },
    {
      logger: new StubLogger(),
      taskRepository: repository,
      pullRequest: pullRequests,
    },
  );

  assert.equal(repository.completed.length, 0);
});
