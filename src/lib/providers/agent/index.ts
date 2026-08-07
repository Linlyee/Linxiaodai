import { AgentProvider } from './types';
import { mockAgentProvider } from './mock';
import { openaiAgentProvider } from './openai';

export type { AgentProvider, AgentInput, AgentOutput } from './types';

export function getAgentProvider(): AgentProvider {
  const provider = process.env.AGENT_PROVIDER || 'mock';

  switch (provider) {
    case 'openai':
      return openaiAgentProvider;
    case 'mock':
    default:
      return mockAgentProvider;
  }
}

export { mockAgentProvider, openaiAgentProvider };
