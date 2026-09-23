import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, RefreshCw, Trash2, X, Sparkles, ShieldAlert, 
  Users, Calendar, UserPlus, Heart, BarChart3, MessageSquare, AlertCircle
} from 'lucide-react';
import { SaaSUserRole } from '@/types';
import { canAccessAiPastor } from '@/utils/rbac';
import { aiPastorService, ChatMessage } from '@/services/aiPastorService';

interface AiPastorAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchId: string;
  userRole?: SaaSUserRole | string;
  userName?: string;
}

const SUGGESTED_QUESTIONS = [
  { icon: Users, label: "How many members do we currently have?" },
  { icon: BarChart3, label: "Show me this month's attendance summary." },
  { icon: UserPlus, label: "How many visitors need follow-up?" },
  { icon: Calendar, label: "What upcoming events are on the calendar?" },
  { icon: Heart, label: "Give me a summary of active prayer requests." },
];

export const AiPastorAssistantModal: React.FC<AiPastorAssistantModalProps> = ({
  isOpen,
  onClose,
  churchId,
  userRole = 'PastorAdmin',
  userName = 'Pastor',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [showDebugTrace, setShowDebugTrace] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isAuthorized = canAccessAiPastor(userRole);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initial welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0 && isAuthorized) {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'assistant',
          text: `Grace and peace, ${userName}! I am your **AI Pastor Assistant**. 

I can assist you in querying church records, attendance stats, visitor follow-ups, prayer requests, and upcoming events using natural language.

Feel free to ask a question or select one of the suggested topics below!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, isAuthorized, userName, messages.length]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isLoading || !isAuthorized) return;

    setErrorMsg(null);
    setLastPrompt(prompt);
    setInputText('');

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const result = await aiPastorService.askAiPastor({
        prompt,
        churchId,
        userRole,
        userName,
        history: messages,
        debugMode: showDebugTrace
      });

      const assistantMessage: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        text: result.responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Error asking AI Pastor Assistant:', err);
      const errText = err.message || 'An unexpected error occurred while consulting the AI Pastor Assistant.';
      setErrorMsg(errText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastPrompt) {
      handleSendMessage(lastPrompt);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Chat history cleared. How can I assist you with church insights today, ${userName}?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setErrorMsg(null);
  };

  const formatMarkdownText = (text: string) => {
    const lines = text.split('\n');
    return lines
      .filter(line => {
        const trimmed = line.trim();
        return !trimmed.startsWith('<details') && !trimmed.startsWith('</details>') && !trimmed.startsWith('<summary') && !trimmed.startsWith('</summary>');
      })
      .map((line, idx) => {
        let content = line;

        // Headings
        if (content.startsWith('### ')) {
          return <h4 key={idx} className="font-bold text-base text-purple-950 dark:text-purple-200 mt-2 mb-1">{content.replace('### ', '')}</h4>;
        }
        if (content.startsWith('## ')) {
          return <h3 key={idx} className="font-bold text-lg text-purple-950 dark:text-purple-200 mt-2 mb-1">{content.replace('## ', '')}</h3>;
        }

        // Bullet points
        if (content.startsWith('- ')) {
          const bulletText = content.replace('- ', '');
          return (
            <li key={idx} className="ml-4 list-disc text-slate-800 dark:text-slate-200 my-0.5">
              {renderBoldText(bulletText)}
            </li>
          );
        }

        // Paragraph
        return (
          <p key={idx} className="text-slate-800 dark:text-slate-200 my-1 leading-relaxed">
            {renderBoldText(content)}
          </p>
        );
      });
  };

  const renderBoldText = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col h-[85vh] max-h-[750px] border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white border-b border-purple-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg leading-tight">AI Pastor Assistant</h3>
                <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 uppercase">
                  Leadership Only
                </span>
              </div>
              <p className="text-xs text-purple-200/80">Factual, permission-gated church record insights</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isAuthorized && messages.length > 1 && (
              <button
                onClick={handleClearHistory}
                title="Clear Chat History"
                className="p-2 rounded-lg text-purple-200/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-purple-200/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isAuthorized ? (
          /* Unauthorized Access Guard Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50 dark:bg-slate-900">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Leadership Access Restricted</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                The AI Pastor Assistant is available exclusively to authorized Church Leadership (Senior Pastors, Assistant Pastors, and Platform Super Admins).
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium rounded-xl text-sm shadow-md hover:opacity-90 transition-opacity"
            >
              Close Window
            </button>
          </div>
        ) : (
          /* Authorized Chat Screen */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
            
            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-xs text-sm ${
                      msg.sender === 'user'
                        ? 'bg-purple-600 text-white rounded-br-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1 opacity-75 text-[11px]">
                      {msg.sender === 'assistant' ? (
                        <>
                          <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span className="font-semibold text-purple-700 dark:text-purple-300">AI Pastor Assistant</span>
                        </>
                      ) : (
                        <span className="font-semibold ml-auto">{userName}</span>
                      )}
                      <span className="text-[10px] ml-auto">{msg.timestamp}</span>
                    </div>

                    <div className="space-y-1">
                      {msg.sender === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        formatMarkdownText(msg.text)
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading Animation */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-xs p-4 shadow-xs flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 animate-spin">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Consulting church database...</p>
                      <p className="text-[10px] text-slate-400">Synthesizing factual records</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-rose-800 dark:text-rose-300 text-xs">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="flex items-center space-x-1 px-3 py-1 bg-rose-600 text-white rounded-lg font-medium text-xs hover:bg-rose-700 transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Suggested Quick Question Pills */}
            {messages.length <= 2 && !isLoading && (
              <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-900/70 border-t border-slate-200/60 dark:border-slate-800/60">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span>Suggested Quick Queries</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((q, idx) => {
                    const IconComp = q.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q.label)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-200 hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-300 transition-all shadow-2xs hover:shadow-xs"
                      >
                        <IconComp className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span>{q.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input Box */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask a question about members, attendance, visitors, events..."
                  disabled={isLoading}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-transparent dark:border-slate-700"
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  className="p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl transition-colors shadow-md disabled:shadow-none flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
