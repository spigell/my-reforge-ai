import { AgentId } from './agent.js';

export type TaskPriority = 'high' | 'medium' | 'low';

export type AdditionalRepo = {
  repo: string;
  branch?: string;
  directoryName?: string;
};

type GeneralTask = {
  repo: string;
  branch: string;
  agents: AgentId[];
  kind: string;
  priority?: TaskPriority;
  additionalRepos?: Array<AdditionalRepo>;
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
  planning_pr_id?: string;
  idea?: string;
};

export type Idea = GeneralTask & {
  idea: string;
};

export type MatchedTask = {
  selectedAgent: AgentId;
  task: Task;
};