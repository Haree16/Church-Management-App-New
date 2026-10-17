import React, { useState } from 'react';
import { X, BookOpen, Share2, Bookmark, Check, Copy } from 'lucide-react';
import { DailyVerseRecord } from '../../types/bible';

interface BiblePassageModalProps {
  isOpen: boolean;
  onClose: () => void;
  verse: DailyVerseRecord | null;
  language: 'en' | 'ta';
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onAskAi?: (passagePrompt: string) => void;
}

export const BiblePassageModal: React.FC<BiblePassageModalProps> = ({
  isOpen,
  onClose,
  verse,
  language: initialLanguage,
  isBookmarked,
  onToggleBookmark,
  onAskAi
}) => {
  const [lang, setLang] = useState<'en' | 'ta'>(initialLanguage);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !verse) return null;

  const isTa = lang === 'ta';
  const refTitle = isTa ? (verse.tamilReference || verse.reference) : verse.reference;
  const passageContent = isTa ? (verse.tamilFullPassageText || verse.tamilText) : (verse.fullPassageText || verse.text);
  const reflection = isTa ? (verse.tamilReflection || verse.reflection) : verse.reflection;

  const handleCopy = async () => {
    const textToCopy = `${refTitle}\n\n"${passageContent}"\n\n— ${verse.translation}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {isTa ? 'வேதாகம வாசிப்பு' : 'Complete Scripture Passage'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  {verse.translation}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{refTitle}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  lang === 'en'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('ta')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  lang === 'ta'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Passage Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm sm:text-base leading-relaxed">
          <div className="bg-amber-50/50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-amber-200/40 dark:border-slate-700/60 font-serif text-slate-800 dark:text-slate-200 italic">
            "{passageContent}"
          </div>

          {reflection && (
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 text-xs sm:text-sm">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {isTa ? 'தியானச் சிந்தனை' : 'Devotional Reflection'}
              </h4>
              <p className="text-slate-600 dark:text-slate-300 font-sans">{reflection}</p>
            </div>
          )}

          {verse.prayerPrompt && (
            <div className="space-y-1 bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200/50 dark:border-rose-900/40 text-xs sm:text-sm">
              <h4 className="font-bold text-rose-700 dark:text-rose-400">
                {isTa ? 'இன்றைய ஜெபம்' : 'Prayer Prompt'}
              </h4>
              <p className="text-slate-700 dark:text-slate-300 font-sans italic">
                "{isTa ? (verse.tamilPrayerPrompt || verse.prayerPrompt) : verse.prayerPrompt}"
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleBookmark}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                isBookmarked
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
              <span>{isBookmarked ? (isTa ? 'சேமிக்கப்பட்டது' : 'Saved') : (isTa ? 'சேமிக்க' : 'Save Verse')}</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? (isTa ? 'நகலெடுக்கப்பட்டது!' : 'Copied!') : (isTa ? 'நகல் செய்' : 'Copy Passage')}</span>
            </button>
          </div>

          {onAskAi && (
            <button
              onClick={() => {
                onClose();
                onAskAi(`Explain ${verse.reference} in its biblical context and share key devotional takeaways.`);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-sm transition flex items-center gap-1.5"
            >
              <span>{isTa ? 'AI போதகரிடம் கேட்க' : 'Study with AI Assistant'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
