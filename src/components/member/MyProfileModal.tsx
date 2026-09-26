import React, { useMemo } from 'react';
import { SaaSUser, Member } from '../../types';
import { findLinkedMemberForUser } from '../../utils/notificationUtils';
import { User, Mail, Phone, MapPin, Calendar, HeartHandshake, ShieldCheck, X } from 'lucide-react';

interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SaaSUser;
  members: Member[];
}

export const MyProfileModal: React.FC<MyProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  members = [],
}) => {
  if (!isOpen) return null;

  const linkedMember = useMemo(() => {
    return findLinkedMemberForUser(currentUser, members);
  }, [currentUser, members]);

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 text-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <User className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">My Member Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-xl transition hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Profile Card Header */}
        <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-md shrink-0">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              (currentUser.name || 'M').charAt(0)
            )}
          </div>

          <div className="space-y-0.5">
            <h4 className="font-black text-white text-base">{currentUser.name}</h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-amber-950/80 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-800">
                {linkedMember?.status || currentUser.role}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{currentUser.email}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</span>
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentUser.phone || linkedMember?.phone || 'Not provided'}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Joined Date</span>
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>{linkedMember?.joinedDate || 'Member in Good Standing'}</span>
              </div>
            </div>
          </div>

          {linkedMember?.address && (
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Address</span>
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{linkedMember.address}, {linkedMember.city}</span>
              </div>
            </div>
          )}

          {linkedMember?.ministryTeams && linkedMember.ministryTeams.length > 0 && (
            <div className="p-3 bg-amber-950/30 rounded-2xl border border-amber-900/60 space-y-1.5">
              <span className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5" />
                Assigned Ministry Teams
              </span>
              <div className="flex flex-wrap gap-1.5">
                {linkedMember.ministryTeams.map((team, idx) => (
                  <span key={idx} className="bg-slate-800 text-slate-200 text-xs font-bold px-2.5 py-0.5 rounded-xl border border-amber-800/60 shadow-2xs">
                    {team}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-2xl shadow-md transition"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
