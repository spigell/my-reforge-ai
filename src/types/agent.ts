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

export const DEFAULT_AGENT: AgentId = AgentId.GoogleGemini25Flash;

const AGENT_ALIAS_ENTRIES = Object.freeze({
  codex: AgentId.OpenAICodex,
  'openai-codex': AgentId.OpenAICodex,
  'google-gemini-2.5-pro': AgentId.GoogleGemini25Pro,
  'gemini-2.5-pro': AgentId.GoogleGemini25Pro,
  'google-gemini-2.5-flash': AgentId.GoogleGemini25Flash,
  'gemini-2.5-flash': AgentId.GoogleGemini25Flash,
} satisfies Record<string, AgentId>);

export const AGENT_ALIAS_LOOKUP: Readonly<Record<string, AgentId>> =
  AGENT_ALIAS_ENTRIES;

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
