import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { fileURLToPath } from 'node:url';
import { Agent } from '../task-executor/agents/base.js';
import { AgentId } from '../types/agent.js';
import { Task } from '../types/task.js';

export type PlannerOptions = {
  task: Task;
  agent: Agent;
  agentId: AgentId;
  mainWorkspacePath: string;
  additionalWorkspaces: string[];
  timeoutMs: number;
  signal: AbortSignal;
};

export async function runPlanner({
  task,
  agent,
  agentId,
  mainWorkspacePath,
  additionalWorkspaces,
  timeoutMs,
  signal,
}: PlannerOptions) {
  if (!task.idea) {
    throw new Error('Planning stage requires an idea to generate a plan.');
  }

  const templatePath = getPlanningTemplatePath();
  console.log(`Using planning template: ${templatePath}`);

  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const template = handlebars.compile(templateContent, { noEscape: true });
  const context = { task };
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

  return agent.run(
    {
      targetWorkspace: mainWorkspacePath,
      additionalWorkspaces,
      prompt: agentPrompt,
      timeoutMs,
      model: agentId,
    },
    signal,
  );
}

const getPlanningTemplatePath = () => {
  const templateUrl = new URL('../task-executor/planning-promt-tmpl.md', import.meta.url);
  return fileURLToPath(templateUrl);
};
