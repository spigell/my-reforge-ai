import path from 'path';
import { Agent } from '../task-executor/agents/base.js';
import { AgentId } from '../types/agent.js';
import { Task } from '../types/task.js';

export type ImplementerOptions = {
  task: Task;
  agent: Agent;
  agentId: AgentId;
  mainWorkspacePath: string;
  additionalWorkspaces: string[];
  timeoutMs: number;
  signal: AbortSignal;
};

export async function runImplementer({
  task,
  agent,
  agentId,
  mainWorkspacePath,
  additionalWorkspaces,
  timeoutMs,
  signal,
}: ImplementerOptions) {
  const relativePlanPath = path.posix.join(task.task_dir, 'plan.md');
  const absolutePlanPath = path.join(mainWorkspacePath, relativePlanPath);

  const promptLines = [
    `Implement the work described in the plan located at ${relativePlanPath}.`,
    `If the plan file is missing, report the issue and stop.`,
    `Work inside the current repository at ${mainWorkspacePath}.`,
    `Coordinate with additional workspaces when provided.`,
    `Ensure changes align with the branch ${task.branch} and respect review settings.`,
  ];

  const agentPrompt = promptLines.join('\n');

  return agent.run(
    {
      targetWorkspace: mainWorkspacePath,
      additionalWorkspaces,
      prompt: agentPrompt,
      runMetadata: {
        planPath: absolutePlanPath,
      },
      timeoutMs,
      model: agentId,
    },
    signal,
  );
}
