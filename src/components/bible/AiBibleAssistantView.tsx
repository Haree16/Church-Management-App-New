import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Send, RefreshCw, Trash2, Sparkles, 
  Share2, Copy, Check, MessageSquare, AlertCircle, 
  HelpCircle, Shield, ArrowLeft, Globe 
} from 'lucide-react';
import { AiBibleMessage, AiBibleQueryOptions } from '../../types/bible';
import { aiBibleAssistantService, AiBibleAssistantResponse } from '../../services/aiBibleAssistantService';
import { SaaSUser } from '../../types';

interface AiBibleAssistantViewProps {
  currentUser?: SaaSUser;
  churchId: string;
  initialPrompt?: string;
  onBack?: () => void;
}

export const AiBibleAssistantView: React.FC<AiBibleAssistantViewProps> = ({
  currentUser,
  churchId,
  initialPrompt = '',
  onBack,
}) => {
  const userId = currentUser?.id || 'guest-user';
  const userName = currentUser?.name || 'Friend';

  const [messages, setMessages] = useState<AiBibleMessage[]>(() => {
    const saved = aiBibleAssistantService.getStoredChatHistory(userId);
    return saved.length > 0 ? saved : [];
  });
  const [inputText, setInputText] = useState<string>('');
  const [languageMode, setLanguageMode] = useState<'auto' | 'en' | 'ta'>('auto');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const SUGGESTED_PROMPTS = [
    {
      en: 'Explain Psalm 23 in simple language.',
      ta: 'சங்கீதம் 23-ஐ எளிய நடையில் விளக்குங்கள்.',
    },
    {
      en: 'What does the Bible teach about forgiveness?',
      ta: 'மன்னிப்பைக் குறித்து வேதாகமம் என்ன கற்பிக்கிறது?',
    },
    {
      en: 'Find Bible verses about anxiety and hope.',
      ta: 'கவலை மற்றும் நம்பிக்கை குறித்த வேதாகம வசனங்கள் என்ன?',
    },
    {
      en: 'Help me prepare a Bible study on prayer.',
      ta: 'ஜெபத்தைக் குறித்து ஒரு வேதாகமப் படிப்பைத் தயார் செய்ய உதவுங்கள்.',
    },
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle initial prompt from deep-links (e.g. from Today's Bible Verse card)
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim().length > 0) {
      handleSendMessage(initialPrompt.trim());
    }
  }, [initialPrompt]);

  // Save conversation history to local storage
  useEffect(() => {
    if (messages.length > 0) {
      aiBibleAssistantService.saveStoredChatHistory(userId, messages);
    }
  }, [messages, userId]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setErrorMessage(null);
    setInputText('');

    const userMessage: AiBibleMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const response: AiBibleAssistantResponse = await aiBibleAssistantService.askAssistant({
        prompt: query,
        churchId,
        userId,
        userName,
        preferredLanguage: languageMode,
        conversationHistory: updatedHistory,
      });

      const assistantMessage: AiBibleMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: response.responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        scriptureReferences: response.scriptureReferences,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to receive Bible study answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your Bible study conversation history?')) {
      aiBibleAssistantService.clearStoredChatHistory(userId);
      setMessages([]);
      setErrorMessage(null);
    }
  };

  const handleCopyMessage = async (msg: AiBibleMessage) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShareMessage = async (msg: AiBibleMessage) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Scripture Insight from AI Bible Assistant',
          text: msg.text,
        });
      } catch {
        // User canceled or failed
      }
    } else {
      handleCopyMessage(msg);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden text-slate-900 dark:text-white">
      {/* 1. Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                AI Bible Assistant
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Scripture & Study
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Devotional exposition, Scripture cross-references & Bible study preparation
            </p>
          </div>
        </div>

        {/* Action Controls: Language & Reset */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setLanguageMode('auto')}
              className={`px-2 py-1 rounded-lg transition ${
                languageMode === 'auto'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Auto
            </button>
            <button
              onClick={() => setLanguageMode('en')}
              className={`px-2 py-1 rounded-lg transition ${
                languageMode === 'en'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguageMode('ta')}
              className={`px-2 py-1 rounded-lg transition ${
                languageMode === 'ta'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              தமிழ்
            </button>
          </div>

          {/* New Conversation / Clear History */}
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Clear Conversation History"
              className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Chat Feed Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Welcome & Empty State */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-md">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                How may I assist your Scripture study today, {userName}?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Ask any question about Bible passages, biblical doctrines, Christian living, or request assistance preparing a sermon or home Bible study outline.
              </p>
            </div>

            {/* Suggested Question Pills */}
            <div className="w-full space-y-2 pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Suggested Bible Study Inquiries:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {SUGGESTED_PROMPTS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(languageMode === 'ta' ? q.ta : q.en)}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-amber-500/50 hover:bg-amber-50/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition group flex items-start gap-2.5 shadow-xs"
                  >
                    <BookOpen className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{languageMode === 'ta' ? q.ta : q.en}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pastoral Care & Theological Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex items-center justify-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>Theological Guardrails & Pastoral Care</span>
              </div>
              <p>
                The assistant explains Scriptures in their historical context and distinguishes direct quotations from interpretation. For personal counseling, prayer ministry, or pastoral care, please consult your church pastors and elders.
              </p>
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5 animate-in fade-in`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 sm:p-5 shadow-xs text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-amber-500 text-slate-950 font-medium rounded-br-xs'
                    : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 rounded-bl-xs'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-slate-700/60 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>AI Scripture Assistant</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap font-sans space-y-2">
                  {msg.text}
                </div>

                {/* Scripture Reference Tags */}
                {msg.scriptureReferences && msg.scriptureReferences.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-wrap gap-1.5">
                    {msg.scriptureReferences.map((ref, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      >
                        📖 {ref}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Footer: Timestamp & Quick Actions */}
              <div className="flex items-center gap-2 px-2 text-[10px] text-slate-400">
                <span>{msg.timestamp}</span>
                {!isUser && (
                  <>
                    <span>•</span>
                    <button
                      onClick={() => handleCopyMessage(msg)}
                      className="hover:text-slate-700 dark:hover:text-slate-200 transition flex items-center gap-1"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => handleShareMessage(msg)}
                      className="hover:text-slate-700 dark:hover:text-slate-200 transition flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Share</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 w-fit text-xs border border-slate-200 dark:border-slate-700 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
            <span>Consulting Scripture and theological commentaries...</span>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => handleSendMessage(inputText)}
              className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-500 transition"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 3. Input Action Footer */}
      <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              languageMode === 'ta'
                ? 'வேதாகம வசனங்கள் அல்லது பாடங்கள் குறித்து கேளுங்கள்...'
                : 'Ask a question about Scripture, doctrines, or Bible study topics...'
            }
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-inner"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-400 mt-2">
          AI responses are for devotional learning. Always test teachings against Holy Scripture and consult church pastors.
        </p>
      </div>
    </div>
  );
};
