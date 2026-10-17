import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Bookmark, Share2, Sparkles, Check, 
  ExternalLink, Edit, RefreshCw, AlertCircle, Heart 
} from 'lucide-react';
import { DailyVerseRecord } from '../../types/bible';
import { dailyVerseService, getDateStringForTimezone } from '../../services/dailyVerseService';
import { BiblePassageModal } from './BiblePassageModal';
import { EditDailyVerseModal } from './EditDailyVerseModal';
import { SaaSUserRole } from '../../types';

interface TodaysBibleVerseCardProps {
  churchId: string;
  timezone?: string;
  userId?: string;
  userRole?: SaaSUserRole | string;
  onNavigateToAiAssistant?: (suggestedPrompt?: string) => void;
}

export const TodaysBibleVerseCard: React.FC<TodaysBibleVerseCardProps> = ({
  churchId,
  timezone = 'Asia/Kolkata',
  userId = '',
  userRole = 'Member',
  onNavigateToAiAssistant
}) => {
  const [verse, setVerse] = useState<DailyVerseRecord | null>(null);
  const [language, setLanguage] = useState<'en' | 'ta'>('en');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [isPassageModalOpen, setIsPassageModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const canEditVerse = ['SuperAdmin', 'PastorAdmin'].includes(userRole);

  const loadVerse = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await dailyVerseService.getTodaysVerse(churchId, timezone);
      setVerse(data);
      if (userId && data?.id) {
        setIsBookmarked(dailyVerseService.isVerseBookmarked(userId, data.id));
      }
    } catch (err) {
      console.warn('TodaysBibleVerseCard: Error loading verse', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVerse();
  }, [churchId, timezone, userId]);

  const handleToggleBookmark = async () => {
    if (!verse || !userId) return;
    try {
      if (isBookmarked) {
        await dailyVerseService.unbookmarkVerse(userId, verse.id);
        setIsBookmarked(false);
      } else {
        await dailyVerseService.bookmarkVerse(churchId, userId, verse);
        setIsBookmarked(true);
      }
    } catch (e) {
      console.warn('Failed to toggle bookmark:', e);
    }
  };

  const handleShare = async () => {
    if (!verse) return;
    const isTa = language === 'ta';
    const ref = isTa ? (verse.tamilReference || verse.reference) : verse.reference;
    const text = isTa ? (verse.tamilText || verse.text) : verse.text;
    const reflection = isTa ? (verse.tamilReflection || verse.reflection) : verse.reflection;

    const shareContent = `📖 ${ref}\n\n"${text}"\n\n💭 ${reflection}\n\n— Daily Scripture`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Daily Scripture: ${ref}`,
          text: shareContent,
        });
        setShareFeedback('Shared!');
        setTimeout(() => setShareFeedback(null), 2500);
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Fall through to clipboard
        } else {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareContent);
      setShareFeedback('Copied to clipboard!');
      setTimeout(() => setShareFeedback(null), 2500);
    } catch (e) {
      setShareFeedback('Could not copy');
      setTimeout(() => setShareFeedback(null), 2000);
    }
  };

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-3xl p-5 sm:p-6 border border-amber-500/20 shadow-md animate-pulse">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/10">
          <div className="h-5 bg-amber-500/20 rounded-lg w-40" />
          <div className="h-8 bg-amber-500/20 rounded-xl w-20" />
        </div>
        <div className="py-4 space-y-3">
          <div className="h-4 bg-amber-500/15 rounded-md w-full" />
          <div className="h-4 bg-amber-500/15 rounded-md w-5/6" />
          <div className="h-4 bg-amber-500/15 rounded-md w-3/4" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="h-4 bg-amber-500/10 rounded-md w-32" />
          <div className="h-8 bg-amber-500/20 rounded-xl w-28" />
        </div>
      </div>
    );
  }

  // 2. Error State
  if (isError || !verse) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Today's Bible Verse</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Temporarily offline or loading. Click retry to reconnect.</p>
          </div>
        </div>
        <button
          onClick={loadVerse}
          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const isTa = language === 'ta';
  const displayReference = isTa ? (verse.tamilReference || verse.reference) : verse.reference;
  const displayText = isTa ? (verse.tamilText || verse.text) : verse.text;
  const displayReflection = isTa ? (verse.tamilReflection || verse.reflection) : verse.reflection;

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-50/50 dark:to-slate-900/60 p-5 sm:p-6 shadow-md transition-all hover:shadow-lg text-slate-900 dark:text-white">
        {/* Subtle Decorative Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-xs shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {isTa ? 'இன்றைய வேத வசனம்' : "TODAY'S BIBLE VERSE"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                  {verse.date || getDateStringForTimezone(timezone)}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                {displayReference}
              </h3>
            </div>
          </div>

          {/* Action Row: Language Toggle + Admin Edit Button */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {canEditVerse && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                title="Customize daily verse"
                className="p-1.5 rounded-xl border border-amber-500/30 bg-white/80 dark:bg-slate-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700 text-xs font-semibold transition flex items-center gap-1 shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Edit</span>
              </button>
            )}

            {/* Language Switcher */}
            <div className="flex items-center bg-white/80 dark:bg-slate-800 p-0.5 rounded-xl border border-amber-500/30 text-xs font-bold shadow-xs">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  language === 'en'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ta')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  language === 'ta'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>
        </div>

        {/* Card Body: Scripture Verse Quote */}
        <div className="relative z-10 py-4 space-y-3">
          <blockquote className="font-serif text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-100 italic bg-white/40 dark:bg-slate-800/30 p-3.5 sm:p-4 rounded-2xl border border-amber-500/20">
            "{displayText}"
          </blockquote>

          {/* Devotional Reflection */}
          {displayReflection && (
            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sans pl-1">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong className="text-slate-900 dark:text-white font-bold mr-1">
                  {isTa ? 'தியானம்:' : 'Reflection:'}
                </strong>
                {displayReflection}
              </p>
            </div>
          )}
        </div>

        {/* Card Footer: Interactive Actions */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-amber-500/15 text-xs">
          <div className="flex items-center gap-2">
            {/* Read Complete Passage Button */}
            <button
              onClick={() => setIsPassageModalOpen(true)}
              className="px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-50 dark:hover:bg-slate-750 transition flex items-center gap-1.5 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
              <span>{isTa ? 'முழு வசனம் வாசிக்க' : 'Read Passage'}</span>
            </button>

            {/* Save / Bookmark Button */}
            <button
              onClick={handleToggleBookmark}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 border shadow-xs ${
                isBookmarked
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{isBookmarked ? (isTa ? 'சேமிக்கப்பட்டது' : 'Saved') : (isTa ? 'சேமிக்க' : 'Save')}</span>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition flex items-center gap-1.5 shadow-xs"
            >
              {shareFeedback ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{shareFeedback || (isTa ? 'பகிர' : 'Share')}</span>
            </button>
          </div>

          {/* AI Bible Assistant Launcher Link */}
          {onNavigateToAiAssistant && (
            <button
              onClick={() => onNavigateToAiAssistant(`Explain ${verse.reference} in its historical and spiritual context, and help me apply it today.`)}
              className="px-3 py-1.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isTa ? 'AI போதகரிடம் கேட்க' : 'Study with AI'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Complete Passage Modal */}
      <BiblePassageModal
        isOpen={isPassageModalOpen}
        onClose={() => setIsPassageModalOpen(false)}
        verse={verse}
        language={language}
        isBookmarked={isBookmarked}
        onToggleBookmark={handleToggleBookmark}
        onAskAi={onNavigateToAiAssistant}
      />

      {/* Pastor / Admin Edit Modal */}
      {canEditVerse && (
        <EditDailyVerseModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          currentVerse={verse}
          churchId={churchId}
          onSaved={(updated) => setVerse(updated)}
        />
      )}
    </>
  );
};
