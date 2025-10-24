export enum AgentId {
  OpenAICodex = 'gpt-5-codex',
  GoogleGemini25Pro = 'gemini-2.5-pro',
  GoogleGemini25Flash = 'gemini-2.5-flash',
}

export const ALLOWED_AGENTS: readonly AgentId[] = Object.freeze([
  AgentId.OpenAICodex,
  AgentId.GoogleGemini25Pro,
  AgentId.GoogleGemini25Flash,
]);
const ALLOWED_AGENT_SET = new Set<string>(ALLOWED_AGENTS);

export const DEFAULT_AGENT: AgentId = AgentId.GoogleGemini25Flash;

export function isAgentId(value: string): value is AgentId {
  return ALLOWED_AGENT_SET.has(value);
}

export const parseAgentId = (value: unknown): AgentId => {
  if (typeof value !== 'string')
    throw Error('unsupported agent type. Should be a string.');

  const trimmed = value.trim();
  const agent = isAgentId(trimmed);
  if (!agent) {
    throw Error(`invalid agent id: ${trimmed}`);
  }

  return trimmed;
};

export const normalizeAgentList = (agents: unknown[]): AgentId[] => {
  const seen = new Set<AgentId>();

  for (const candidate of agents) {
    const parsed = parseAgentId(candidate);
    if (parsed && !seen.has(parsed)) {
      seen.add(parsed);
    }
  }

  return Array.from(seen);
};
