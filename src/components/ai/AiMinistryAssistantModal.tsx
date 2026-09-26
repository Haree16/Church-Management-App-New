import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bot, Send, RefreshCw, Trash2, X, Sparkles, ShieldAlert, 
  Users, Calendar, HeartHandshake, Landmark, Megaphone, 
  MessageSquare, CheckCircle2, AlertCircle, ChevronDown, Check, ExternalLink
} from 'lucide-react';
import { 
  SaaSUser, Member, ChurchMinistry, MinistryMember, 
  RosterAssignment, MinistryActivity, MinistryAnnouncement, 
  ChurchEvent, AttendanceRecord 
} from '@/types';
import { getUserAssignedMinistries, UserMinistryInfo } from '@/utils/ministryPermissions';
import { aiMinistryService, MinistryChatMessage } from '@/services/aiMinistryService';

interface AiMinistryAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChurchId: string;
  currentUser?: SaaSUser | null;
  members: Member[];
  ministries: ChurchMinistry[];
  ministryMembers: MinistryMember[];
  roster: RosterAssignment[];
  activities: MinistryActivity[];
  announcements: MinistryAnnouncement[];
  events: ChurchEvent[];
  attendance: AttendanceRecord[];
  onSaveMinistryAnnouncement?: (announcement: MinistryAnnouncement) => void;
}

export const AiMinistryAssistantModal: React.FC<AiMinistryAssistantModalProps> = ({
  isOpen,
  onClose,
  currentChurchId,
  currentUser,
  members,
  ministries,
  ministryMembers,
  roster,
  activities,
  announcements,
  events,
  attendance,
  onSaveMinistryAnnouncement,
}) => {
  // Get all assigned ministries for current user
  const assignedMinistries: UserMinistryInfo[] = useMemo(() => {
    return getUserAssignedMinistries(currentUser, members, ministries, ministryMembers);
  }, [currentUser, members, ministries, ministryMembers]);

  const [selectedMinistryId, setSelectedMinistryId] = useState<string>('');
  const [messages, setMessages] = useState<MinistryChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [publishedAnnouncements, setPublishedAnnouncements] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Set default selected ministry when modal opens
  useEffect(() => {
    if (isOpen && assignedMinistries.length > 0 && !selectedMinistryId) {
      setSelectedMinistryId(assignedMinistries[0].ministry.id);
    }
  }, [isOpen, assignedMinistries, selectedMinistryId]);

  const currentMinistryInfo = useMemo(() => {
    return assignedMinistries.find(m => m.ministry.id === selectedMinistryId) || assignedMinistries[0];
  }, [assignedMinistries, selectedMinistryId]);

  const isLeader = currentMinistryInfo?.isLeader || false;
  const activeMinistryName = currentMinistryInfo?.ministry.name || 'My Ministry';

  // Dynamic suggested questions based on whether user is Member or Leader in selected ministry
  const suggestedQuestions = useMemo(() => {
    if (isLeader) {
      return [
        "Who are the members of my ministry?",
        "Who is assigned this Sunday?",
        "Who has not confirmed their assignment?",
        "Show our ministry attendance.",
        "Summarize this month's ministry activity.",
        "Create a ministry announcement."
      ];
    }
    return [
      "What is my next assignment?",
      "When is our next ministry meeting?",
      "Who is in my ministry?",
      "What are our upcoming events?",
      "Show my ministry attendance.",
      "Summarize our latest announcements."
    ];
  }, [isLeader]);

  // Initial welcome message per ministry context
  useEffect(() => {
    if (isOpen && selectedMinistryId && isHasMinistry) {
      setMessages([
        {
          id: `welcome-${selectedMinistryId}`,
          sender: 'assistant',
          text: `Grace and peace, ${currentUser?.name ? currentUser.name.split(' ')[0] : 'Leader'}! I am your **AI Ministry Assistant** for **${activeMinistryName}**.

How can I help you with your team duties, meeting schedules, or announcements today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, selectedMinistryId, activeMinistryName]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const isHasMinistry = assignedMinistries.length > 0;

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isLoading || !selectedMinistryId) return;

    setErrorMsg(null);
    setLastPrompt(prompt);
    setInputText('');

    const userMessage: MinistryChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await aiMinistryService.askAiMinistry({
        prompt,
        selectedMinistryId,
        churchId: currentChurchId,
        currentUser,
        members,
        ministries,
        ministryMembers,
        roster,
        activities,
        announcements,
        events,
        attendance
      });

      const assistantMessage: MinistryChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        text: res.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionDraft: res.actionDraft
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('AI Ministry Assistant error:', err);
      setErrorMsg(err.message || 'An error occurred while consulting the AI Ministry Assistant.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPublishAnnouncement = (msgId: string, draft: any) => {
    if (!onSaveMinistryAnnouncement || !draft) return;

    const newAnn: MinistryAnnouncement = {
      id: `min-ann-${Date.now()}`,
      church_id: currentChurchId,
      churchId: currentChurchId,
      ministryId: draft.ministryId,
      title: draft.title || 'Ministry Notice',
      message: draft.message || draft.title,
      authorName: currentUser?.name || 'Ministry Leader',
      date: new Date().toISOString().split('T')[0],
      priority: 'Normal',
      createdAt: new Date().toISOString()
    };

    onSaveMinistryAnnouncement(newAnn);
    setPublishedAnnouncements(prev => ({ ...prev, [msgId]: true }));
  };

  const handleOpenWhatsAppUrl = (draftText: string) => {
    const encoded = encodeURIComponent(draftText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Chat history cleared. How can I assist you with **${activeMinistryName}**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setErrorMsg(null);
  };

  const formatMarkdownText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content = line;

      if (content.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-base text-indigo-200 mt-2 mb-1">{content.replace('### ', '')}</h4>;
      }
      if (content.startsWith('## ')) {
        return <h3 key={idx} className="font-bold text-lg text-indigo-200 mt-2 mb-1">{content.replace('## ', '')}</h3>;
      }
      if (content.startsWith('- ')) {
        const bulletText = content.replace('- ', '');
        return (
          <li key={idx} className="ml-4 list-disc text-slate-100 my-0.5">
            {renderFormattedText(bulletText)}
          </li>
        );
      }
      return (
        <p key={idx} className="text-slate-100 my-1 leading-relaxed">
          {renderFormattedText(content)}
        </p>
      );
    });
  };

  const renderFormattedText = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-indigo-200 font-medium">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="dark dark-ai-modal bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col h-[85vh] max-h-[750px] border border-slate-700/80 overflow-hidden my-auto text-slate-100"
        data-theme-surface="dark"
        data-preserve-dark="true"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div 
          data-theme-surface="dark"
          data-preserve-dark="true"
          className="dark-hero-panel flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white border-b border-indigo-800/40 shrink-0"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse text-[#818cf8]" style={{ color: '#818cf8' }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg leading-tight truncate text-white" style={{ color: '#ffffff' }}>AI Ministry Assistant</h3>
                <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-[#c7d2fe] border border-indigo-400/30 uppercase shrink-0" style={{ color: '#c7d2fe' }}>
                  {currentMinistryInfo?.roleTitle || 'Ministry Team'}
                </span>
              </div>
              <div className="text-xs text-[#c7d2fe] truncate font-normal leading-normal" style={{ color: '#c7d2fe' }}>
                Ask questions about your ministry duties & schedules
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 shrink-0">
            {isHasMinistry && messages.length > 1 && (
              <button
                onClick={handleClearHistory}
                title="Clear Chat History"
                className="p-2 rounded-lg text-indigo-200/80 hover:text-white hover:bg-white/10 transition-colors"
                style={{ color: '#c7d2fe' }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-indigo-200/80 hover:text-white hover:bg-white/10 transition-colors"
              style={{ color: '#c7d2fe' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isHasMinistry ? (
          /* User Not Assigned to Ministry Guard */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-900">
            <div className="w-16 h-16 rounded-full bg-amber-900/30 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h4 className="text-xl font-bold text-white" style={{ color: '#ffffff' }}>You are not currently assigned to a ministry.</h4>
              <p className="text-sm text-slate-300 leading-relaxed" style={{ color: '#cbd5e1' }}>
                The AI Ministry Assistant provides context-aware insights for members assigned to church ministry teams. Contact your church leadership to get assigned to a ministry.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-semibold rounded-xl text-sm shadow-md transition"
              style={{ color: '#ffffff' }}
            >
              Close Window
            </button>
          </div>
        ) : (
          /* Authorized Ministry Context Chat Area */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/70">
            
            {/* Ministry Selector Bar */}
            <div className="px-4 py-2 bg-indigo-950/90 text-white flex items-center justify-between border-b border-indigo-800/40 text-xs shrink-0">
              <div className="flex items-center space-x-2">
                <Landmark className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-200 font-medium" style={{ color: '#e0e7ff' }}>Select Authorized Ministry Context:</span>
              </div>
              
              {assignedMinistries.length > 1 ? (
                <div className="relative">
                  <select
                    value={selectedMinistryId}
                    onChange={(e) => setSelectedMinistryId(e.target.value)}
                    className="bg-indigo-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-7 cursor-pointer"
                    style={{ backgroundColor: '#312e81', color: '#ffffff' }}
                  >
                    {assignedMinistries.map((info) => (
                      <option key={info.ministry.id} value={info.ministry.id}>
                        {info.ministry.name} ({info.roleTitle})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="font-bold px-2.5 py-1 bg-indigo-800/60 rounded-lg text-indigo-200 border border-indigo-700/50 flex items-center space-x-1.5" style={{ color: '#c7d2fe' }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{activeMinistryName}</span>
                </span>
              )}
            </div>

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
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-bl-xs'
                    }`}
                    style={msg.sender === 'assistant' ? { backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' } : { color: '#ffffff' }}
                  >
                    <div className="flex items-center space-x-2 mb-1 opacity-75 text-[11px]">
                      {msg.sender === 'assistant' ? (
                        <>
                          <Bot className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-semibold text-indigo-300" style={{ color: '#a5b4fc' }}>AI Ministry Assistant</span>
                        </>
                      ) : (
                        <span className="font-semibold ml-auto text-white" style={{ color: '#ffffff' }}>{currentUser?.name || 'Me'}</span>
                      )}
                      <span className="text-[10px] ml-auto text-slate-400" style={{ color: '#94a3b8' }}>{msg.timestamp}</span>
                    </div>

                    <div className="space-y-1">
                      {msg.sender === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        formatMarkdownText(msg.text)
                      )}
                    </div>

                    {/* Interactive Action Confirmation Draft Card */}
                    {msg.actionDraft && (
                      <div className="mt-3 p-3.5 bg-indigo-950/50 border border-indigo-800 rounded-xl space-y-2.5 text-xs text-indigo-200">
                        <div className="flex items-center space-x-2 font-bold text-indigo-300">
                          {msg.actionDraft.type === 'create_announcement' ? (
                            <Megaphone className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <MessageSquare className="w-4 h-4 text-emerald-400" />
                          )}
                          <span>
                            {msg.actionDraft.type === 'create_announcement'
                              ? 'Draft Announcement Confirmation'
                              : 'Draft WhatsApp Message Preview'}
                          </span>
                        </div>

                        {msg.actionDraft.type === 'create_announcement' && (
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                            <p className="font-bold text-white">{msg.actionDraft.title}</p>
                            <p className="text-slate-300 whitespace-pre-wrap">{msg.actionDraft.message}</p>
                          </div>
                        )}

                        {msg.actionDraft.type === 'whatsapp_message' && (
                          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                            <p className="text-slate-200 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                              {msg.actionDraft.draftText}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center space-x-2 pt-1">
                          {msg.actionDraft.type === 'create_announcement' && (
                            publishedAnnouncements[msg.id] ? (
                              <span className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-950 text-emerald-300 font-bold rounded-lg border border-emerald-800">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Published to Ministry Bulletin</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConfirmPublishAnnouncement(msg.id, msg.actionDraft)}
                                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Publish Announcement</span>
                              </button>
                            )
                          )}

                          {msg.actionDraft.type === 'whatsapp_message' && (
                            <button
                              onClick={() => handleOpenWhatsAppUrl(msg.actionDraft?.draftText || '')}
                              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open in WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-xs p-4 shadow-xs flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-950/60 flex items-center justify-center text-indigo-400 animate-spin border border-indigo-800/40">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-200">Consulting {activeMinistryName} records...</p>
                      <p className="text-[10px] text-slate-400">Filtering authorized schedules and rosters</p>
                    </div>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl flex items-center justify-between text-rose-300 text-xs">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{errorMsg}</span>
                  </div>
                  <button
                    onClick={() => lastPrompt && handleSendMessage(lastPrompt)}
                    className="flex items-center space-x-1 px-3 py-1 bg-rose-600 text-white rounded-lg font-medium text-xs hover:bg-rose-700 transition-colors shrink-0"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Suggested Question Pills */}
            {messages.length <= 2 && !isLoading && (
              <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Suggested Questions ({isLeader ? 'Leader View' : 'Member View'})</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-slate-100 hover:text-white transition-all shadow-2xs hover:shadow-xs"
                      style={{ color: '#f1f5f9', backgroundColor: '#1e293b' }}
                    >
                      <HeartHandshake className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
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
                  placeholder={`Ask about ${activeMinistryName} assignments, members, events...`}
                  disabled={isLoading}
                  className="flex-1 bg-slate-800 text-slate-100 placeholder-slate-400 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700"
                  style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-colors shadow-md disabled:shadow-none flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed"
                  style={{ color: '#ffffff' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
