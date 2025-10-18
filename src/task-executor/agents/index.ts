import { AgentId } from '../../types/task.js';
import { Agent } from './base.js';
import { CodexAgent } from './codex.js';
import { GeminiAgent } from './gemini.js';

export { Agent, AgentRunOptions, AgentRunResult } from './base.js';

export function getAgent(agentId: AgentId): Agent {
  switch (agentId) {
    case AgentId.OpenAICodex:
      return new CodexAgent();
    case AgentId.GoogleGemini25Pro:
    case AgentId.GoogleGemini25Flash:
      return new GeminiAgent();
    default:
      throw new Error(`Unknown agent: ${agentId}`);
  }
}
