import React, { useState, useEffect } from 'react';
import { PrayerRequest, PrayerCategory, PrayerStatus, ConfidentialityLevel, Member, SaaSUser } from '../types';
import { X, Heart, ShieldAlert, Save, Edit3, Lock } from 'lucide-react';

interface PrayerFormModalProps {
  isOpen: boolean;
  prayerToEdit?: PrayerRequest | null;
  members?: Member[];
  initialMember?: Member | null;
  onClose: () => void;
  onSave: (prayer: PrayerRequest) => void;
  currentChurchId?: string;
  currentUser?: SaaSUser | null;
}

const CATEGORIES: PrayerCategory[] = [
  'Health & Healing',
  'Family & Relationships',
  'Guidance & Faith',
  'Financial & Work',
  'Missions & Outreach',
  'Praise & Thanksgiving',
  'General'
];

export const PrayerFormModal: React.FC<PrayerFormModalProps> = ({
  isOpen,
  prayerToEdit,
  members = [],
  initialMember,
  onClose,
  onSave,
  currentChurchId,
  currentUser
}) => {
  const safeMembers = members || [];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PrayerCategory>('Health & Healing');
  const [status, setStatus] = useState<PrayerStatus>('Active');
  const [confidentiality, setConfidentiality] = useState<ConfidentialityLevel>('Public Congregation');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [guestName, setGuestName] = useState('');

  const canSelectRequester = currentUser
    ? ['SuperAdmin', 'PastorAdmin', 'AssistantPastor', 'MinistryLeader', 'TreasurerStaff', 'SundaySchoolTeacher'].includes(currentUser.role)
    : true;

  useEffect(() => {
    if (prayerToEdit) {
      setTitle(prayerToEdit.title || '');
      setDescription(prayerToEdit.description || '');
      setCategory(prayerToEdit.category || 'Health & Healing');
      setStatus(prayerToEdit.status || 'Active');
      setConfidentiality(prayerToEdit.confidentiality || 'Public Congregation');
      setSelectedMemberId(prayerToEdit.memberId || '');
      setGuestName(prayerToEdit.memberName || '');
    } else if (initialMember) {
      setTitle('');
      setDescription('');
      setCategory('Health & Healing');
      setStatus('Active');
      setConfidentiality('Public Congregation');
      setSelectedMemberId(initialMember.id);
      setGuestName(`${initialMember.firstName} ${initialMember.lastName}`);
    } else {
      setTitle('');
      setDescription('');
      setCategory('Health & Healing');
      setStatus('Active');
      setConfidentiality('Public Congregation');

      if (currentUser) {
        const matchingMember = safeMembers.find(m => 
          m.id === currentUser.id ||
          (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (m.phone && currentUser.phone && m.phone === currentUser.phone) ||
          (`${m.firstName} ${m.lastName}`.toLowerCase() === (currentUser.name || '').toLowerCase()) ||
          (m.firstName.toLowerCase() === (currentUser.username || '').toLowerCase())
        );

        if (matchingMember) {
          setSelectedMemberId(matchingMember.id);
          setGuestName(`${matchingMember.firstName} ${matchingMember.lastName}`);
        } else {
          setSelectedMemberId('');
          setGuestName(currentUser.name || currentUser.username || '');
        }
      } else {
        setSelectedMemberId('');
        setGuestName('');
      }
    }
  }, [prayerToEdit, initialMember, isOpen, currentUser, safeMembers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please provide a title and request description.');
      return;
    }

    let memberName = guestName.trim();
    if (selectedMemberId) {
      const found = safeMembers.find(m => m.id === selectedMemberId);
      if (found) memberName = `${found.firstName} ${found.lastName}`;
    }
    if (!memberName) memberName = 'Anonymous Member';

    if (prayerToEdit) {
      const updatedPrayer: PrayerRequest = {
        ...prayerToEdit,
        memberId: selectedMemberId || undefined,
        memberName,
        title: title.trim(),
        description: description.trim(),
        category,
        status,
        confidentiality,
      };
      onSave(updatedPrayer);
    } else {
      const newPrayer: PrayerRequest = {
        id: 'pray-' + Date.now(),
        church_id: currentChurchId || 'church-1',
        churchId: currentChurchId || 'church-1',
        memberId: selectedMemberId || undefined,
        memberName,
        title: title.trim(),
        description: description.trim(),
        category,
        status,
        confidentiality,
        dateSubmitted: new Date().toISOString().split('T')[0],
        prayerCount: 0,
        prayedUserIds: [],
        updates: []
      };
      onSave(newPrayer);
    }

    // Reset
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-rose-400 fill-current" />
            <h2 className="text-lg font-bold">
              {prayerToEdit ? 'Edit Prayer Request' : 'Submit Prayer Request'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs sm:text-sm">
          {/* Associated Member / Requester */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">Requested By (Church Member)</label>
              {!canSelectRequester && (
                <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  <Lock className="w-3 h-3 text-slate-400" />
                  Locked to your account
                </span>
              )}
            </div>
            <select
              value={selectedMemberId}
              disabled={!canSelectRequester}
              onChange={(e) => {
                setSelectedMemberId(e.target.value);
                if (e.target.value) setGuestName('');
              }}
              className={`w-full p-2.5 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none ${
                !canSelectRequester ? 'bg-slate-100 opacity-80 cursor-not-allowed text-slate-600' : 'bg-slate-50'
              }`}
            >
              <option value="">-- Guest or General Request --</option>
              {safeMembers.map(m => (
                <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.status})</option>
              ))}
            </select>

            {!selectedMemberId && (
              <div className="mt-2">
                <input
                  type="text"
                  disabled={!canSelectRequester}
                  placeholder="Or enter requester name (e.g. Mary Watson)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className={`w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-xs ${
                    !canSelectRequester ? 'bg-slate-100 opacity-80 cursor-not-allowed text-slate-600' : 'bg-slate-50'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Prayer Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Upcoming Knee Surgery, Traveling Mercies"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Category & Urgency */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PrayerCategory)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Urgency Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PrayerStatus)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Urgent">⚠️ Urgent Need</option>
                <option value="Ongoing">Ongoing Care</option>
              </select>
            </div>
          </div>

          {/* Confidentiality */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Confidentiality & Access</span>
            </label>
            <select
              value={confidentiality}
              onChange={(e) => setConfidentiality(e.target.value as ConfidentialityLevel)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="Public Congregation">Public (Visible to full church wall)</option>
              <option value="Prayer Team Only">Prayer Team Only (Intercessors)</option>
              <option value="Pastoral Staff Only">Pastoral Staff Only (Confidential)</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Prayer Details *</label>
            <textarea
              rows={4}
              required
              placeholder="Describe the situation and how we can pray specifically..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Submit Prayer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
