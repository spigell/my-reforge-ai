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

handlebars.registerHelper('eq', (a, b) => a === b);

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
  const templatePath = getPlanningTemplatePath();
  console.log(`Using planning template: ${templatePath}`);

  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const template = handlebars.compile(templateContent, { noEscape: true });
  const context = { command, task, tasksRepositoryWorkspace }; // Updated context
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
  // Prompt written to mainWorkspacePath
  const promptFilePath = path.join(mainWorkspacePath, promptFileName);
  fs.writeFileSync(promptFilePath, renderedPrompt, 'utf8');
  console.log(`Planning prompt written to: ${promptFilePath}`);

  const agentPrompt =
    'Read the prompt file ./planning-prompt.md in this workspace and execute.';

  const result = await agent.run(
    {
      targetWorkspace: mainWorkspacePath, // Agent works in mainWorkspacePath
      additionalWorkspaces: [...additionalWorkspaces, tasksRepositoryWorkspace], // Pass tasksRepositoryWorkspace as additional
      prompt: agentPrompt,
      timeoutMs,
      model: agentId,
      onData,
    },
    signal,
  );

  // Removed syncPlanDocument call as it's no longer needed

  return result;
}

const getPlanningTemplatePath = () => {
  // Assumes the script is run from the project root
  return path.resolve('src', 'task-planner', 'planning-promt-tmpl.md');
};