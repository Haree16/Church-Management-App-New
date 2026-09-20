import React, { useState } from 'react';
import { PastorAnnouncement, SaaSUser, ChurchTenant } from '../types';
import { Megaphone, Pin, Plus, Calendar, Sparkles, User, FileText, Share2, Volume2, X, Trash2, AlertTriangle, Edit3, MessageSquare, Check, Copy, Eye } from 'lucide-react';
import { canPublishAnnouncements } from '../utils/rbac';

interface PastorAnnouncementsProps {
  announcements?: PastorAnnouncement[];
  currentUser?: SaaSUser;
  currentChurch?: ChurchTenant;
  onSaveAnnouncement: (item: PastorAnnouncement) => void;
  onDeleteAnnouncement?: (id: string) => void;
}

export const PastorAnnouncements: React.FC<PastorAnnouncementsProps> = ({
  announcements = [],
  currentUser,
  currentChurch,
  onSaveAnnouncement,
  onDeleteAnnouncement,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<PastorAnnouncement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<PastorAnnouncement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState(currentUser?.name || currentChurch?.pastorName || 'Senior Pastor');
  const [category, setCategory] = useState<PastorAnnouncement['category']>('Sunday Bulletin');
  const [isPinned, setIsPinned] = useState(false);

  const safeAnnouncements = announcements || [];
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canPublish = canPublishAnnouncements(currentUser?.role);

  const handleShareAnnouncementWhatsApp = (item: PastorAnnouncement) => {
    const formatted = `📢 *${currentChurch?.name || 'Church'} - ${item.title}*\n\n` +
      `📅 *Date:* ${item.date}\n` +
      `🏷️ *Category:* ${item.category}\n` +
      `👤 *From:* ${item.authorName}\n\n` +
      `${item.content}\n\n` +
      `_Blessings,\n*${currentChurch?.name || 'Church'} Leadership*_`;

    navigator.clipboard.writeText(formatted);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);

    const encoded = encodeURIComponent(formatted);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };


  const handleOpenAdd = () => {
    if (!canPublish) return;
    setEditingAnnouncement(null);
    setTitle('');
    setContent('');
    setAuthorName(currentUser?.name || currentChurch?.pastorName || 'Senior Pastor');
    setCategory('Sunday Bulletin');
    setIsPinned(false);
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: PastorAnnouncement) => {
    if (!canPublish) return;
    setEditingAnnouncement(item);
    setTitle(item.title);
    setContent(item.content);
    setAuthorName(item.authorName);
    setCategory(item.category);
    setIsPinned(Boolean(item.isPinned));
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPublish) return;
    if (!title.trim() || !content.trim()) return;

    if (editingAnnouncement) {
      const updatedItem: PastorAnnouncement = {
        ...editingAnnouncement,
        title: title.trim(),
        content: content.trim(),
        authorName: authorName.trim() || 'Senior Pastor',
        isPinned,
        category,
      };
      onSaveAnnouncement(updatedItem);
    } else {
      const newItem: PastorAnnouncement = {
        id: `ann-${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        authorName: authorName.trim() || 'Senior Pastor',
        date: new Date().toISOString().split('T')[0],
        isPinned,
        category,
      };
      onSaveAnnouncement(newItem);
    }

    setShowAddModal(false);
    setEditingAnnouncement(null);
    setTitle('');
    setContent('');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3 border border-amber-500/30">
              <Megaphone className="w-3.5 h-3.5" />
              Pastor's Desk & Official Announcements
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Weekly Bulletin & Pastoral Word
            </h2>
            <p className="text-amber-100/80 text-sm mt-1 max-w-xl">
              Stay inspired with pastoral reflections, emergency weather alerts, ministry directives, and Sunday worship bulletins.
            </p>
          </div>

          {canPublish ? (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl shadow-lg text-xs flex items-center gap-2 transition active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Post New Announcement
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-200/90 text-xs font-medium border border-amber-500/20 shrink-0">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Read Only Access</span>
            </div>
          )}
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {safeAnnouncements.map((item) => (
          <div
            key={item.id}
            className={`p-4 sm:p-6 rounded-3xl border shadow-sm transition space-y-3 ${
              item.isPinned
                ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-400/30'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {item.isPinned && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                    <Pin className="w-3 h-3 fill-amber-700" /> Pinned Notice
                  </span>
                )}
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {item.category}
                </span>
              </div>

              <span className="text-xs font-semibold text-slate-400">{item.date}</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{item.content}</p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>{item.authorName}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShareAnnouncementWhatsApp(item)}
                  className="px-2.5 py-1.5 rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1.5 text-xs font-bold"
                  title="Share announcement to WhatsApp"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{copiedId === item.id ? 'Copied & Shared!' : 'WhatsApp'}</span>
                </button>

                {canPublish && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition flex items-center gap-1 text-xs font-semibold"
                    title="Edit Announcement"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}

                {canPublish && onDeleteAnnouncement && (
                  <button
                    type="button"
                    onClick={() => setAnnouncementToDelete(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition flex items-center gap-1 text-xs font-semibold"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Post/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAnnouncement ? 'Edit Pastoral Announcement' : 'Post Pastoral Announcement'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="Sunday Bulletin">Sunday Bulletin</option>
                    <option value="General">General</option>
                    <option value="Ministry Alert">Ministry Alert</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Author Name</label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="pinCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Pin to top of Pastor's Desk
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Announcement Content</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg transition"
              >
                Publish Announcement
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Delete Announcement Confirmation Modal */}
      {announcementToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Announcement?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <strong className="text-slate-800">"{announcementToDelete.title}"</strong> ({announcementToDelete.date})?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAnnouncementToDelete(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAnnouncement) {
                    onDeleteAnnouncement(announcementToDelete.id);
                  }
                  setAnnouncementToDelete(null);
                }}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
