import { ConsoleLogger } from '../../adapters/logger/logger.js';
import { GithubPrService } from '../../adapters/pr/github-pr.js';
import { FsTaskRepository } from '../../adapters/task-repository/fs-task-repository.js';
import { runHouseKeeper } from '../usecases/house-keeper/house-keeper.js';

export type HouseKeeperMainOptions = {
  tasksRoot?: string;
  completedDirName?: string;
};

export async function main(options: HouseKeeperMainOptions = {}) {
  const logger = new ConsoleLogger();
  const pullRequest = new GithubPrService();
  const taskRepository = new FsTaskRepository();

  await runHouseKeeper(
    {
      tasksRoot: options.tasksRoot ?? 'tasks',
      completedDirName: options.completedDirName ?? 'completed',
    },
    {
      logger,
      pullRequest,
      taskRepository,
    },
  );
}
