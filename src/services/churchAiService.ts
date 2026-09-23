import { SaaSUserRole } from '@/types';
import { churchAiEngine, AskEngineOptions, ChurchAiTrace } from './churchAiEngine';
import { UserSecurityContext } from './churchAiToolRegistry';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
  requiresConfirmation?: boolean;
  proposedActionPayload?: any;
  ambiguityOptions?: { label: string; actionPrompt: string }[];
}

export interface AskChurchAiOptions {
  prompt: string;
  churchId: string;
  userRole?: SaaSUserRole | string;
  userName?: string;
  userEmail?: string;
  memberId?: string;
  authorizedMinistryIds?: string[];
  activeTabOrScreen?: string;
  history?: ChatMessage[];
  debugMode?: boolean;
  actionToExecute?: any;
}

export const churchAiService = {
  buildUserSecurityContext(options: AskChurchAiOptions): UserSecurityContext {
    return churchAiEngine.buildUserSecurityContext(options as AskEngineOptions);
  },

  async askChurchAi(options: AskChurchAiOptions): Promise<{
    responseText: string;
    requiresConfirmation?: boolean;
    proposedActionPayload?: any;
    ambiguityOptions?: any[];
    trace?: ChurchAiTrace;
  }> {
    const result = await churchAiEngine.processUserRequest({
      ...options,
      engineMode: 'general'
    });

    return {
      responseText: result.responseText,
      requiresConfirmation: result.requiresConfirmation,
      proposedActionPayload: result.proposedActionPayload,
      trace: result.trace
    };
  }
};
