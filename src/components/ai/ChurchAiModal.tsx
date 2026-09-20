import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, RefreshCw, Trash2, X, Sparkles, ShieldAlert, 
  Users, Calendar, UserPlus, Heart, BarChart3, MessageSquare, AlertCircle,
  CheckCircle2, Edit3, XCircle, BookOpen, Bell, Award, UserCheck
} from 'lucide-react';
import { SaaSUserRole } from '@/types';
import { normalizeRole } from '@/utils/rbac';
import { churchAiService, ChatMessage } from '@/services/churchAiService';

interface ChurchAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchId: string;
  userRole?: SaaSUserRole | string;
  userName?: string;
  userEmail?: string;
  memberId?: string;
  authorizedMinistryIds?: string[];
  activeTabOrScreen?: string;
}

export const ChurchAiModal: React.FC<ChurchAiModalProps> = ({
  isOpen,
  onClose,
  churchId,
  userRole = 'Member',
  userName = 'Church Member',
  userEmail = '',
  memberId = '',
  authorizedMinistryIds = [],
  activeTabOrScreen = 'dashboard'
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [showDebugTrace, setShowDebugTrace] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const normRole = normalizeRole(userRole);

  const isLeadership = ['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'TreasurerStaff'].includes(normRole);
  const isLeader = isLeadership || normRole === 'MinistryLeader' || normRole === 'SundaySchoolTeacher';

  // Role-Aware Suggested Quick Prompts
  const getRoleAwarePrompts = () => {
    if (isLeadership) {
      return [
        { icon: BarChart3, label: "Show attendance this month and compare with last month." },
        { icon: Users, label: "How many total members do we have and show recent joins?" },
        { icon: UserPlus, label: "Show visitors who need follow-up and pending tasks." },
        { icon: AlertCircle, label: "Show members with no recorded attendance in past 30 days." },
        { icon: Calendar, label: "What upcoming events are on the church calendar?" }
      ];
    }
    if (normRole === 'MinistryLeader') {
      return [
        { icon: Users, label: "Show my ministry members and team leader details." },
        { icon: Calendar, label: "Who is serving this Sunday in my ministry?" },
        { icon: Award, label: "How was our ministry attendance this month?" },
        { icon: MessageSquare, label: "Create an announcement for Media Ministry." }
      ];
    }
    return [
      { icon: Calendar, label: "What are my upcoming roster assignments?" },
      { icon: UserCheck, label: "Show my attendance record." },
      { icon: Bell, label: "Show church announcements and upcoming events." },
      { icon: BookOpen, label: "Find Bible verses about faith and forgiveness." }
    ];
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-1',
          sender: 'assistant',
          text: `Grace and peace, ${userName}! Welcome to **Church AI**. 

I am your central conversational assistant. I can assist you with profile details, attendance records, roster assignments, prayer requests, events, and ministry insights.

*How may I serve you today?*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, userName, messages.length]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string, actionToConfirm?: any) => {
    const prompt = (textToSend || inputText).trim();
    if ((!prompt && !actionToConfirm) || isLoading) return;

    setErrorMsg(null);
    if (prompt) setLastPrompt(prompt);
    setInputText('');

    if (!actionToConfirm) {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg]);
    }

    setIsLoading(true);

    try {
      const result = await churchAiService.askChurchAi({
        prompt: prompt || 'Confirm proposed action',
        churchId,
        userRole,
        userName,
        userEmail,
        memberId,
        authorizedMinistryIds,
        activeTabOrScreen,
        history: messages,
        debugMode: showDebugTrace,
        actionToExecute: actionToConfirm
      });

      const assistantMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        text: result.responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        requiresConfirmation: result.requiresConfirmation,
        proposedActionPayload: result.proposedActionPayload
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Church AI error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred while communicating with Church AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Chat history cleared. How can I assist you today, ${userName}?`,
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
        if (content.startsWith('### ')) {
          return <h4 key={idx} className="font-bold text-base text-purple-950 dark:text-purple-200 mt-2 mb-1">{content.replace('### ', '')}</h4>;
        }
        if (content.startsWith('## ')) {
          return <h3 key={idx} className="font-bold text-lg text-purple-950 dark:text-purple-200 mt-2 mb-1">{content.replace('## ', '')}</h3>;
        }
        if (content.startsWith('- ')) {
          return (
            <li key={idx} className="ml-4 list-disc text-slate-800 dark:text-slate-200 my-0.5">
              {renderBoldText(content.replace('- ', ''))}
            </li>
          );
        }
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
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white border-b border-purple-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg leading-tight">Church AI</h3>
                <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 uppercase">
                  {userRole}
                </span>
              </div>
              <p className="text-xs text-purple-200/80">Central Permission-Aware Conversational Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {messages.length > 1 && (
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
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
          
          {/* Messages Container */}
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
                        <span className="font-semibold text-purple-700 dark:text-purple-300">Church AI</span>
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

                  {/* Interactive Proposed Action Card */}
                  {msg.requiresConfirmation && msg.proposedActionPayload && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2 text-xs">
                      <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4 text-purple-600" />
                        <span>Proposed Action Details:</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900 text-slate-800 dark:text-slate-200">
                        <p><strong>Action:</strong> {msg.proposedActionPayload.actionType}</p>
                        <p><strong>Title / Role:</strong> {msg.proposedActionPayload.title || msg.proposedActionPayload.roleName}</p>
                        <p><strong>Target:</strong> {msg.proposedActionPayload.targetRole || msg.proposedActionPayload.memberName}</p>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => handleSendMessage(undefined, msg.proposedActionPayload)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Publish / Confirm Action</span>
                        </button>
                        <button
                          onClick={() => setInputText(`Edit: ${msg.proposedActionPayload.title || msg.proposedActionPayload.roleName}`)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-xs p-4 shadow-xs flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400 animate-spin">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Consulting Church AI Services...</p>
                    <p className="text-[10px] text-slate-400">Verifying role permissions & synthesizing response</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-rose-800 dark:text-rose-300 text-xs">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Role-Aware Suggested Prompts Pills */}
          {messages.length <= 2 && !isLoading && (
            <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-900/70 border-t border-slate-200/60 dark:border-slate-800/60">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-purple-500" />
                <span>Suggested Actions for {userRole}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {getRoleAwarePrompts().map((q, idx) => {
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

          {/* Input Form */}
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
                placeholder="Ask Church AI about members, assignments, attendance, events..."
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
      </div>
    </div>
  );
};
