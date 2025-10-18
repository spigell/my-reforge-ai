export enum AgentId {
  OpenAICodex = 'openai-codex',
  GoogleGemini25Pro = 'google-gemini-2.5-pro',
  GoogleGemini25Flash = 'google-gemini-2.5-flash',
}

export const ALLOWED_AGENTS: readonly AgentId[] = Object.freeze([
  AgentId.OpenAICodex,
  AgentId.GoogleGemini25Pro,
  AgentId.GoogleGemini25Flash,
]);

export const DEFAULT_AGENT: AgentId = AgentId.OpenAICodex;

const AGENT_ALIAS_ENTRIES: ReadonlyArray<[string, AgentId]> = Object.freeze([
  ['codex', AgentId.OpenAICodex],
  ['openai-codex', AgentId.OpenAICodex],
  ['google-gemini-2.5-pro', AgentId.GoogleGemini25Pro],
  ['gemini-2.5-pro', AgentId.GoogleGemini25Pro],
  ['google-gemini-2.5-flash', AgentId.GoogleGemini25Flash],
  ['gemini-2.5-flash', AgentId.GoogleGemini25Flash],
]);

export const AGENT_ALIAS_LOOKUP: Readonly<Record<string, AgentId>> =
  AGENT_ALIAS_ENTRIES.reduce<Record<string, AgentId>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

export const parseAgentId = (value: unknown): AgentId | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const alias = value.trim().toLowerCase();
  return AGENT_ALIAS_LOOKUP[alias];
};

export const normalizeAgentList = (agents: unknown[]): AgentId[] => {
  const seen = new Set<AgentId>();

  for (const candidate of agents) {
    const parsed = parseAgentId(candidate);
    if (parsed && !seen.has(parsed) && ALLOWED_AGENTS.includes(parsed)) {
      seen.add(parsed);
    }
  }

  return Array.from(seen);
};

export type Task = {
  id?: string;
  repo: string;
  additionalRepos?: Array<{
    repo: string; // "owner/name"
    branch?: string; // optional; if missing, use repo default branch
    directoryName?: string; // optional folder name under ./workspace
  }>;
  branch: string;
  agents: AgentId[];
  kind: string;
  idea: string;
  stage: 'planning' | 'implementing';
  pr_link?: string;
  review_required?: boolean;
  timeoutMs?: number;
  taskDir: string;
  sourceFile?: string;
};

export type MatchedTask = {
  selectedAgent: AgentId;
  task: Task;
};
