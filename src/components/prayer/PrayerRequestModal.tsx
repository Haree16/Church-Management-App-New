import React, { useState, useEffect } from 'react';
import { 
  EnhancedPrayerRequest, 
  PrayerRequestPrivacy, 
  PrayerCategoryType, 
  PrayerGroup 
} from '@/types/prayerMinistry';
import { Member, SaaSUser } from '@/types';
import { 
  X, Heart, Lock, Shield, Users, Globe, Save, CheckCircle2, 
  Sparkles, AlertCircle, FileText 
} from 'lucide-react';

interface PrayerRequestModalProps {
  isOpen: boolean;
  requestToEdit?: EnhancedPrayerRequest | null;
  members: Member[];
  prayerGroups: PrayerGroup[];
  currentUser?: SaaSUser | null;
  currentChurchId: string;
  onClose: () => void;
  onSave: (req: EnhancedPrayerRequest) => void;
}

const CATEGORIES: PrayerCategoryType[] = [
  'Health & Healing',
  'Family & Relationships',
  'Spiritual Growth',
  'Church & Leadership',
  'Community & Nations',
  'Guidance & Faith',
  'Financial & Work',
  'Praise & Thanksgiving',
  'Other Special Need',
];

export const PrayerRequestModal: React.FC<PrayerRequestModalProps> = ({
  isOpen,
  requestToEdit,
  members = [],
  prayerGroups = [],
  currentUser,
  currentChurchId,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PrayerCategoryType>('Health & Healing');
  const [privacy, setPrivacy] = useState<PrayerRequestPrivacy>('private'); // DEFAULT IS PRIVATE!
  const [targetGroupId, setTargetGroupId] = useState('');
  const [status, setStatus] = useState<'Active' | 'Urgent' | 'Answered'>('Active');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  
  // Testimony Fields
  const [testimony, setTestimony] = useState('');
  const [testimonyPublished, setTestimonyPublished] = useState(false);

  useEffect(() => {
    if (requestToEdit) {
      setTitle(requestToEdit.title || '');
      setDescription(requestToEdit.description || '');
      setCategory((requestToEdit.category as PrayerCategoryType) || 'Health & Healing');
      setPrivacy(requestToEdit.privacy || 'private');
      setTargetGroupId(requestToEdit.target_group_id || '');
      setStatus(requestToEdit.status === 'Archived' ? 'Active' : requestToEdit.status || 'Active');
      setAuthorName(requestToEdit.author_name || '');
      setAuthorEmail(requestToEdit.author_email || '');
      setSelectedMemberId(requestToEdit.member_id || '');
      setTestimony(requestToEdit.testimony || '');
      setTestimonyPublished(requestToEdit.testimony_published || false);
    } else {
      setTitle('');
      setDescription('');
      setCategory('Health & Healing');
      setPrivacy('private'); // Always start strictly private!
      setTargetGroupId(prayerGroups[0]?.id || '');
      setStatus('Active');
      setTestimony('');
      setTestimonyPublished(false);

      if (currentUser) {
        setAuthorName(currentUser.name || currentUser.username || 'Member');
        setAuthorEmail(currentUser.email || '');
        const matched = members.find(
          (m) =>
            m.id === currentUser.id ||
            (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) ||
            `${m.firstName} ${m.lastName}`.toLowerCase() === (currentUser.name || '').toLowerCase()
        );
        setSelectedMemberId(matched ? matched.id : currentUser.id);
      } else {
        setAuthorName('');
        setAuthorEmail('');
        setSelectedMemberId('');
      }
    }
  }, [requestToEdit, isOpen, currentUser, members, prayerGroups]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please provide both a prayer title and details.');
      return;
    }

    if (privacy === 'group' && !targetGroupId) {
      alert('Please select a prayer group to share this request with.');
      return;
    }

    const selectedGroup = prayerGroups.find((g) => g.id === targetGroupId);

    const payload: EnhancedPrayerRequest = {
      id: requestToEdit?.id || `pray-${Date.now()}`,
      church_id: currentChurchId,
      member_id: selectedMemberId || undefined,
      author_name: authorName.trim() || 'Church Member',
      author_email: authorEmail.trim() || undefined,
      title: title.trim(),
      description: description.trim(),
      category,
      privacy,
      target_group_id: privacy === 'group' ? targetGroupId : undefined,
      target_group_name: privacy === 'group' ? selectedGroup?.name : undefined,
      status: status as any,
      prayer_count: requestToEdit?.prayer_count || 0,
      prayed_user_ids: requestToEdit?.prayed_user_ids || [],
      follow_up_notes: requestToEdit?.follow_up_notes || [],
      is_answered: status === 'Answered',
      answered_date: status === 'Answered' ? (requestToEdit?.answered_date || new Date().toISOString().split('T')[0]) : undefined,
      testimony: status === 'Answered' ? testimony.trim() : undefined,
      testimony_published: status === 'Answered' ? testimonyPublished : false,
      created_at: requestToEdit?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {requestToEdit ? 'Edit Prayer Request' : 'Submit Prayer Request'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Private by default • Confidential pastoral handling
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
          {/* Privacy Level Selector (Highlighted Section) */}
          <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2.5">
            <label className="font-bold text-white flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Privacy & Sharing Permissions *</span>
              </span>
              <span className="text-[10px] text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full font-semibold border border-amber-500/20">
                Private by default
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrivacy('private')}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  privacy === 'private'
                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Lock className={`w-4 h-4 shrink-0 mt-0.5 ${privacy === 'private' ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-white text-[11px]">Private (Only Me)</div>
                  <div className="text-[10px] text-slate-400">Strictly visible only to you.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy('prayer_leaders')}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  privacy === 'prayer_leaders'
                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Shield className={`w-4 h-4 shrink-0 mt-0.5 ${privacy === 'prayer_leaders' ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-white text-[11px]">Prayer Leaders</div>
                  <div className="text-[10px] text-slate-400">Pastors & prayer ministry team.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy('group')}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  privacy === 'group'
                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Users className={`w-4 h-4 shrink-0 mt-0.5 ${privacy === 'group' ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-white text-[11px]">My Prayer Group</div>
                  <div className="text-[10px] text-slate-400">Shared with a specific squad.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy('church_wide')}
                className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  privacy === 'church_wide'
                    ? 'bg-amber-500/20 border-amber-500 text-white shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Globe className={`w-4 h-4 shrink-0 mt-0.5 ${privacy === 'church_wide' ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <div className="font-bold text-white text-[11px]">Prayer Wall</div>
                  <div className="text-[10px] text-slate-400">Visible to congregation.</div>
                </div>
              </button>
            </div>

            {/* If Group Privacy Selected: Pick target group */}
            {privacy === 'group' && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Select Prayer Group *</label>
                <select
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Choose a Prayer Group --</option>
                  {prayerGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Prayer Request Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete Healing for Mom, Wisdom for Board Exam, Guidance..."
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Detailed Prayer Needs & Context *</label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share details of your situation so we can intercede specifically..."
              className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PrayerCategoryType)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Request Urgency</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Active">Active Intercession</option>
                <option value="Urgent">🚨 Urgent (Immediate Need)</option>
                <option value="Answered">🎉 Answered Prayer</option>
              </select>
            </div>
          </div>

          {/* Answered Prayer & Testimony Section */}
          {status === 'Answered' && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Praise & Testimony Report</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Praise God! How did the Lord answer your prayer?
              </p>
              <textarea
                rows={3}
                value={testimony}
                onChange={(e) => setTestimony(e.target.value)}
                placeholder="Share your testimony of God's faithfulness..."
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-emerald-800/60 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="publish_testimony"
                  checked={testimonyPublished}
                  onChange={(e) => setTestimonyPublished(e.target.checked)}
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <label htmlFor="publish_testimony" className="text-[11px] text-slate-300 cursor-pointer">
                  Allow publishing testimony to church praise wall (Never shared without your explicit consent).
                </label>
              </div>
            </div>
          )}

          {/* Requester Identity Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Submitted By (Your Name)</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Contact Email (Optional)</label>
              <input
                type="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="For prayer updates..."
                className="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
              />
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
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Save className="w-4 h-4" />
              <span>{requestToEdit ? 'Save Changes' : 'Submit Prayer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
