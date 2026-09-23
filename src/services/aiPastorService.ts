import { canAccessAiPastor } from '@/utils/rbac';
import { churchAiEngine, ChurchAiTrace } from './churchAiEngine';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export interface AskAiPastorOptions {
  prompt: string;
  churchId: string;
  userRole?: string;
  userName?: string;
  history?: ChatMessage[];
  debugMode?: boolean;
}

export const aiPastorService = {
  async askAiPastor(options: AskAiPastorOptions): Promise<{ responseText: string; trace?: ChurchAiTrace }> {
    const { userRole } = options;
    if (!canAccessAiPastor(userRole)) {
      throw new Error('Access Denied: AI Pastor Assistant is restricted to authorized Church Leadership.');
    }

    const result = await churchAiEngine.processUserRequest({
      ...options,
      engineMode: 'pastor'
    });

    return {
      responseText: result.responseText,
      trace: result.trace
    };
  }
};
