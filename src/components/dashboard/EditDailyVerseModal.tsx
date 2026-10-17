import React, { useState } from 'react';
import { X, Save, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { DailyVerseRecord } from '../../types/bible';
import { dailyVerseService } from '../../services/dailyVerseService';

interface EditDailyVerseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVerse: DailyVerseRecord;
  churchId: string;
  onSaved: (updated: DailyVerseRecord) => void;
}

export const EditDailyVerseModal: React.FC<EditDailyVerseModalProps> = ({
  isOpen,
  onClose,
  currentVerse,
  churchId,
  onSaved,
}) => {
  const [formData, setFormData] = useState<DailyVerseRecord>({ ...currentVerse });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reference.trim() || !formData.text.trim()) {
      setErrorMsg('Reference and English scripture text are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const recordToSave: DailyVerseRecord = {
        ...formData,
        church_id: churchId,
        updatedAt: new Date().toISOString()
      };

      await dailyVerseService.saveDailyVerse(recordToSave);
      onSaved(recordToSave);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save verse record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Customize Today's Bible Verse</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pastoral oversight: scheduled for {formData.date}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                English Reference *
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={e => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                placeholder="e.g. Philippians 4:6-7"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tamil Reference
              </label>
              <input
                type="text"
                value={formData.tamilReference || ''}
                onChange={e => setFormData({ ...formData, tamilReference: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                placeholder="e.g. பிலிப்பியர் 4:6-7"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              English Scripture Text *
            </label>
            <textarea
              rows={3}
              value={formData.text}
              onChange={e => setFormData({ ...formData, text: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
              placeholder="Bible verse in English..."
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tamil Scripture Text
            </label>
            <textarea
              rows={3}
              value={formData.tamilText || ''}
              onChange={e => setFormData({ ...formData, tamilText: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
              placeholder="வேதாகம வசனம் (தமிழ்)..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Devotional Reflection (English)
              </label>
              <textarea
                rows={2}
                value={formData.reflection}
                onChange={e => setFormData({ ...formData, reflection: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                placeholder="Devotional thought for members..."
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Devotional Reflection (Tamil)
              </label>
              <textarea
                rows={2}
                value={formData.tamilReflection || ''}
                onChange={e => setFormData({ ...formData, tamilReflection: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                placeholder="தியானச் சிந்தனை (தமிழ்)..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Translation: {formData.translation || 'Public Domain'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save & Publish'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
