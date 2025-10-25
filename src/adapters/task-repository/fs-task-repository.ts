import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import type {
  TaskRecord,
  TaskRepositoryPort,
} from '../../core/ports/task-repository-port.js';
import type { Task } from '../../types/task.js';

const TASK_FILENAME = 'task.yaml';
const DEFAULT_COMPLETED_DIR = 'completed';

const ensurePosixPath = (value: string): string =>
  value.split(path.sep).join(path.posix.sep);

const readTaskFromFile = async (filePath: string): Promise<Task | null> => {
  try {
    const contents = await fsp.readFile(filePath, 'utf8');
    const parsed = loadYaml(contents);
    if (parsed && typeof parsed === 'object') {
      return parsed as Task;
    }
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const writeTaskToFile = async (filePath: string, task: Task) => {
  const serialized = dumpYaml(task, { noRefs: true });
  await fsp.writeFile(filePath, serialized, 'utf8');
};

const toTaskRecord = ({
  task,
  absoluteDir,
  relativeDir,
}: {
  task: Task;
  absoluteDir: string;
  relativeDir: string;
}): TaskRecord => ({
  task,
  absolutePath: absoluteDir,
  relativeDir,
});

export class FsTaskRepository implements TaskRepositoryPort {
  async listActiveTasks(tasksRoot: string): Promise<TaskRecord[]> {
    const absoluteRoot = path.resolve(tasksRoot);
    if (!fs.existsSync(absoluteRoot)) {
      return [];
    }
    const entries = await fsp.readdir(absoluteRoot, {
      withFileTypes: true,
    });
    const result: TaskRecord[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === DEFAULT_COMPLETED_DIR) continue;

      const absoluteDir = path.join(absoluteRoot, entry.name);
      const taskFile = path.join(absoluteDir, TASK_FILENAME);
      const task = await readTaskFromFile(taskFile);
      if (!task) continue;

      if (task.stage === 'completed') continue;
      if (
        typeof task.task_dir === 'string' &&
        ensurePosixPath(task.task_dir).includes('/completed/')
      ) {
        continue;
      }

      result.push(
        toTaskRecord({
          task,
          absoluteDir,
          relativeDir: entry.name,
        }),
      );
    }

    return result;
  }

  async markTaskAsCompleted(
    record: TaskRecord,
    options: { completedDirName?: string } = {},
  ): Promise<{ newAbsolutePath: string }> {
    const completedDirName = options.completedDirName ?? DEFAULT_COMPLETED_DIR;
    const taskDir = record.absolutePath;
    const taskFile = path.join(taskDir, TASK_FILENAME);

    const task = await readTaskFromFile(taskFile);
    if (!task) {
      throw new Error(`Task file not found at ${taskFile}`);
    }

    const originalTaskDirField =
      typeof task.task_dir === 'string' && task.task_dir.length > 0
        ? ensurePosixPath(task.task_dir)
        : path.posix.join('tasks', record.relativeDir);

    const baseSegments = originalTaskDirField.split('/').slice(0, -1);
    const itemName =
      originalTaskDirField.split('/').at(-1) ?? record.relativeDir;

    const newTaskDirField = path.posix.join(
      ...(baseSegments.length > 0 ? baseSegments : ['tasks']),
      completedDirName,
      itemName,
    );

    const updatedTask: Task = {
      ...task,
      stage: 'completed',
      task_dir: newTaskDirField,
    };

    await writeTaskToFile(taskFile, updatedTask);

    const parentDir = path.dirname(taskDir);
    const completedAbsoluteDir = path.join(parentDir, completedDirName);
    await fsp.mkdir(completedAbsoluteDir, { recursive: true });

    const destination = path.join(completedAbsoluteDir, path.basename(taskDir));

    if (fs.existsSync(destination)) {
      await fsp.rm(destination, { recursive: true, force: true });
    }

    await fsp.rename(taskDir, destination);

    return { newAbsolutePath: destination };
  }
}
