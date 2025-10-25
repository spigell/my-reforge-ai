import type { Task } from '../../types/task.js';

export type TaskRecord = {
  task: Task;
  /**
   * Absolute path to the directory that contains the task files.
   */
  absolutePath: string;
  /**
   * Directory name relative to the tasks root (e.g., "my-task").
   */
  relativeDir: string;
};

export interface TaskRepositoryPort {
  listActiveTasks(tasksRoot: string): Promise<TaskRecord[]>;
  markTaskAsCompleted(
    record: TaskRecord,
    options?: { completedDirName?: string },
  ): Promise<{ newAbsolutePath: string }>;
}
