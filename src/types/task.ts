import { AgentId } from './agent.js';

export type TaskPriority = 'high' | 'medium' | 'low';

type GeneralTask = {
  repo: string;
  branch: string;
  agents: AgentId[];
  kind: string;
  priority?: TaskPriority;
  additionalRepos?: Array<{
    repo: string;
    branch?: string;
    directoryName?: string;
  }>;
  planning_pr_id?: string;
  review_required?: boolean;
  timeout_ms?: number;
  task_dir: string;
};

export type TaskStage =
  | 'planning'
  | 'ready-for-implementing'
  | 'implementing'
  | 'completed';

export type Task = GeneralTask & {
  stage: TaskStage;
  idea?: string;
};

export type Idea = GeneralTask & {
  idea: string;
};

export type MatchedTask = {
  selectedAgent: AgentId;
  task: Task;
};
