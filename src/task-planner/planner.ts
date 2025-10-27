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
  timeoutMs,
  signal,
  onData,
}: PlannerOptions) {
  const templatePath = getPlanningTemplatePath();
  console.log(`Using planning template: ${templatePath}`);

  const templateContent = fs.readFileSync(templatePath, 'utf8');
  const template = handlebars.compile(templateContent, { noEscape: true });
  const context = { command, task };
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

  const result = await agent.run(
    {
      targetWorkspace: mainWorkspacePath,
      additionalWorkspaces,
      prompt: agentPrompt,
      timeoutMs,
      model: agentId,
      onData,
    },
    signal,
  );

  if (result.status === 'success') {
    syncPlanDocument({
      task,
      mainWorkspacePath,
      additionalWorkspaces,
    });
  }

  return result;
}

const getPlanningTemplatePath = () => {
  // Assumes the script is run from the project root
  return path.resolve('src', 'task-planner', 'planning-promt-tmpl.md');
};

type SyncPlanDocumentOptions = {
  task: Task;
  mainWorkspacePath: string;
  additionalWorkspaces: string[];
};

const syncPlanDocument = ({
  task,
  mainWorkspacePath,
  additionalWorkspaces,
}: SyncPlanDocumentOptions) => {
  if (!task.task_dir) {
    throw new Error('Task task_dir must be defined to sync plan document.');
  }

  if (additionalWorkspaces.length === 0) {
    return;
  }

  const relativePlanPath = path.join(task.task_dir, 'plan.md');
  const candidateSourcePaths = [
    path.join(mainWorkspacePath, relativePlanPath),
    ...additionalWorkspaces
      .slice(0, -1)
      .map((workspacePath) => path.join(workspacePath, relativePlanPath)),
  ];

  const tasksRepoWorkspace = additionalWorkspaces.at(-1);
  if (!tasksRepoWorkspace || !fs.existsSync(tasksRepoWorkspace)) {
    return;
  }

  const destinationPlanPath = path.join(
    tasksRepoWorkspace,
    relativePlanPath,
  );

  const sourcePlanPath = candidateSourcePaths.find((planPath) =>
    fs.existsSync(planPath),
  );

  if (!sourcePlanPath) {
    if (fs.existsSync(destinationPlanPath)) {
      return;
    }

    throw new Error(
      `Plan document ${relativePlanPath} was not found in any workspace.`,
    );
  }

  if (
    path.resolve(sourcePlanPath) === path.resolve(destinationPlanPath)
  ) {
    return;
  }

  fs.mkdirSync(path.dirname(destinationPlanPath), { recursive: true });
  fs.copyFileSync(sourcePlanPath, destinationPlanPath);
  console.log(
    `Synchronized plan document to tasks repository at ${destinationPlanPath}`,
  );
};
