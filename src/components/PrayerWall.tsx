import React, { useState } from 'react';
import { PrayerRequest, PrayerCategory, PrayerStatus, Member, SaaSUser } from '../types';
import { 
  Heart, Sparkles, Filter, Plus, CheckCircle2, AlertCircle, Clock, 
  MessageSquare, User, ShieldAlert, Share2, Check, Send, Trash2, Edit3
} from 'lucide-react';
import { UserAvatar } from './common/UserAvatar';

interface PrayerWallProps {
  prayers?: PrayerRequest[];
  members?: Member[];
  currentUser?: SaaSUser;
  currentUserId?: string;
  canManagePrayers?: boolean;
  onPrayForRequest: (id: string, userId?: string) => void;
  onMarkAnswered: (id: string, testimony: string) => void;
  onAddPrayerUpdate: (id: string, updateNote: string) => void;
  onOpenAddPrayerModal: () => void;
  onEditPrayer?: (prayer: PrayerRequest) => void;
  onDeletePrayer?: (id: string) => void;
  onSelectMemberByName?: (name: string) => void;
}

const PrayingHandsIcon: React.FC<{ className?: string }> = ({ className = 'text-sm' }) => (
  <span className={`inline-flex items-center justify-center select-none leading-none ${className}`} aria-label="Prayer hands">
    🙏
  </span>
);

const CATEGORIES: (PrayerCategory | 'ALL')[] = [
  'ALL',
  'Health & Healing',
  'Family & Relationships',
  'Guidance & Faith',
  'Financial & Work',
  'Missions & Outreach',
  'Praise & Thanksgiving',
  'General'
];

export const PrayerWall: React.FC<PrayerWallProps> = ({
  prayers = [],
  members = [],
  currentUser,
  currentUserId,
  canManagePrayers = false,
  onPrayForRequest,
  onMarkAnswered,
  onAddPrayerUpdate,
  onOpenAddPrayerModal,
  onEditPrayer,
  onDeletePrayer,
  onSelectMemberByName
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PrayerCategory | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<PrayerStatus | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'active' | 'answered'>('active');

  const safePrayers = prayers || [];
  const activeUserId = currentUserId || currentUser?.id || 'current-user';

  // Permission helper to check if current user can edit a prayer request
  const canUserEditPrayer = (prayer: PrayerRequest) => {
    // 1. If user has full administrative prayer management rights (Pastors, Admins, Leaders, Prayer Coordinators)
    if (canManagePrayers) return true;

    // 2. If user is the author/creator of the prayer request
    if (currentUser) {
      if (prayer.memberId && prayer.memberId === currentUser.id) {
        return true;
      }
      if (currentUser.email && prayer.memberId === currentUser.email) {
        return true;
      }
      if (
        prayer.memberName &&
        currentUser.name &&
        prayer.memberName.toLowerCase().trim() === currentUser.name.toLowerCase().trim()
      ) {
        return true;
      }
    }

    if (currentUserId && prayer.memberId && prayer.memberId === currentUserId) {
      return true;
    }

    return false;
  };

  // Update Drawer State
  const [activeUpdateDrawerId, setActiveUpdateDrawerId] = useState<string | null>(null);
  const [newUpdateText, setNewUpdateText] = useState('');

  // Testimony Modal State
  const [answeringPrayerId, setAnsweringPrayerId] = useState<string | null>(null);
  const [testimonyText, setTestimonyText] = useState('');

  // Delete Confirmation State
  const [deletingPrayerId, setDeletingPrayerId] = useState<string | null>(null);

  // Check if active user has prayed for a request
  const isPrayedByUser = (prayer: PrayerRequest) => {
    return Boolean(prayer.prayedUserIds && prayer.prayedUserIds.includes(activeUserId));
  };

  const handlePrayClick = (id: string) => {
    onPrayForRequest(id, activeUserId);
  };

  const handleDeleteConfirm = () => {
    if (deletingPrayerId && onDeletePrayer) {
      onDeletePrayer(deletingPrayerId);
    }
    setDeletingPrayerId(null);
  };

  const handleAddUpdateSubmit = (id: string) => {
    if (!newUpdateText.trim()) return;
    onAddPrayerUpdate(id, newUpdateText.trim());
    setNewUpdateText('');
    setActiveUpdateDrawerId(null);
  };

  const handleAnswerSubmit = () => {
    if (!answeringPrayerId) return;
    onMarkAnswered(answeringPrayerId, testimonyText.trim());
    setAnsweringPrayerId(null);
    setTestimonyText('');
  };

  const urgentPrayers = safePrayers.filter(p => p.status === 'Urgent');

  const filteredPrayers = safePrayers.filter((p) => {
    if (activeTab === 'active' && p.status === 'Answered') return false;
    if (activeTab === 'answered' && p.status !== 'Answered') return false;

    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesStat = selectedStatus === 'ALL' || p.status === selectedStatus;

    return matchesCat && matchesStat;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner & Urgent Carousel */}
      {urgentPrayers.length > 0 && (
        <div className="bg-gradient-to-r from-rose-900 to-rose-950 text-white p-4 rounded-2xl shadow-lg border border-rose-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" />
              Urgent Prayer Requests ({urgentPrayers.length})
            </span>
            <span className="text-rose-300/80">Community Intercession</span>
          </div>

          <div className="space-y-2 pt-1">
            {urgentPrayers.map((urgent) => {
              const isUrgentPrayed = isPrayedByUser(urgent);
              return (
                <div key={urgent.id} className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-xs flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-white text-sm">{urgent.title}</h4>
                    <p className="text-rose-200 line-clamp-1">{urgent.memberName} — {urgent.description}</p>
                  </div>
                  <button
                    onClick={() => handlePrayClick(urgent.id)}
                    title={isUrgentPrayed ? "You prayed for this request (click to remove count)" : "Click to count your prayer"}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                      isUrgentPrayed
                        ? 'bg-rose-500 text-white shadow-sm ring-1 ring-white/60'
                        : 'bg-white text-rose-950 hover:bg-rose-100'
                    }`}
                  >
                    <PrayingHandsIcon />
                    <span>{urgent.prayerCount}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Sub-Header */}
      <div className="bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-800 shadow-sm space-y-2.5">
        {/* Active vs Answered Toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto border border-slate-700">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg transition ${
                activeTab === 'active'
                  ? 'bg-rose-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Requests
            </button>
            <button
              onClick={() => setActiveTab('answered')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'answered'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Answered Prayers</span>
            </button>
          </div>

          <button
            onClick={onOpenAddPrayerModal}
            className="hidden sm:flex items-center space-x-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Submit Prayer Request</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar scrollbar-none text-xs -mx-0.5 px-0.5">
          <span className="text-slate-400 font-medium px-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3 text-slate-400" /> Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg border font-medium shrink-0 transition ${
                selectedCategory === cat
                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm font-bold'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Prayer Request Cards */}
      {filteredPrayers.length === 0 ? (
        <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-center border border-dashed border-slate-800 space-y-3">
          <div className="w-12 h-12 bg-rose-950/80 text-rose-400 border border-rose-800/80 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-white">
            {activeTab === 'active' ? 'No active prayer requests found' : 'No answered prayers yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Submit a request to invite your church family to pray alongside you.
          </p>
          <button
            onClick={onOpenAddPrayerModal}
            className="inline-flex items-center space-x-1.5 bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow hover:bg-rose-400 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Request</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPrayers.map((prayer) => {
            const hasPrayed = isPrayedByUser(prayer);

            return (
              <div
                key={prayer.id}
                className={`bg-slate-900 rounded-2xl border p-4 shadow-sm transition-all space-y-3 ${
                  prayer.status === 'Urgent'
                    ? 'border-rose-500/50 bg-rose-950/20'
                    : prayer.status === 'Answered'
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : 'border-slate-800'
                }`}
              >
                {/* Request Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base">{prayer.title}</span>
                      <span className="bg-slate-800 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-700">
                        {prayer.category}
                      </span>
                      {prayer.confidentiality !== 'Public Congregation' && (
                        <span className="bg-amber-950/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-800 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-amber-400" />
                          {prayer.confidentiality}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                      <UserAvatar
                        name={prayer.memberName}
                        avatarUrl={members.find(m => m.id === prayer.memberId || `${m.firstName} ${m.lastName}`.toLowerCase().trim() === prayer.memberName.toLowerCase().trim())?.avatarUrl}
                        size="xs"
                        shape="circle"
                      />
                      <span className="font-semibold text-slate-200">{prayer.memberName}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(prayer.dateSubmitted).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Status Badge, Edit & Delete Buttons */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                        prayer.status === 'Urgent'
                          ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                          : prayer.status === 'Answered'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950/80 text-amber-300 border-amber-800'
                      }`}
                    >
                      {prayer.status}
                    </span>

                    {onEditPrayer && canUserEditPrayer(prayer) && (
                      <button
                        type="button"
                        onClick={() => onEditPrayer(prayer)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition flex items-center gap-1 text-xs font-semibold"
                        title="Edit Prayer Request"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                    )}

                    {onDeletePrayer && (
                      <button
                        onClick={() => setDeletingPrayerId(prayer.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                        title="Remove Prayer Request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description Body */}
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                  {prayer.description}
                </p>

                {/* Answered Testimony Block if answered */}
                {prayer.status === 'Answered' && prayer.answeredTestimony && (
                  <div className="bg-emerald-950/60 border border-emerald-800 p-3 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Answered Testimony:
                    </span>
                    <p className="text-emerald-100 font-medium italic">"{prayer.answeredTestimony}"</p>
                  </div>
                )}

                {/* Updates Log */}
                {prayer.updates && prayer.updates.length > 0 && (
                  <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-1.5 text-xs">
                    <span className="font-bold text-slate-200 block">Updates & Progress:</span>
                    {(prayer.updates || []).map((upd) => (
                      <div key={upd.id} className="border-l-2 border-rose-400 pl-2 space-y-0.5">
                        <p className="text-slate-100">{upd.note}</p>
                        <p className="text-[10px] text-slate-400">{upd.authorName} • {upd.date}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Card Action Row */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center space-x-2">
                    {/* Pray Button */}
                    <button
                      onClick={() => handlePrayClick(prayer.id)}
                      title={hasPrayed ? "You prayed for this request (click to remove count)" : "Click to add your prayer"}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition active:scale-95 ${
                        hasPrayed
                          ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/40'
                          : 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/70'
                      }`}
                    >
                      <PrayingHandsIcon />
                      <span>I Prayed</span>
                      <span className="bg-white/20 text-current text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ml-0.5">
                        {prayer.prayerCount}
                      </span>
                    </button>

                    {/* Add Update Button */}
                    <button
                      onClick={() => setActiveUpdateDrawerId(activeUpdateDrawerId === prayer.id ? null : prayer.id)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-semibold flex items-center gap-1 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Update</span>
                    </button>
                  </div>

                  {prayer.status !== 'Answered' && (
                    <button
                      onClick={() => setAnsweringPrayerId(prayer.id)}
                      className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Answered</span>
                    </button>
                  )}
                </div>

                {/* Inline Add Update Box */}
                {activeUpdateDrawerId === prayer.id && (
                  <div className="pt-2 flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Add an update or progress note..."
                      value={newUpdateText}
                      onChange={(e) => setNewUpdateText(e.target.value)}
                      className="flex-1 p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleAddUpdateSubmit(prayer.id)}
                      className="px-3 py-2 bg-rose-500 text-white font-bold rounded-xl text-xs hover:bg-rose-600 transition flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Post</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Answered Testimony Modal */}
      {answeringPrayerId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-white">Record Prayer Answer / Testimony</h3>
            </div>
            <p className="text-xs text-slate-300">
              Share how God answered this prayer to encourage the church family!
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Surgery went smoothly and healing is well underway! Thank you all for praying."
              value={testimonyText}
              onChange={(e) => setTestimonyText(e.target.value)}
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setAnsweringPrayerId(null)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-xl font-semibold border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAnswerSubmit}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow"
              >
                Save Answered Testimony
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Prayer Confirmation Modal */}
      {deletingPrayerId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-800 p-5 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-base">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-white">Remove Prayer Request?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete this prayer request from the prayer wall? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeletingPrayerId(null)}
                className="px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl font-semibold transition border border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
