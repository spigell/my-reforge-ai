import fs from 'node:fs';
import path from 'node:path';
import type { WorkspacePort } from '../../core/ports/WorkspacePort.js';
import { prepareWorkspaces } from '../../libs/workspace/workspace-manager.js';

export class WorkspaceManager implements WorkspacePort {
  async prepare({
    repo,
    branch,
    additionalRepos,
    rootDir,
  }: Parameters<WorkspacePort['prepare']>[0]): Promise<string[]> {
    const resolvedRoot = path.resolve(rootDir);
    fs.mkdirSync(resolvedRoot, { recursive: true });
    return prepareWorkspaces(repo, branch, additionalRepos, resolvedRoot);
  }
}
