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

export type Task = GeneralTask & {
  stage: 'planning' | 'ready-for-implementing' | 'implementing';
  idea?: string;
};

export type Idea = GeneralTask & {
  idea: string;
};

export type MatchedTask = {
  selectedAgent: AgentId;
  task: Task;
};
