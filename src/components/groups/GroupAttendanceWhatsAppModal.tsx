import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  Users,
  UserCheck,
  AlertCircle,
  Calendar,
  HeartHandshake,
  ShieldAlert,
  Flame,
  Crown,
  Phone,
  RefreshCw,
  X,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export interface GroupAttendanceWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'cell_group' | 'prayer_group';
  churchName: string;
  pastorName?: string;
  pastorPhone?: string;
  groupName: string;
  leaderName: string;
  schedule?: string;
  location?: string;
  sessionDate: string;
  topic?: string | null;
  notes?: string | null;
  presentMembers: { id: string; name: string; phone?: string }[];
  absentMembers: { id: string; name: string; phone?: string }[];
  availableGroups?: { id: string; name: string; category?: string; inviteLink?: string; memberCount?: number }[];
}

export type WhatsAppModalMode = 'group_report' | 'absentee_followup' | 'pastor_report';

export const GroupAttendanceWhatsAppModal: React.FC<GroupAttendanceWhatsAppModalProps> = ({
  isOpen,
  onClose,
  type,
  churchName,
  pastorName = 'Senior Pastor',
  pastorPhone = '',
  groupName,
  leaderName,
  schedule,
  location,
  sessionDate,
  topic,
  notes,
  presentMembers = [],
  absentMembers = [],
  availableGroups = [],
}) => {
  const [activeMode, setActiveMode] = useState<WhatsAppModalMode>('group_report');
  const [targetGroupId, setTargetGroupId] = useState<string>('');
  const [customPastorPhone, setCustomPastorPhone] = useState<string>(pastorPhone);
  const [customPastorName, setCustomPastorName] = useState<string>(pastorName);
  const [messageText, setMessageText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);

  const isPrayer = type === 'prayer_group';

  const sanitizePhone = (ph: string): string => {
    let clean = (ph || '').replace(/\D/g, '');
    if (clean.length === 10) clean = '91' + clean; // default country code if 10-digits
    return clean;
  };

  // Format date display
  const formattedDate = sessionDate
    ? new Date(sessionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Compute attendance stats
  const totalCount = presentMembers.length + absentMembers.length;
  const presentCount = presentMembers.length;
  const absentCount = absentMembers.length;
  const presentPct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

  // 1. Generate Group Report
  const generateGroupReport = (): string => {
    if (isPrayer) {
      return (
        `🔥 *${churchName} — ${groupName} Prayer Watch Summary*\n\n` +
        `Dear Prayer Warriors & Intercessors,\n\n` +
        `Thank you for standing in the gap today during our prayer gathering! Praise God for a powerful time of intercession.\n\n` +
        `📊 *Session Overview (${formattedDate}):*\n` +
        `• Intercessors Present: *${presentCount}*\n` +
        `• Absent: *${absentCount}*\n` +
        `• Prayer Leader: *${leaderName || 'Assigned Leader'}*\n\n` +
        `🙏 *Prayer Theme & Scripture:*\n` +
        `*${topic || 'Church Intercession & Spiritual Awakening'}*\n\n` +
        (notes ? `📝 *Session Petitions & Prophetic Insights:*\n${notes}\n\n` : '') +
        (schedule ? `🗓️ *Next Prayer Watch:* ${schedule}\n` : '') +
        (location ? `📍 *Location:* ${location}\n\n` : '\n') +
        `Let us remain steadfast on the watchtower throughout this week. The prayer of a righteous person is powerful and effective!\n\n` +
        `_“Watch and pray so that you will not fall into temptation.” — Matthew 26:41_\n\n` +
        `In Christian Love,\n*${leaderName || 'Prayer Leader'}* • ${churchName}`
      );
    }

    return (
      `🌟 *${churchName} — ${groupName} Attendance & Study Summary*\n\n` +
      `Dear Cell Family,\n\n` +
      `Praise the Lord for a joyful and blessed fellowship today! Here is our weekly cell gathering recap:\n\n` +
      `📊 *Meeting Overview (${formattedDate}):*\n` +
      `• Present: *${presentCount} members*\n` +
      `• Absent: *${absentCount} members*\n` +
      `• Cell Leader: *${leaderName || 'Assigned Leader'}*\n\n` +
      `📖 *Study Theme / Discussion:*\n` +
      `*${topic || 'Walking in Faith & Discipleship'}*\n\n` +
      (notes ? `📝 *Leader's Notes & Discussion Reflections:*\n${notes}\n\n` : '') +
      (schedule ? `🗓️ *Next Gathering:* ${schedule}\n` : '') +
      (location ? `📍 *Location:* ${location}\n\n` : '\n') +
      `Let us continue to care for one another and walk together in brotherly love this week!\n\n` +
      `_“And let us consider how we may spur one another on toward love and good deeds...” — Hebrews 10:24-25_\n\n` +
      `In Christ,\n*${leaderName || 'Cell Leader'}* • ${churchName}`
    );
  };

  // 2. Generate Individual Absentee Follow-Up Message
  const generateIndividualCareMessage = (memberName: string): string => {
    if (isPrayer) {
      return (
        `Dear ${memberName},\n\n` +
        `Peace and grace to you in Jesus' name from *${groupName}* (${churchName})!\n\n` +
        `We missed having your spirit and presence in our prayer gathering today (${formattedDate}). We lifted up prayers for *"${topic || 'our church and families'}"* and remembered you in our petitions.\n\n` +
        (schedule ? `We look forward to interceding together with you next time on *${schedule}*.\n\n` : '') +
        `If there is any personal prayer burden or family need you'd like us to stand with you in faith for, please reply anytime!\n\n` +
        `Standing with you in prayer,\n*${leaderName || 'Prayer Leader'}* • ${churchName}`
      );
    }

    return (
      `Dear ${memberName},\n\n` +
      `Warm greetings in Christ from *${groupName}* (${churchName})!\n\n` +
      `We really missed you at our cell gathering today (${formattedDate}). We had a fruitful time studying *"${topic || 'God’s Word'}"* and we remembered you and your family in our closing prayer.\n\n` +
      (schedule ? `We look forward to seeing you at our next meeting on *${schedule}*!\n\n` : '') +
      `Please let us know if there is anything we can pray for or support you with this week. You are deeply valued in our church family!\n\n` +
      `With prayers and love,\n*${leaderName || 'Cell Leader'}* • ${churchName}`
    );
  };

  // 3. Generate Bulk Absentee Recap Message
  const generateBulkAbsenteeMessage = (): string => {
    if (isPrayer) {
      return (
        `Dear Prayer Warriors of *${groupName}*,\n\n` +
        `To our dear intercessors who could not join our prayer session today (${formattedDate}): you were deeply missed!\n\n` +
        `🙏 *Today's Prayer Focus:* ${topic || 'Church Revival & Intercession'}\n` +
        (notes ? `📝 *Key Petitions:* ${notes}\n\n` : '\n') +
        `We lifted up you and your households in prayer today. We look forward to seeing you on *${schedule || 'our next scheduled prayer watch'}*!\n\n` +
        `Let us know if you have any prayer requests this week.\n\n` +
        `In Christ,\n*${leaderName || 'Prayer Leader'}* • ${churchName}`
      );
    }

    return (
      `Dear Cell Members of *${groupName}*,\n\n` +
      `To our dear members who couldn't make it to our gathering today (${formattedDate}): you were dearly missed in our fellowship!\n\n` +
      `📖 *Today's Discussion Theme:* ${topic || 'Living in Faith'}\n` +
      (notes ? `📝 *Session Highlights:* ${notes}\n\n` : '\n') +
      `We remembered each of you in our prayers. We can't wait to see you at our next meeting on *${schedule || 'next week'}*!\n\n` +
      `Reach out anytime if you need prayer or pastoral support.\n\n` +
      `Blessings,\n*${leaderName || 'Cell Leader'}* • ${churchName}`
    );
  };

  // 4. Generate Formal Pastor Report
  const generatePastorReport = (): string => {
    const presentNamesStr = presentMembers.length > 0
      ? presentMembers.map((m, idx) => `${idx + 1}. ${m.name}`).join('\n')
      : 'None logged.';

    const absentNamesStr = absentMembers.length > 0
      ? absentMembers.map((m, idx) => `${idx + 1}. ${m.name}${m.phone ? ` (${m.phone})` : ''}`).join('\n')
      : 'None (100% Attendance!)';

    if (isPrayer) {
      return (
        `🔥 *PRAYER MINISTRY ATTENDANCE REPORT FOR SENIOR PASTOR*\n\n` +
        `*Church:* ${churchName}\n` +
        `*Prayer Group:* ${groupName}\n` +
        `*Prayer Leader:* ${leaderName || 'Assigned Leader'}\n` +
        `*Session Date:* ${formattedDate}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📊 *INTERCESSOR ATTENDANCE:*\n` +
        `• Present: *${presentCount} intercessors* (${presentPct}%)\n` +
        `• Absent: *${absentCount} members*\n` +
        `• Total Enrolled: *${totalCount} intercessors*\n\n` +
        `👥 *PRESENT INTERCESSORS (${presentCount}):*\n` +
        `${presentNamesStr}\n\n` +
        `⚠️ *ABSENT MEMBERS (Care & Follow-up Initiated):*\n` +
        `${absentNamesStr}\n\n` +
        `🙏 *PRAYER FOCUS & SCRIPTURES:*\n` +
        `${topic || 'Church Intercession & Spiritual Breakthrough'}\n\n` +
        `📝 *PROPHETIC INSIGHTS & PETITIONS:*\n` +
        `${notes || 'Earnest prayer offered for the church pastoral leadership and church families.'}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Pastor ${customPastorName}, our intercessory team continues to pray for you and your family. Follow-up messages have been dispatched to absent members.\n\n` +
        `Faithfully submitted by:\n*${leaderName || 'Prayer Leader'}*`
      );
    }

    return (
      `📋 *CELL GROUP ATTENDANCE REPORT FOR SENIOR PASTOR*\n\n` +
      `*Church:* ${churchName}\n` +
      `*Cell Group:* ${groupName}\n` +
      `*Cell Leader:* ${leaderName || 'Assigned Leader'}\n` +
      `*Session Date:* ${formattedDate}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 *ATTENDANCE BREAKDOWN:*\n` +
      `• Total Present: *${presentCount} members* (${presentPct}%)\n` +
      `• Absent: *${absentCount} members*\n` +
      `• Total Enrolled: *${totalCount} members*\n\n` +
      `👥 *PRESENT ATTENDEES (${presentCount}):*\n` +
      `${presentNamesStr}\n\n` +
      `⚠️ *ABSENT MEMBERS (Follow-up List):*\n` +
      `${absentNamesStr}\n\n` +
      `📖 *STUDY TOPIC / SCRIPTURE:*\n` +
      `${topic || 'General Bible Study & Fellowship'}\n\n` +
      `📝 *LEADER'S OBSERVATIONS & PRAYER REQUESTS:*\n` +
      `${notes || 'No critical pastoral issues noted. Healthy fellowship and mutual ministry.'}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Pastor ${customPastorName}, we have reached out to absent members with care touchpoints. Please advise if any member requires a pastoral call or visit.\n\n` +
      `Submitted by:\n*${leaderName || 'Cell Leader'}*`
    );
  };

  // Update text when mode or data changes
  const updateMessageByMode = (mode: WhatsAppModalMode) => {
    setActiveMode(mode);
    if (mode === 'group_report') {
      setMessageText(generateGroupReport());
    } else if (mode === 'absentee_followup') {
      setMessageText(generateBulkAbsenteeMessage());
    } else if (mode === 'pastor_report') {
      setMessageText(generatePastorReport());
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCustomPastorPhone(pastorPhone);
      setCustomPastorName(pastorName);
      if (availableGroups.length > 0 && !targetGroupId) {
        setTargetGroupId(availableGroups[0].id);
      }
      updateMessageByMode('group_report');
    }
  }, [isOpen, sessionDate, topic, notes, presentMembers, absentMembers, pastorPhone, pastorName]);

  // Handlers
  const handleCopyText = (textToCopy?: string) => {
    const text = textToCopy || messageText;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('WhatsApp text copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyIndividualCareMessage = (member: { id: string; name: string }) => {
    const msg = generateIndividualCareMessage(member.name);
    navigator.clipboard.writeText(msg);
    setCopiedMemberId(member.id);
    toast.success(`Care message for ${member.name} copied!`);
    setTimeout(() => setCopiedMemberId(null), 2500);
  };

  const handleSendIndividualWhatsApp = (member: { id: string; name: string; phone?: string }) => {
    const msg = generateIndividualCareMessage(member.name);
    const encoded = encodeURIComponent(msg);
    const cleanPhone = sanitizePhone(member.phone || '');

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      // Fallback if no phone
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  const handleDispatchGroupWhatsApp = () => {
    handleCopyText();
    const encoded = encodeURIComponent(messageText);
    const targetGroup = availableGroups.find((g) => g.id === targetGroupId);

    if (targetGroup?.inviteLink && targetGroup.inviteLink.startsWith('http')) {
      window.open(targetGroup.inviteLink, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  const handleDispatchPastorWhatsApp = () => {
    handleCopyText();
    const encoded = encodeURIComponent(messageText);
    const cleanPhone = sanitizePhone(customPastorPhone);

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-2 border-slate-700 text-white p-0 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-slate-800 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold shadow-lg">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>WhatsApp Attendance Hub</span>
                  <Badge variant="outline" className="bg-emerald-950/80 text-emerald-300 border-emerald-800/80 text-[10px] font-bold">
                    {groupName}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  1-Click automated WhatsApp reports, absentee follow-up touchpoints, and senior pastor summaries.
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-[11px]">
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Session Date:</span>
              <strong className="text-white flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                {formattedDate}
              </strong>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Present Intercessors / Members:</span>
              <strong className="text-emerald-400 font-bold">
                ✓ {presentCount} Present ({presentPct}%)
              </strong>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <span className="text-slate-400 block">Absentee Touchpoints:</span>
              <strong className={absentCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                {absentCount > 0 ? `✕ ${absentCount} Absent` : 'None (Full Roster!)'}
              </strong>
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="bg-slate-950 px-4 sm:px-5 py-2.5 border-b border-slate-800">
          <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => updateMessageByMode('group_report')}
              className={`py-2 px-2 rounded-lg transition flex items-center justify-center gap-1.5 text-center ${
                activeMode === 'group_report'
                  ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Report to Group</span>
            </button>

            <button
              type="button"
              onClick={() => updateMessageByMode('absentee_followup')}
              className={`py-2 px-2 rounded-lg transition flex items-center justify-center gap-1.5 text-center ${
                activeMode === 'absentee_followup'
                  ? 'bg-amber-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Follow Up Missing ({absentCount})</span>
            </button>

            <button
              type="button"
              onClick={() => updateMessageByMode('pastor_report')}
              className={`py-2 px-2 rounded-lg transition flex items-center justify-center gap-1.5 text-center ${
                activeMode === 'pastor_report'
                  ? 'bg-purple-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Report to Pastor</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: GROUP REPORT */}
          {activeMode === 'group_report' && (
            <div className="space-y-3.5">
              {availableGroups.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Target Church WhatsApp Group / Channel
                  </label>
                  <select
                    value={targetGroupId}
                    onChange={(e) => setTargetGroupId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableGroups.map((g) => (
                      <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                        {g.name} ({g.category || 'Group'}) {g.memberCount ? `— ${g.memberCount} Members` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Broadcasts study theme, attendance stats, and next meeting reminder directly to group members.
                </span>
                <button
                  type="button"
                  onClick={() => setMessageText(generateGroupReport())}
                  className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px] font-bold shrink-0 ml-2"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Text
                </button>
              </div>

              <textarea
                rows={8}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                placeholder="Compose WhatsApp broadcast message..."
              />

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  onClick={handleDispatchGroupWhatsApp}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 shadow-lg shadow-emerald-600/20"
                >
                  <Send className="w-4 h-4 mr-1.5" /> Broadcast to WhatsApp Group
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopyText()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 font-bold text-xs h-10 px-4"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400 mr-1.5" /> : <Copy className="w-4 h-4 text-slate-400 mr-1.5" />}
                  {copied ? 'Copied!' : 'Copy Text'}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: ABSENTEE CARE & FOLLOW-UP */}
          {activeMode === 'absentee_followup' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-200/90 flex items-start gap-2.5">
                <HeartHandshake className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 block font-bold">Personalized Pastoral Care & Touchpoints:</strong>
                  Send a personalized care note to each missing member, letting them know they were prayed for and missed.
                </div>
              </div>

              {absentMembers.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl space-y-1">
                  <UserCheck className="w-8 h-8 mx-auto text-emerald-400" />
                  <p className="text-sm font-bold text-white">Full Attendance Recorded!</p>
                  <p className="text-xs text-slate-400">All registered members were present at this session.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Missing Members ({absentMembers.length})</span>
                    <span className="text-[11px] font-normal text-slate-400">Tap below to message directly</span>
                  </h4>

                  <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                    {absentMembers.map((mem) => {
                      const hasPhone = Boolean(mem.phone);
                      const isCopied = copiedMemberId === mem.id;

                      return (
                        <div key={mem.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                              {mem.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-white block truncate">{mem.name}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-slate-500" />
                                {mem.phone || 'No phone registered'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              onClick={() => handleSendIndividualWhatsApp(mem)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] h-7 px-2.5 shadow-sm"
                              title={`Send personalized care message to ${mem.name} via WhatsApp`}
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {hasPhone ? 'WhatsApp Member' : 'Open WhatsApp'}
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopyIndividualCareMessage(mem)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] h-7 px-2 border border-slate-700"
                              title="Copy personalized care note"
                            >
                              {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bulk Absentee Broadcast Box */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">
                    Or Broadcast General Absentee Recap to Group:
                  </span>
                  <button
                    type="button"
                    onClick={() => setMessageText(generateBulkAbsenteeMessage())}
                    className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] font-bold"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset Text
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                />

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={handleDispatchGroupWhatsApp}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Broadcast Absentee Recap to WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopyText()}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 font-bold text-xs h-9 px-3"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REPORT TO PASTOR */}
          {activeMode === 'pastor_report' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-purple-950/20 border border-purple-800/30 rounded-xl text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Senior Pastor Name
                  </label>
                  <input
                    type="text"
                    value={customPastorName}
                    onChange={(e) => setCustomPastorName(e.target.value)}
                    placeholder="Senior Pastor Name"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Pastor WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={customPastorPhone}
                    onChange={(e) => setCustomPastorPhone(e.target.value)}
                    placeholder="+91 98401 23456"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Formal executive report containing attendance percentages, attendee lists, missing members, and leader notes.
                </span>
                <button
                  type="button"
                  onClick={() => setMessageText(generatePastorReport())}
                  className="text-purple-400 hover:underline flex items-center gap-1 text-[11px] font-bold shrink-0 ml-2"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Text
                </button>
              </div>

              <textarea
                rows={9}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                placeholder="Executive pastor report..."
              />

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  onClick={handleDispatchPastorWhatsApp}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-10 shadow-lg shadow-purple-600/20"
                >
                  <Send className="w-4 h-4 mr-1.5" /> Send Executive Report to Pastor
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopyText()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 font-bold text-xs h-10 px-4"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400 mr-1.5" /> : <Copy className="w-4 h-4 text-slate-400 mr-1.5" />}
                  {copied ? 'Copied!' : 'Copy Report'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
