import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import type { Agent } from '../core/ports/agent-port.js';
import { AgentId } from '../types/agent.js';
import { Task } from '../types/task.js';

export type PlannerOptions = {
  command: string;
  task: Task;
  agent: Agent;
  agentId: AgentId;
  mainWorkspacePath: string;
  additionalWorkspaces: string[];
  tasksRepositoryWorkspace: string;
  timeoutMs: number;
  signal: AbortSignal;
  onData?: (chunk: string) => void;
};

export async function runPlanner({
  command,
  task,
  agent,
  agentId,
  mainWorkspacePath,
  additionalWorkspaces,
  tasksRepositoryWorkspace,
  timeoutMs,
  signal,
  onData,
}: PlannerOptions) {
  const templatePath = getPlanningTemplatePath(command);
  console.log(`Using planning template: ${templatePath}`);

  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const template = handlebars.compile(templateContent, { noEscape: true });
  const context = { command, task, tasksRepositoryWorkspace };
  const renderedPrompt = template(context);

  console.log(renderedPrompt);

  const unresolvedVars = renderedPrompt.match(/{{(.*?)}}/g);
  if (unresolvedVars) {
    console.warn(
      `Warning: The following template variables were not resolved: ${unresolvedVars.join(
        ', ',
      )}`,
    );
  }

  const promptFileName = 'planning-prompt.md';
  const promptFilePath = path.join(mainWorkspacePath, promptFileName);
  fs.writeFileSync(promptFilePath, renderedPrompt, 'utf8');
  console.log(`Planning prompt written to: ${promptFilePath}`);

  const agentPrompt =
    'Read the prompt file ./planning-prompt.md in this workspace and execute.';

  const agentAdditionalWorkspaces = [
    // It already added as additional workspaces
    ...additionalWorkspaces,
    //tasksRepositoryWorkspace,
  ];

  return agent.run(
    {
      targetWorkspace: mainWorkspacePath,
      additionalWorkspaces: agentAdditionalWorkspaces,
      prompt: agentPrompt,
      timeoutMs,
      model: agentId,
      onData,
    },
    signal,
  );
}

const getPlanningTemplatePath = (command: string) => {
  const templateMap: Record<string, string> = {
    init: path.resolve(
      'src',
      'task-planner',
      'templates',
      'planning-init-promt-tmpl.md',
    ),
    update: path.resolve(
      'src',
      'task-planner',
      'templates',
      'planning-update-promt-tmpl.md',
    ),
  };

  const templatePath = templateMap[command];

  if (!templatePath) {
    throw new Error(`Unsupported planner command: ${command}`);
  }

  return templatePath;
};
