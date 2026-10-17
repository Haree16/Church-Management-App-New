import React, { useState, useEffect } from 'react';
import { PrayerGuide, PrayerGuidePoint } from '@/types/prayerMinistry';
import { SaaSUser } from '@/types';
import { X, BookOpen, Plus, Trash2, Sparkles, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface PrayerGuideModalProps {
  isOpen: boolean;
  guideToEdit?: PrayerGuide | null;
  currentUser?: SaaSUser | null;
  currentChurchId: string;
  onClose: () => void;
  onSave: (guide: PrayerGuide) => void;
}

const SCRIPTURE_PRESETS = [
  {
    ref: 'Psalm 91:1-2 (சங்கீதம் 91:1-2)',
    themeEn: 'Abiding in Divine Refuge & Fortress',
    themeTa: 'சர்வவல்லவரின் நிழலில் தங்குதல்',
    textEn: '"He who dwells in the shelter of the Most High will abide in the shadow of the Almighty. I will say to the Lord, \'My refuge and my fortress, my God, in whom I trust.\'"',
    textTa: '"உன்னதமானவரின் மறைவிலிருக்கிறவன் சர்வவல்லவருடைய நிழலில் தங்குவான். நான் கர்த்தரை நோக்கி: நீர் என் அடைக்கலம், என் கோட்டை, என் தேவன், நான் நம்பியிருக்கிறவர் என்று சொல்லுவேன்."',
    points: [
      { id: '1', point_en: 'Pray for divine hedge of protection around families, homes, and churches.', point_ta: 'குடும்பங்களையும் சபைகளையும் சுற்றி தேவ பாதுகாப்பு வேலி உண்டாகும்படி ஜெபிப்போம்.' },
      { id: '2', point_en: 'Break all generational fear, anxiety, and midnight terror in Jesus\' Name.', point_ta: 'இயேசுவின் நாமத்தினாலே சகல பயமும் திகிலும் அகன்றுபோக ஜெபிப்போம்.' }
    ]
  },
  {
    ref: 'Philippians 4:6-7 (பிலிப்பியர் 4:6-7)',
    themeEn: 'Peace That Surpasses All Understanding',
    themeTa: 'எல்லா புத்திக்கும் மேலான தேவ சமாதானம்',
    textEn: '"Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus."',
    textTa: '"நீங்கள் ஒன்றுக்குங் கவலைப்படாமல், எல்லாவற்றையுங்குறித்து உங்கள் விண்ணப்பங்களை ஸ்தோத்திரத்தோடே கூடிய ஜெபத்தினாலும் வேண்டுதலினாலும் தேவனுக்குத் தெரியப்படுத்துங்கள். அப்பொழுது, எல்லாப் புத்திக்கும் மேலான தேவ சமாதானம் உங்கள் இருதயங்களையும் உங்கள் சிந்தைகளையும் கிறிஸ்து இயேசுவுக்குள் காத்துக்கொள்ளும்."',
    points: [
      { id: '1', point_en: 'Surrender all financial and health burdens at the feet of the Lord in thanksgiving.', point_ta: 'பொருளாதார மற்றும் சரீர பாரங்களை ஸ்தோத்திரத்தோடு ஆண்டவரின் பாதத்தில் அர்ப்பணிப்போம்.' },
      { id: '2', point_en: 'Ask the Holy Spirit to guard the mental health and emotional well-being of our members.', point_ta: 'பரிசுத்த ஆவியானவர் நம் உறுப்பினர்களின் மனதை காத்து சமாதானம் தர வேண்டுவோம்.' }
    ]
  },
  {
    ref: '2 Chronicles 7:14 (2 நாளாகமம் 7:14)',
    themeEn: 'Repentance, Healing & Land Restoration',
    themeTa: 'தாழ்மைப்பட்டு ஜெபித்து தேசத்தின் சுகவாழ்வு பெறுதல்',
    textEn: '"If my people who are called by my name humble themselves, and pray and seek my face and turn from their wicked ways, then I will hear from heaven and will forgive their sin and heal their land."',
    textTa: '"என் நாமம் தரிக்கப்பட்ட என் ஜனங்கள் தங்களைத்தாழ்த்தி, ஜெபம்பண்ணி, என் முகத்தைத் தேடி, தங்கள் பொல்லாத வழிகளை விட்டுத் திரும்பினால், அப்பொழுது பரலோகத்திலிருக்கிற நான் கேட்டு, அவர்கள் பாவத்தை மன்னித்து, அவர்கள் தேசத்துக்கு க்ஷேமத்தைக் கொடுப்பேன்."',
    points: [
      { id: '1', point_en: 'Intercede for spiritual revival and nationwide revival across our cities.', point_ta: 'தேசத்திலும் பட்டணங்களிலும் மாபெரும் ஆவிக்குரிய எழுப்புதல் உண்டாக ஜெபிப்போம்.' },
      { id: '2', point_en: 'Pray for governmental leaders, peace in communities, and righteous governance.', point_ta: 'ஆளுகை செய்கிற தலைவர்களுக்காகவும், சமாதானத்திற்காகவும் ஜெபிப்போம்.' }
    ]
  }
];

export const PrayerGuideModal: React.FC<PrayerGuideModalProps> = ({
  isOpen,
  guideToEdit,
  currentUser,
  currentChurchId,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [titleTa, setTitleTa] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [theme, setTheme] = useState('');
  const [themeTa, setThemeTa] = useState('');
  const [scriptureRef, setScriptureRef] = useState('');
  const [scriptureTextEn, setScriptureTextEn] = useState('');
  const [scriptureTextTa, setScriptureTextTa] = useState('');
  const [reflectionEn, setReflectionEn] = useState('');
  const [reflectionTa, setReflectionTa] = useState('');
  const [status, setStatus] = useState<'Published' | 'Draft'>('Published');
  const [prayerPoints, setPrayerPoints] = useState<PrayerGuidePoint[]>([
    { id: '1', point_en: '', point_ta: '' },
    { id: '2', point_en: '', point_ta: '' },
  ]);

  useEffect(() => {
    if (guideToEdit) {
      setTitle(guideToEdit.title || '');
      setTitleTa(guideToEdit.title_ta || '');
      setDate(guideToEdit.date || new Date().toISOString().split('T')[0]);
      setTheme(guideToEdit.theme || '');
      setThemeTa(guideToEdit.theme_ta || '');
      setScriptureRef(guideToEdit.scripture_reference || '');
      setScriptureTextEn(guideToEdit.scripture_text_en || '');
      setScriptureTextTa(guideToEdit.scripture_text_ta || '');
      setReflectionEn(guideToEdit.reflection_en || '');
      setReflectionTa(guideToEdit.reflection_ta || '');
      setStatus(guideToEdit.status || 'Published');
      setPrayerPoints(guideToEdit.prayer_points?.length ? guideToEdit.prayer_points : [{ id: '1', point_en: '', point_ta: '' }]);
    } else {
      setTitle('Daily Bread & Intercession (தினசரி ஜெபக் குறிப்புகள்)');
      setTitleTa('தினசரி ஜெபக் குறிப்புகள் & வேத தியானம்');
      setDate(new Date().toISOString().split('T')[0]);
      setTheme('Faithful in Prayer');
      setThemeTa('ஜெபத்தில் தரித்திருத்தல்');
      setScriptureRef('Psalm 91:1-2');
      setScriptureTextEn('"He who dwells in the shelter of the Most High will abide in the shadow of the Almighty."');
      setScriptureTextTa('"உன்னதமானவரின் மறைவிலிருக்கிறவன் சர்வவல்லவருடைய நிழலில் தங்குவான்."');
      setReflectionEn('Rest in the Lord\'s sovereign coverage today as we lift our community in prayer.');
      setReflectionTa('கர்த்தருடைய கிருபையின் நிழலில் தங்கி இன்று சபையையும் குடும்பங்களையும் தாங்குவோம்.');
      setStatus('Published');
      setPrayerPoints([
        { id: '1', point_en: 'Pray for physical and emotional healing over all sick members.', point_ta: 'வியாதியோடு உள்ள அனைத்து உறுப்பினர்களுக்கும் தெய்வீக சுகம் உண்டாக ஜெபிப்போம்.' },
        { id: '2', point_en: 'Intercede for church youth to walk in divine purpose and purity.', point_ta: 'வாலிபர்கள் பரிசுத்தத்திலும் தேவ சித்தத்திலும் நடக்க ஜெபிப்போம்.' },
      ]);
    }
  }, [guideToEdit, isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof SCRIPTURE_PRESETS[0]) => {
    setScriptureRef(preset.ref);
    setTheme(preset.themeEn);
    setThemeTa(preset.themeTa);
    setScriptureTextEn(preset.textEn);
    setScriptureTextTa(preset.textTa);
    setPrayerPoints(preset.points);
  };

  const handleAddPoint = () => {
    setPrayerPoints((prev) => [
      ...prev,
      { id: `pt-${Date.now()}`, point_en: '', point_ta: '' },
    ]);
  };

  const handleRemovePoint = (index: number) => {
    setPrayerPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePointChange = (index: number, field: 'point_en' | 'point_ta', val: string) => {
    setPrayerPoints((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scriptureRef.trim()) {
      alert('Title and Scripture reference are required.');
      return;
    }

    const payload: PrayerGuide = {
      id: guideToEdit?.id || `pguide-${Date.now()}`,
      church_id: currentChurchId,
      title: title.trim(),
      title_ta: titleTa.trim() || undefined,
      date,
      theme: theme.trim() || 'Daily Prayer',
      theme_ta: themeTa.trim() || undefined,
      scripture_reference: scriptureRef.trim(),
      scripture_text_en: scriptureTextEn.trim(),
      scripture_text_ta: scriptureTextTa.trim() || undefined,
      reflection_en: reflectionEn.trim(),
      reflection_ta: reflectionTa.trim() || undefined,
      prayer_points: prayerPoints.filter((p) => p.point_en.trim() || p.point_ta.trim()),
      author_name: currentUser?.name || 'Prayer Ministry Leader',
      author_role: 'Prayer Leader',
      status,
      created_at: guideToEdit?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {guideToEdit ? 'Edit Scripture Prayer Guide' : 'Publish Scripture Prayer Guide'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Bilingual English & Tamil (தமிழ்) daily/weekly prayer targets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Quick Scripture Preset Picker */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Quick Scripture Inspiration Presets
              </span>
              <span className="text-slate-400">Click to autofill</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SCRIPTURE_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500/80 text-left transition"
                >
                  <div className="font-bold text-white text-[11px] truncate">{p.ref}</div>
                  <div className="text-[10px] text-slate-400 truncate">{p.themeEn}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Titles: English & Tamil */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Guide Title (English) *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Daily Bread & Prayer Points"
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Guide Title (தமிழ் Tamil)</label>
              <input
                type="text"
                value={titleTa}
                onChange={(e) => setTitleTa(e.target.value)}
                placeholder="தினசரி ஜெபக் குறிப்புகள்..."
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Date & Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Theme (English)</label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. Divine Protection"
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Theme (தமிழ் Tamil)</label>
              <input
                type="text"
                value={themeTa}
                onChange={(e) => setThemeTa(e.target.value)}
                placeholder="தேவ பாதுகாப்பு..."
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
          </div>

          {/* Scripture Reference & Passages */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Scripture Reference *</label>
              <input
                type="text"
                required
                value={scriptureRef}
                onChange={(e) => setScriptureRef(e.target.value)}
                placeholder="e.g. Psalm 91:1-2 / சங்கீதம் 91:1-2"
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Scripture Text (English)</label>
                <textarea
                  rows={2}
                  value={scriptureTextEn}
                  onChange={(e) => setScriptureTextEn(e.target.value)}
                  placeholder="Insert verse text in English..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Scripture Text (தமிழ் Tamil)</label>
                <textarea
                  rows={2}
                  value={scriptureTextTa}
                  onChange={(e) => setScriptureTextTa(e.target.value)}
                  placeholder="வேத வசனத்தை தமிழில் உள்ளிடவும்..."
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Short Reflections */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Devotional Reflection (English)</label>
              <textarea
                rows={2}
                value={reflectionEn}
                onChange={(e) => setReflectionEn(e.target.value)}
                placeholder="Brief inspiring thought to lead prayer..."
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Devotional Reflection (தமிழ் Tamil)</label>
              <textarea
                rows={2}
                value={reflectionTa}
                onChange={(e) => setReflectionTa(e.target.value)}
                placeholder="ஜெபத்திற்கு வழிநடத்தும் சிறிய தியான சிந்தனை..."
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
          </div>

          {/* Dynamic Prayer Points */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white text-xs">Bilingual Prayer Points (ஜெபக் குறிப்புகள்)</label>
              <button
                type="button"
                onClick={handleAddPoint}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-[11px] flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Point</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {prayerPoints.map((p, idx) => (
                <div key={p.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2 relative">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-amber-400">Prayer Point #{idx + 1}</span>
                    {prayerPoints.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePoint(idx)}
                        className="text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={p.point_en}
                      onChange={(e) => handlePointChange(idx, 'point_en', e.target.value)}
                      placeholder="Point in English..."
                      className="w-full p-2 rounded-xl bg-slate-850 border border-slate-750 text-white outline-none text-xs"
                    />
                    <input
                      type="text"
                      value={p.point_ta}
                      onChange={(e) => handlePointChange(idx, 'point_ta', e.target.value)}
                      placeholder="ஜெபக் குறிப்பு தமிழில்..."
                      className="w-full p-2 rounded-xl bg-slate-850 border border-slate-750 text-white outline-none text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Safeguard Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-[11px] text-amber-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Prayer Privacy Safeguard:</strong> This public prayer guide is built solely on Scripture and pastoral themes. Personal private prayer requests of church members are strictly quarantined and never published or exposed to AI.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              >
                <option value="Published">Publish Live</option>
                <option value="Draft">Save as Draft</option>
              </select>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Save className="w-4 h-4" />
                <span>{guideToEdit ? 'Save Changes' : 'Publish Guide'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
