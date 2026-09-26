import React, { useState, useRef, useMemo } from 'react';
import { 
  Member, WhatsAppReminderTemplate, WhatsAppGroup, ChurchTenant, 
  SundaySchoolClass, SundaySchoolStudent, SundaySchoolAttendanceRecord, 
  CompleteChurchSettings, ChurchEvent, AttendanceRecord 
} from '../types';
import { 
  MessageSquare, Send, Copy, Check, Sparkles, Users, UserCheck, 
  ShieldCheck, HeartHandshake, PhoneCall, Plus, Trash2, Edit3, X, Save,
  Layers, Info, AlertCircle, FileText, Tag, Link, ExternalLink, Globe, Hash,
  GraduationCap, Bell, Calendar, Video, BookOpen, Award, CheckCircle2, ListChecks,
  RefreshCw, Share2, HelpCircle
} from 'lucide-react';

interface WhatsAppHubProps {
  members?: Member[];
  templates?: WhatsAppReminderTemplate[];
  groups?: WhatsAppGroup[];
  currentChurch: ChurchTenant;
  canManageTemplates?: boolean;
  sundaySchoolClasses?: SundaySchoolClass[];
  sundaySchoolStudents?: SundaySchoolStudent[];
  sundaySchoolAttendance?: SundaySchoolAttendanceRecord[];
  churchSettings?: CompleteChurchSettings;
  events?: ChurchEvent[];
  attendance?: AttendanceRecord[];
  onSaveTemplate?: (template: WhatsAppReminderTemplate) => void;
  onDeleteTemplate?: (id: string) => void;
  onSaveGroup?: (group: WhatsAppGroup) => void;
  onDeleteGroup?: (id: string) => void;
}

const STANDARD_CATEGORIES = [
  'Service Reminder',
  'Sunday School',
  'Prayer Alert',
  'Attendance Follow-up',
  'Tithe Receipt',
  'General Announcement',
  'Event Invitation',
  'Custom'
];

const GROUP_CATEGORIES = [
  'General',
  'Leadership',
  'Youth',
  'Worship',
  'Sunday School',
  'Prayer Warriors',
  'Women',
  'Men',
  'Custom'
];

const VARIABLE_TAGS = [
  { tag: '{MemberName}', label: 'Member Name', desc: 'Full name of recipient' },
  { tag: '{GroupName}', label: 'Group Name', desc: 'Target WhatsApp Group' },
  { tag: '{ChurchName}', label: 'Church Name', desc: 'Your church name' },
  { tag: '{City}', label: 'City', desc: 'Church location' },
  { tag: '{ServiceName}', label: 'Service Name', desc: 'e.g. Sunday Resurrection Worship' },
  { tag: '{ServiceTime}', label: 'Service Time', desc: 'e.g. 9:00 AM IST' },
  { tag: '{Location}', label: 'Location / Sanctuary', desc: 'e.g. Main Sanctuary' },
  { tag: '{Speaker}', label: 'Speaker / Preacher', desc: 'e.g. Senior Pastor' },
  { tag: '{LivestreamLink}', label: 'Live Stream URL', desc: 'e.g. YouTube / Live URL' },
  { tag: '{ClassName}', label: 'Sunday School Class', desc: 'e.g. Little Lambs' },
  { tag: '{TeacherName}', label: 'SS Teacher Name', desc: 'Class teacher' },
  { tag: '{LessonTopic}', label: 'Lesson Topic', desc: 'e.g. David & Goliath' },
  { tag: '{MemoryVerse}', label: 'Memory Verse', desc: 'Scripture verse of the week' },
  { tag: '{PresentCount}', label: 'Present Count', desc: 'Number of attendees' },
  { tag: '{AbsentCount}', label: 'Absent Count', desc: 'Number of absentees' },
  { tag: '{Date}', label: 'Session Date', desc: 'e.g. 30 Aug 2026' },
  { tag: '{Amount}', label: 'Amount (₹)', desc: 'Tithe/offering figure' },
  { tag: '{FundName}', label: 'Fund Name', desc: 'e.g. Building Fund' },
  { tag: '{ReceiptNo}', label: 'Receipt No', desc: 'e.g. NCA-8801' },
  { tag: '{PrayerTitle}', label: 'Prayer Title', desc: 'Request subject' },
  { tag: '{PrayerDescription}', label: 'Prayer Note', desc: 'Details of prayer' },
];

export const WhatsAppHub: React.FC<WhatsAppHubProps> = ({
  members = [],
  templates = [],
  groups = [],
  currentChurch,
  canManageTemplates = true,
  sundaySchoolClasses = [],
  sundaySchoolStudents = [],
  sundaySchoolAttendance = [],
  churchSettings,
  events = [],
  attendance = [],
  onSaveTemplate,
  onDeleteTemplate,
  onSaveGroup,
  onDeleteGroup,
}) => {
  const safeMembers = members || [];
  const safeTemplates = templates || [];
  const safeGroups = groups || [];
  const safeSSClasses = sundaySchoolClasses || [];
  const safeSSStudents = sundaySchoolStudents || [];
  const safeSSAttendance = sundaySchoolAttendance || [];
  const safeEvents = events || [];

  // Active Main Tab Mode: 'composer' (Templates & Custom) | 'ss_auto' (Sunday School Automation) | 'service_auto' (Service Broadcast Automation) | 'groups' (Manage WhatsApp Groups)
  const [activeTabMode, setActiveTabMode] = useState<'composer' | 'ss_auto' | 'service_auto' | 'groups'>('composer');

  // Direct send vs group target selector
  const [targetType, setTargetType] = useState<'direct' | 'group'>('group');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(safeTemplates[0]?.id || '');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(safeMembers[0]?.id || '');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(safeGroups[0]?.id || '');
  const [customText, setCustomText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [groupCategoryFilter, setGroupCategoryFilter] = useState<string>('All');
  const [searchMemberQuery, setSearchMemberQuery] = useState<string>('');
  const [searchGroupQuery, setSearchGroupQuery] = useState<string>('');

  // -------------------------------------------------------------
  // DYNAMIC PARAMETERS STATE
  // -------------------------------------------------------------
  const [serviceNameParam, setServiceNameParam] = useState('Sunday Resurrection Worship Service');
  const [serviceTimeParam, setServiceTimeParam] = useState('9:00 AM & 10:45 AM IST');
  const [locationParam, setLocationParam] = useState('Main Sanctuary');
  const [speakerParam, setSpeakerParam] = useState(currentChurch?.pastorName || 'Senior Pastor');
  const [livestreamParam, setLivestreamParam] = useState('https://youtube.com/@churchlive');
  
  // Sunday School params
  const [ssClassParam, setSsClassParam] = useState(safeSSClasses[0]?.className || 'Little Lambs');
  const [ssTeacherParam, setSsTeacherParam] = useState(safeSSClasses[0]?.teacherName || 'Sunday School Lead');
  const [ssLessonParam, setSsLessonParam] = useState(safeSSClasses[0]?.currentLesson || 'David & Goliath: Courage in God');
  const [ssVerseParam, setSsVerseParam] = useState(safeSSClasses[0]?.memoryVerse || '1 Samuel 17:45 - "I come against you in the name of the Lord Almighty."');
  const [ssPresentCountParam, setSsPresentCountParam] = useState('12');
  const [ssAbsentCountParam, setSsAbsentCountParam] = useState('2');
  const [dateParam, setDateParam] = useState(() => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
  
  // Finance & Prayer params
  const [amountParam, setAmountParam] = useState('2500');
  const [fundParam, setFundParam] = useState('Tithe & Offering');
  const [receiptParam, setReceiptParam] = useState('NCA-IND-8801');
  const [prayerTitleParam, setPrayerTitleParam] = useState('Surgical Recovery & Complete Healing');
  const [prayerDescParam, setPrayerDescParam] = useState('Please keep praying for complete victory and peace.');

  // -------------------------------------------------------------
  // SUNDAY SCHOOL AUTOMATION STATE
  // -------------------------------------------------------------
  const [selectedSSClassId, setSelectedSSClassId] = useState<string>(safeSSClasses[0]?.id || '');
  const [selectedSSRecordId, setSelectedSSRecordId] = useState<string>(safeSSAttendance[0]?.id || 'newest');
  const [ssSummaryFormat, setSsSummaryFormat] = useState<'full_summary' | 'verse_challenge' | 'parent_update' | 'absentee_care'>('full_summary');

  // -------------------------------------------------------------
  // SERVICE BROADCAST AUTOMATION STATE
  // -------------------------------------------------------------
  const churchServicesList = useMemo(() => {
    const fromSettings = churchSettings?.services?.filter(s => s.isActive !== false) || [];
    if (fromSettings.length > 0) return fromSettings;
    return [
      { id: 'srv-1', name: 'Sunday Resurrection Worship Service', day: 'Sunday', startTime: '09:00 AM', location: 'Main Sanctuary' },
      { id: 'srv-2', name: 'Sunday Evening Youth & Praise Service', day: 'Sunday', startTime: '06:00 PM', location: 'Youth Chapel' },
      { id: 'srv-3', name: 'Wednesday Word & Intercessory Prayer', day: 'Wednesday', startTime: '07:00 PM', location: 'Main Sanctuary' },
      { id: 'srv-4', name: 'Friday Bible Study & Fasting Fellowship', day: 'Friday', startTime: '10:30 AM', location: 'Fellowship Hall' },
      { id: 'srv-5', name: 'Saturday Morning Dawn Prayer', day: 'Saturday', startTime: '06:00 AM', location: 'Prayer Room' }
    ];
  }, [churchSettings]);

  const [selectedServiceId, setSelectedServiceId] = useState<string>(churchServicesList[0]?.id || 'srv-1');
  const [serviceBroadcastType, setServiceBroadcastType] = useState<'sunday_service' | 'midweek_prayer' | 'youth_night' | 'livestream_alert' | 'post_service_followup'>('sunday_service');

  // -------------------------------------------------------------
  // MODALS STATE
  // -------------------------------------------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalCategory, setModalCategory] = useState<string>('Service Reminder');
  const [modalCustomCategory, setModalCustomCategory] = useState('');
  const [modalText, setModalText] = useState('');
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [modalGroupName, setModalGroupName] = useState('');
  const [modalGroupCategory, setModalGroupCategory] = useState<string>('General');
  const [modalGroupDescription, setModalGroupDescription] = useState('');
  const [modalGroupInviteLink, setModalGroupInviteLink] = useState('');
  const [modalGroupLeader, setModalGroupLeader] = useState('');
  const [modalGroupMemberCount, setModalGroupMemberCount] = useState<number>(25);
  const [modalGroupColor, setModalGroupColor] = useState('#059669');

  const activeTemplate = safeTemplates.find((t) => t.id === selectedTemplateId) || safeTemplates[0];
  const activeMember = safeMembers.find((m) => m.id === selectedMemberId) || safeMembers[0];
  const activeGroup = safeGroups.find((g) => g.id === selectedGroupId) || safeGroups[0];

  // -------------------------------------------------------------
  // AUTOMATED GENERATOR HANDLERS
  // -------------------------------------------------------------

  // 1. Generate Sunday School Summary
  const handleGenerateSSSummary = () => {
    const targetCls = safeSSClasses.find((c) => c.id === selectedSSClassId) || safeSSClasses[0];
    const recordsForClass = safeSSAttendance.filter((a) => !targetCls || a.classId === targetCls.id);
    const targetRecord = selectedSSRecordId === 'newest' 
      ? recordsForClass[0] 
      : recordsForClass.find((r) => r.id === selectedSSRecordId) || recordsForClass[0];

    const clsName = targetCls?.className || 'Sunday School';
    const teacherName = targetRecord?.recordedBy || targetCls?.teacherName || 'Sunday School Teacher';
    const lesson = targetRecord?.lessonTaught || targetCls?.currentLesson || 'God\'s Love & Grace';
    const verse = targetRecord?.memoryVerse || targetCls?.memoryVerse || 'John 3:16 - For God so loved the world.';
    const presentCount = targetRecord?.presentStudentIds?.length || 8;
    const absentCount = targetRecord?.absentStudentIds?.length || 2;
    const guestCount = targetRecord?.guestCount || 0;
    const dateStr = targetRecord?.date 
      ? new Date(targetRecord.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    // Update dynamic params
    setSsClassParam(clsName);
    setSsTeacherParam(teacherName);
    setSsLessonParam(lesson);
    setSsVerseParam(verse);
    setSsPresentCountParam(String(presentCount));
    setSsAbsentCountParam(String(absentCount));
    setDateParam(dateStr);

    // Auto-select Sunday School Group if available
    const ssGroup = safeGroups.find((g) => g.category === 'Sunday School' || g.name.toLowerCase().includes('sunday school'));
    if (ssGroup) {
      setSelectedGroupId(ssGroup.id);
    }
    setTargetType('group');

    let generated = '';
    if (ssSummaryFormat === 'full_summary') {
      generated = `🌟 *${currentChurch.name} - Sunday School Weekly Attendance & Verse Summary*\n\n` +
        `Dear Parents & Church Family,\n\n` +
        `Praise God for a joyful, spirit-filled session today in *${clsName}* (${targetCls?.ageGroup || 'Children'})!\n\n` +
        `📊 *Session Attendance Highlights (${dateStr}):*\n` +
        `• Total Present: *${presentCount} children*\n` +
        `• Absent: *${absentCount} children*\n` +
        (guestCount > 0 ? `• First-Time Guests: *+${guestCount} children*\n` : '') +
        `• Teacher / Leader: *${teacherName}*\n\n` +
        `📖 *Lesson of the Week:*\n` +
        `*${lesson}*\n\n` +
        `📜 *Memory Verse to Practice at Home:*\n` +
        `> "${verse}"\n\n` +
        (targetRecord?.notes ? `📝 *Teacher's Note:* ${targetRecord.notes}\n\n` : '') +
        `🎯 *Home Challenge:* Please recite this verse 3 times with your child before bed this week. Special badge awarded next Sunday for recitation!\n\n` +
        `_“Train up a child in the way he should go, and when he is old he will not depart from it.” — Proverbs 22:6_\n\n` +
        `Blessings,\n*${teacherName}* • ${currentChurch.name}`;
    } else if (ssSummaryFormat === 'verse_challenge') {
      generated = `📖 *Weekly Memory Verse Challenge | ${clsName}*\n\n` +
        `Dear Parents of ${currentChurch.name},\n\n` +
        `Here is this week's memory verse for our Sunday School students:\n\n` +
        `✨ *"${verse}"*\n\n` +
        `📚 *Lesson Theme:* ${lesson}\n` +
        `🗓️ *Target Sunday:* Next Service\n\n` +
        `🏆 *Challenge:* Practice this verse together as a family. Let's hide God's Word in our children's hearts!\n\n` +
        `With prayers,\n*${teacherName}* • ${currentChurch.name}`;
    } else if (ssSummaryFormat === 'parent_update') {
      generated = `Dear {MemberName},\n\n` +
        `Grace and peace! We are delighted that your child joined Sunday School today at *${currentChurch.name}* in *${clsName}*.\n\n` +
        `📖 *Today's Lesson:* ${lesson}\n` +
        `📜 *Memory Verse:* "${verse}"\n\n` +
        `Thank you for encouraging your family in the Lord! Please practice this verse together at home this week.\n\n` +
        `Blessings,\n*${teacherName}*`;
      setTargetType('direct');
    } else {
      // Absentee care
      generated = `Dear {MemberName},\n\n` +
        `Warm greetings from *${currentChurch.name}* Sunday School! We missed having your child in *${clsName}* class today.\n\n` +
        `Here is the lesson and memory verse so your child doesn't miss out:\n` +
        `📖 *Lesson:* ${lesson}\n` +
        `📜 *Memory Verse:* "${verse}"\n\n` +
        `We prayed for you and look forward to seeing your family next Sunday!\n\n` +
        `In Christ,\n*${teacherName}*`;
      setTargetType('direct');
    }

    setCustomText(generated);
  };

  // 2. Generate Service Broadcast Reminder
  const handleGenerateServiceBroadcast = () => {
    const targetService = churchServicesList.find((s) => s.id === selectedServiceId) || churchServicesList[0];
    const sName = targetService?.name || 'Sunday Worship Service';
    const sTime = targetService?.startTime || '09:00 AM IST';
    const sLoc = targetService?.location || 'Main Sanctuary';

    setServiceNameParam(sName);
    setServiceTimeParam(sTime);
    setLocationParam(sLoc);

    let generated = '';
    if (serviceBroadcastType === 'sunday_service') {
      const annGroup = safeGroups.find((g) => g.category === 'General' || g.name.toLowerCase().includes('announcement') || g.name.toLowerCase().includes('official'));
      if (annGroup) setSelectedGroupId(annGroup.id);
      setTargetType('group');

      generated = `🔔 *${currentChurch.name} - Sunday Worship Service Reminder*\n\n` +
        `Dear Church Family,\n\n` +
        `Grace and peace to you in Christ Jesus! We invite you and your family to join us tomorrow as we gather for worship, praise, and an anointed message from God's Word.\n\n` +
        `📍 *Service:* ${sName}\n` +
        `⏰ *Time:* ${sTime}\n` +
        `🏛️ *Sanctuary:* ${sLoc}, ${currentChurch.city || 'Church'}\n` +
        `🎙️ *Speaker:* ${speakerParam}\n` +
        `📖 *Theme:* ${ssVerseParam || 'Walking in New Creation Power'}\n\n` +
        `📺 *Live Stream Link:* ${livestreamParam}\n\n` +
        `_“I rejoiced with those who said to me, ‘Let us go to the house of the Lord.’” — Psalm 122:1_\n\n` +
        `Come with expectant hearts. Bring a friend with you!\n\n` +
        `In Christ's Love,\n*${currentChurch.name} Pastoral Team*`;
    } else if (serviceBroadcastType === 'midweek_prayer') {
      const prayerGroup = safeGroups.find((g) => g.category === 'Prayer Warriors' || g.name.toLowerCase().includes('prayer'));
      if (prayerGroup) setSelectedGroupId(prayerGroup.id);
      setTargetType('group');

      generated = `🙏 *${currentChurch.name} - Midweek Word & Intercessory Prayer Gathering*\n\n` +
        `Dear Church Family,\n\n` +
        `Join us this Wednesday at *${sTime}* for an intimate time of Bible exposition and united churchwide prayer.\n\n` +
        `📍 *Location:* ${sLoc}\n` +
        `📖 *Topic:* In-Depth Scripture Study & Altar Intercession\n\n` +
        `_“For where two or three gather in my name, there am I with them.” — Matthew 18:20_\n\n` +
        `Submit your prayer requests or join us live!\n\n` +
        `*${currentChurch.name}*`;
    } else if (serviceBroadcastType === 'youth_night') {
      const youthGroup = safeGroups.find((g) => g.category === 'Youth' || g.name.toLowerCase().includes('youth'));
      if (youthGroup) setSelectedGroupId(youthGroup.id);
      setTargetType('group');

      generated = `🔥 *YOUTH FELLOWSHIP & PRAISE NIGHT | ${currentChurch.name}*\n\n` +
        `Hey Youth & Young Adults!\n\n` +
        `Get ready for an electrifying Youth Fellowship this Friday at *${sTime}*!\n\n` +
        `📍 *Venue:* ${sLoc}\n` +
        `🎸 *Praise & Worship:* Contemporary Band\n` +
        `🎯 *Interactive Discussion:* Living Boldly for Christ in 2026\n` +
        `🍕 *Followed by:* Refreshments & Games\n\n` +
        `Tag a friend and see you there! Don't miss it!\n\n` +
        `*${currentChurch.name} Youth Ministry*`;
    } else if (serviceBroadcastType === 'livestream_alert') {
      const annGroup = safeGroups.find((g) => g.category === 'General');
      if (annGroup) setSelectedGroupId(annGroup.id);
      setTargetType('group');

      generated = `🔴 *WE ARE LIVE! ${sName} | ${currentChurch.name}*\n\n` +
        `Our worship service has started! If you cannot be with us in person today, join our live broadcast stream now:\n\n` +
        `📺 *Watch Live Stream:* ${livestreamParam}\n\n` +
        `🎙️ *Speaker:* ${speakerParam}\n` +
        `💬 Chat and drop your prayer requests in the comments!\n\n` +
        `_May God's presence fill your home wherever you are watching._`;
    } else {
      // Post-service follow-up
      setTargetType('direct');
      generated = `Dear {MemberName},\n\n` +
        `Warm blessings from *${currentChurch.name}*! We missed having you and your family with us at ${sName} today.\n\n` +
        `You were in our thoughts and prayers during our service. If you need any prayer support or pastoral connection, please reply to this message anytime.\n\n` +
        (livestreamParam ? `📺 You can catch the full service sermon replay here: ${livestreamParam}\n\n` : '') +
        `May the Lord bless your upcoming week with joy and grace!\n\n` +
        `In Christ,\n*${currentChurch.name} Pastoral Care Team*`;
    }

    setCustomText(generated);
  };

  // -------------------------------------------------------------
  // MESSAGE RENDERING WITH PLACEHOLDERS
  // -------------------------------------------------------------
  const generateFinalMessage = (): string => {
    let text = customText || activeTemplate?.templateText || '';

    if (targetType === 'group') {
      text = text.replace(/{MemberName}/g, activeGroup?.name || 'Beloved Church Family');
      text = text.replace(/{GroupName}/g, activeGroup?.name || 'Church Group');
    } else {
      if (activeMember) {
        text = text.replace(/{MemberName}/g, `${activeMember.firstName} ${activeMember.lastName}`);
      } else {
        text = text.replace(/{MemberName}/g, 'Church Member');
      }
      text = text.replace(/{GroupName}/g, 'Church Family');
    }

    text = text.replace(/{ChurchName}/g, currentChurch?.name || 'Church');
    text = text.replace(/{City}/g, currentChurch?.city || 'City');
    text = text.replace(/{ServiceName}/g, serviceNameParam);
    text = text.replace(/{ServiceTime}/g, serviceTimeParam);
    text = text.replace(/{Location}/g, locationParam);
    text = text.replace(/{Speaker}/g, speakerParam);
    text = text.replace(/{LivestreamLink}/g, livestreamParam);
    text = text.replace(/{ClassName}/g, ssClassParam);
    text = text.replace(/{TeacherName}/g, ssTeacherParam);
    text = text.replace(/{LessonTopic}/g, ssLessonParam);
    text = text.replace(/{MemoryVerse}/g, ssVerseParam);
    text = text.replace(/{PresentCount}/g, ssPresentCountParam);
    text = text.replace(/{AbsentCount}/g, ssAbsentCountParam);
    text = text.replace(/{Date}/g, dateParam);
    text = text.replace(/{Amount}/g, amountParam);
    text = text.replace(/{FundName}/g, fundParam);
    text = text.replace(/{ReceiptNo}/g, receiptParam);
    text = text.replace(/{PrayerTitle}/g, prayerTitleParam);
    text = text.replace(/{PrayerDescription}/g, prayerDescParam);

    return text;
  };

  const finalMessage = generateFinalMessage();

  const sanitizePhone = (ph: string): string => {
    let clean = (ph || '').replace(/\D/g, '');
    if (clean.length === 10) clean = '91' + clean; // default to India code +91
    return clean;
  };

  const handleOpenWhatsApp = (phoneStr?: string) => {
    const targetPhone = phoneStr ? sanitizePhone(phoneStr) : sanitizePhone(activeMember?.phone || '919840123456');
    const encoded = encodeURIComponent(finalMessage);
    const waUrl = `https://wa.me/${targetPhone}?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleShareToGroup = (customGroupLink?: string) => {
    navigator.clipboard.writeText(finalMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);

    const encoded = encodeURIComponent(finalMessage);
    const targetUrl = customGroupLink && customGroupLink.startsWith('http')
      ? customGroupLink
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(targetUrl, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(finalMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // -------------------------------------------------------------
  // TEMPLATE & GROUP MODAL HANDLERS
  // -------------------------------------------------------------
  const handleOpenCreateModal = () => {
    setEditingTemplateId(null);
    setModalTitle('');
    setModalCategory('Service Reminder');
    setModalCustomCategory('');
    setModalText('🔔 *{ChurchName} - Sunday Service Reminder*\n\nDear {MemberName}, Join us for service at {ServiceTime} in {Location}. Theme: {MemoryVerse}.');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tpl: WhatsAppReminderTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplateId(tpl.id);
    setModalTitle(tpl.title);
    if (STANDARD_CATEGORIES.includes(tpl.category)) {
      setModalCategory(tpl.category);
      setModalCustomCategory('');
    } else {
      setModalCategory('Custom');
      setModalCustomCategory(tpl.category);
    }
    setModalText(tpl.templateText);
    setIsModalOpen(true);
  };

  const handleOpenCreateGroupModal = () => {
    setEditingGroupId(null);
    setModalGroupName('');
    setModalGroupCategory('General');
    setModalGroupDescription('');
    setModalGroupInviteLink('');
    setModalGroupLeader(currentChurch?.pastorName || '');
    setModalGroupMemberCount(30);
    setModalGroupColor('#059669');
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroupModal = (grp: WhatsAppGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroupId(grp.id);
    setModalGroupName(grp.name);
    setModalGroupCategory(grp.category || 'General');
    setModalGroupDescription(grp.description || '');
    setModalGroupInviteLink(grp.inviteLink || '');
    setModalGroupLeader(grp.leaderName || '');
    setModalGroupMemberCount(grp.memberCount || 25);
    setModalGroupColor(grp.color || '#059669');
    setIsGroupModalOpen(true);
  };

  const handleInsertTag = (tag: string) => {
    if (!modalTextareaRef.current) {
      setModalText((prev) => prev + ' ' + tag);
      return;
    }
    const textarea = modalTextareaRef.current;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const newText = modalText.substring(0, start) + tag + modalText.substring(end);
    setModalText(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleSaveModalTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim() || !modalText.trim()) {
      alert('Please fill out both the template title and message text.');
      return;
    }

    const finalCategory = modalCategory === 'Custom' && modalCustomCategory.trim() 
      ? modalCustomCategory.trim() 
      : modalCategory;

    const templateToSave: WhatsAppReminderTemplate = {
      id: editingTemplateId || `wa-${Date.now()}`,
      church_id: currentChurch.id,
      churchId: currentChurch.id,
      title: modalTitle.trim(),
      category: finalCategory,
      templateText: modalText.trim(),
    };

    if (onSaveTemplate) {
      onSaveTemplate(templateToSave);
    }

    setSelectedTemplateId(templateToSave.id);
    setCustomText(templateToSave.templateText);
    setIsModalOpen(false);
  };

  const handleSaveModalGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalGroupName.trim()) {
      alert('Please provide a WhatsApp group name.');
      return;
    }

    const groupToSave: WhatsAppGroup = {
      id: editingGroupId || `wag-${Date.now()}`,
      church_id: currentChurch.id,
      churchId: currentChurch.id,
      name: modalGroupName.trim(),
      category: modalGroupCategory,
      description: modalGroupDescription.trim(),
      inviteLink: modalGroupInviteLink.trim(),
      leaderName: modalGroupLeader.trim(),
      memberCount: Number(modalGroupMemberCount) || 0,
      color: modalGroupColor,
      createdAt: new Date().toISOString(),
    };

    if (onSaveGroup) {
      onSaveGroup(groupToSave);
    }

    setSelectedGroupId(groupToSave.id);
    setIsGroupModalOpen(false);
  };

  const handleDeleteTemplate = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      if (onDeleteTemplate) onDeleteTemplate(id);
      if (selectedTemplateId === id) {
        const remaining = safeTemplates.filter((t) => t.id !== id);
        if (remaining.length > 0) {
          setSelectedTemplateId(remaining[0].id);
          setCustomText(remaining[0].templateText);
        } else {
          setSelectedTemplateId('');
          setCustomText('');
        }
      }
    }
  };

  const handleDeleteGroup = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete the WhatsApp group "${name}"?`)) {
      if (onDeleteGroup) onDeleteGroup(id);
      if (selectedGroupId === id) {
        const remaining = safeGroups.filter((g) => g.id !== id);
        if (remaining.length > 0) setSelectedGroupId(remaining[0].id);
        else setSelectedGroupId('');
      }
    }
  };

  const filteredTemplates = safeTemplates.filter((t) => {
    if (categoryFilter === 'All') return true;
    return t.category === categoryFilter;
  });

  const filteredMembers = safeMembers.filter((m) =>
    `${m.firstName || ''} ${m.lastName || ''} ${m.phone || ''} ${m.status || ''}`.toLowerCase().includes(searchMemberQuery.toLowerCase())
  );

  const filteredGroups = safeGroups.filter((g) => {
    const matchCat = groupCategoryFilter === 'All' || g.category === groupCategoryFilter;
    const matchSearch = `${g.name} ${g.leaderName || ''} ${g.description || ''}`.toLowerCase().includes(searchGroupQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'Service Reminder':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      case 'Sunday School':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800';
      case 'Prayer Alert':
      case 'Prayer Warriors':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800';
      case 'Attendance Follow-up':
      case 'Youth':
        return 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
      case 'Tithe Receipt':
        return 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800';
      case 'General Announcement':
      case 'General':
        return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div 
        data-theme-surface="dark"
        data-preserve-dark="true"
        className="dark-hero-panel bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden border border-emerald-800/40"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-[#a7f3d0] text-xs font-bold mb-3 border border-emerald-500/30"
              style={{ color: '#a7f3d0' }}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#34d399]" style={{ color: '#34d399' }} />
              <span>WhatsApp Reminders & Automated Broadcast Hub</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white" style={{ color: '#ffffff' }}>
              WhatsApp Messaging, Verse Summaries & Service Reminders
            </h2>
            <div 
              className="text-[#ecfdf5] text-sm mt-1 max-w-xl font-normal leading-relaxed"
              style={{ color: '#ecfdf5' }}
            >
              Dispatch 1-click Sunday School attendance & memory verse summaries to parents, broadcast service reminders to church groups, and shepherd members with personalized pastoral care.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setActiveTabMode('ss_auto');
                handleGenerateSSSummary();
              }}
              className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-purple-600/25 flex items-center gap-2 transition"
            >
              <GraduationCap className="w-4 h-4 stroke-[2.5]" />
              SS Verse Summary
            </button>

            <button
              onClick={() => {
                setActiveTabMode('service_auto');
                handleGenerateServiceBroadcast();
              }}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/25 flex items-center gap-2 transition"
            >
              <Bell className="w-4 h-4 stroke-[2.5]" />
              Service Reminder
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              New Template
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Tab Bar */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900/90 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar scrollbar-none">
        <button
          onClick={() => setActiveTabMode('composer')}
          className={`flex-1 min-w-[170px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            activeTabMode === 'composer'
              ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Composer & Templates ({safeTemplates.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTabMode('ss_auto');
            handleGenerateSSSummary();
          }}
          className={`flex-1 min-w-[210px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            activeTabMode === 'ss_auto'
              ? 'bg-purple-800 dark:bg-purple-700 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4 shrink-0 text-purple-400" />
          <span>Sunday School Verse & Attendance Summary</span>
        </button>

        <button
          onClick={() => {
            setActiveTabMode('service_auto');
            handleGenerateServiceBroadcast();
          }}
          className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            activeTabMode === 'service_auto'
              ? 'bg-amber-700 dark:bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4 shrink-0 text-amber-300" />
          <span>Service Broadcast Reminders</span>
        </button>

        <button
          onClick={() => setActiveTabMode('groups')}
          className={`flex-1 min-w-[170px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
            activeTabMode === 'groups'
              ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>WhatsApp Groups ({safeGroups.length})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Controls & Generator Column */}
        <div className="lg:col-span-2 space-y-5">

          {/* ========================================================================= */}
          {/* TAB 1: SUNDAY SCHOOL ATTENDANCE & VERSE SUMMARY AUTO-GENERATOR */}
          {/* ========================================================================= */}
          {activeTabMode === 'ss_auto' && (
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-purple-200 dark:border-purple-900/40 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Automated Sunday School Attendance & Verse Generator
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Auto-pull attendance headcount, weekly lessons, and memory verses into WhatsApp</p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-extrabold rounded-xl">
                  {safeSSClasses.length} Classes Available
                </span>
              </div>

              {/* Class & Session Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    1. Select Sunday School Class
                  </label>
                  <select
                    value={selectedSSClassId}
                    onChange={(e) => setSelectedSSClassId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  >
                    {safeSSClasses.map((cls) => (
                      <option key={cls.id} value={cls.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {cls.className} ({cls.ageGroup}) — Teacher: {cls.teacherName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    2. Select Attendance Session
                  </label>
                  <select
                    value={selectedSSRecordId}
                    onChange={(e) => setSelectedSSRecordId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="newest" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Latest Recorded Session (Auto-detect)</option>
                    {safeSSAttendance
                      .filter((a) => !selectedSSClassId || a.classId === selectedSSClassId)
                      .map((rec) => (
                        <option key={rec.id} value={rec.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                          {rec.date} — {rec.presentStudentIds?.length || 0} Present • {rec.lessonTaught || 'Lesson'}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Summary Format Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  3. Select Message Format & Audience
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSsSummaryFormat('full_summary')}
                    className={`p-3 rounded-2xl border text-left font-bold transition flex items-start gap-2.5 ${
                      ssSummaryFormat === 'full_summary'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 dark:border-purple-500 text-purple-950 dark:text-purple-200 ring-2 ring-purple-400/20'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${ssSummaryFormat === 'full_summary' ? 'text-purple-700 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <div>
                      <div className="font-extrabold">Complete Class Broadcast</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">Headcount breakdown + Lesson + Memory Verse home action</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSsSummaryFormat('verse_challenge')}
                    className={`p-3 rounded-2xl border text-left font-bold transition flex items-start gap-2.5 ${
                      ssSummaryFormat === 'verse_challenge'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 dark:border-purple-500 text-purple-950 dark:text-purple-200 ring-2 ring-purple-400/20'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <BookOpen className={`w-4 h-4 shrink-0 mt-0.5 ${ssSummaryFormat === 'verse_challenge' ? 'text-purple-700 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <div>
                      <div className="font-extrabold">Memory Verse Challenge</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">Focus on scripture recitation, bedtime challenge & badges</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSsSummaryFormat('parent_update')}
                    className={`p-3 rounded-2xl border text-left font-bold transition flex items-start gap-2.5 ${
                      ssSummaryFormat === 'parent_update'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 dark:border-purple-500 text-purple-950 dark:text-purple-200 ring-2 ring-purple-400/20'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Users className={`w-4 h-4 shrink-0 mt-0.5 ${ssSummaryFormat === 'parent_update' ? 'text-purple-700 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <div>
                      <div className="font-extrabold">Direct Parent Note (Present)</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">Personalized thank you to individual parent for attendance</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSsSummaryFormat('absentee_care')}
                    className={`p-3 rounded-2xl border text-left font-bold transition flex items-start gap-2.5 ${
                      ssSummaryFormat === 'absentee_care'
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 dark:border-purple-500 text-purple-950 dark:text-purple-200 ring-2 ring-purple-400/20'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <HeartHandshake className={`w-4 h-4 shrink-0 mt-0.5 ${ssSummaryFormat === 'absentee_care' ? 'text-purple-700 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <div>
                      <div className="font-extrabold">Absentee Caring Check-in</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">We missed you note with verse so kids don't fall behind</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGenerateSSSummary}
                  className="px-5 py-3 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-purple-700/20 flex items-center gap-2 transition"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Generate & Populate WhatsApp Summary Now
                </button>

                <span className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">
                  ✓ Automatically formats emojis & bold scripture quotes
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SERVICE BROADCAST REMINDER AUTO-GENERATOR */}
          {/* ========================================================================= */}
          {activeTabMode === 'service_auto' && (
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-amber-200 dark:border-amber-900/40 shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Automated Service Broadcast Reminder Generator
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Generate high-engagement service bulletins, livestream links, and prayer reminders</p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-extrabold rounded-xl">
                  {churchServicesList.length} Church Services
                </span>
              </div>

              {/* Service & Preset Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    1. Target Church Gathering
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                  >
                    {churchServicesList.map((srv) => (
                      <option key={srv.id} value={srv.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {srv.name} — {srv.day} ({srv.startTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    2. Broadcast Timing / Theme
                  </label>
                  <select
                    value={serviceBroadcastType}
                    onChange={(e) => setServiceBroadcastType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="sunday_service" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Sunday Morning Worship Service Reminder</option>
                    <option value="midweek_prayer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Wednesday Word & Intercessory Prayer</option>
                    <option value="youth_night" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Friday Youth Fellowship & Praise Night</option>
                    <option value="livestream_alert" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Live Now: YouTube / Stream Broadcast Alert</option>
                    <option value="post_service_followup" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Post-Service Absentee Care & Sermon Replay</option>
                  </select>
                </div>
              </div>

              {/* Custom Meta Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-amber-50/50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Speaker / Preacher</label>
                  <input
                    type="text"
                    value={speakerParam}
                    onChange={(e) => setSpeakerParam(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Livestream URL</label>
                  <input
                    type="text"
                    value={livestreamParam}
                    onChange={(e) => setLivestreamParam(e.target.value)}
                    placeholder="https://youtube.com/@churchlive"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Sanctuary Location</label>
                  <input
                    type="text"
                    value={locationParam}
                    onChange={(e) => setLocationParam(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGenerateServiceBroadcast}
                  className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-600/20 flex items-center gap-2 transition"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  Generate & Populate Service Broadcast
                </button>

                <span className="text-[11px] text-amber-800 dark:text-amber-400 font-medium">
                  ✓ Auto-links to target WhatsApp channels
                </span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: WHATSAPP GROUPS VIEW */}
          {/* ========================================================================= */}
          {activeTabMode === 'groups' && (
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Configured Church WhatsApp Broadcast Channels
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage community channels for Sunday School, Youth, Prayer, and Leadership</p>
                </div>

                <button
                  onClick={handleOpenCreateGroupModal}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Group Channel
                </button>
              </div>

              {/* Group Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar text-xs">
                <button
                  onClick={() => setGroupCategoryFilter('All')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                    groupCategoryFilter === 'All'
                      ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  All ({safeGroups.length})
                </button>
                {GROUP_CATEGORIES.map((cat) => {
                  const count = safeGroups.filter((g) => g.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => setGroupCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                        groupCategoryFilter === cat
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Groups Grid */}
              {filteredGroups.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No WhatsApp groups in this category.</p>
                  <button
                    onClick={handleOpenCreateGroupModal}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow hover:bg-emerald-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Configure First Group
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredGroups.map((grp) => {
                    const isSelected = grp.id === selectedGroupId && targetType === 'group';
                    return (
                      <div
                        key={grp.id}
                        onClick={() => {
                          setSelectedGroupId(grp.id);
                          setTargetType('group');
                        }}
                        className={`p-3.5 rounded-2xl text-left border cursor-pointer transition flex flex-col justify-between group ${
                          isSelected
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(grp.category)}`}>
                              {grp.category}
                            </span>
                            
                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditGroupModal(grp, e)}
                                className="p-1 text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 rounded-lg transition"
                                title="Edit Group"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteGroup && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteGroup(grp.id, grp.name, e)}
                                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/80 rounded-lg transition"
                                  title="Delete Group"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{grp.name}</h4>
                          {grp.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                              {grp.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                            <span>👥 {grp.memberCount || 25} Members</span>
                            <span>•</span>
                            <span>Leader: {grp.leaderName || 'Pastoral Team'}</span>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          <span>{grp.inviteLink ? '🔗 Direct Invite Link' : 'Universal Share'}</span>
                          {isSelected && <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">Active Target ✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TEMPLATE SELECTION CARD (IN COMPOSER MODE) */}
          {/* ========================================================================= */}
          {activeTabMode === 'composer' && (
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Choose WhatsApp Template Presets
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select a pre-built reminder for Sunday School, Worship Service, or Pastoral Care</p>
                </div>

                <button
                  onClick={handleOpenCreateModal}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Template
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar text-xs">
                <button
                  onClick={() => setCategoryFilter('All')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                    categoryFilter === 'All'
                      ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  All ({safeTemplates.length})
                </button>
                {STANDARD_CATEGORIES.map((cat) => {
                  const count = safeTemplates.filter((t) => t.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                        categoryFilter === cat
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Templates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTemplates.map((tpl) => {
                  const isSelected = tpl.id === selectedTemplateId;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setCustomText(tpl.templateText);
                      }}
                      className={`p-3.5 rounded-2xl text-left border cursor-pointer transition flex flex-col justify-between group ${
                        isSelected
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(tpl.category)}`}>
                            {tpl.category}
                          </span>
                          
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(tpl, e)}
                              className="p-1 text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 rounded-lg transition"
                              title="Edit Template"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteTemplate && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTemplate(tpl.id, tpl.title, e)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/80 rounded-lg transition"
                                title="Delete Template"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{tpl.title}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 font-mono">
                          {tpl.templateText}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        <span>Click to load</span>
                        {isSelected && <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">Active ✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ACTIVE MESSAGE BODY & BROADCAST TARGET CONTROLS */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Target WhatsApp Destination & Message
              </h3>

              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTargetType('group')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                    targetType === 'group'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>WhatsApp Group</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('direct')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 ${
                    targetType === 'direct'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Direct Member</span>
                </button>
              </div>
            </div>

            {targetType === 'group' ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Target Church WhatsApp Group Channel
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {safeGroups.map((g) => (
                    <option key={g.id} value={g.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {g.name} ({g.category}) — {g.memberCount || 25} Members
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Recipient Church Member (Direct Send)
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {safeMembers.map((m) => (
                    <option key={m.id} value={m.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {m.firstName} {m.lastName} ({m.phone}) — {m.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Live Message Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Editable WhatsApp Message Text</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">(Formatting with *bold*, _italics_, &gt; quote supported)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setCustomText(activeTemplate?.templateText || '')}
                  className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Reset
                </button>
              </div>
              <textarea
                rows={7}
                value={customText || activeTemplate?.templateText || ''}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono leading-relaxed"
                placeholder="Compose your WhatsApp message..."
              />
            </div>

            {/* Quick Action Dispatch Buttons */}
            {targetType === 'group' ? (
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
                <button
                  onClick={() => handleShareToGroup(activeGroup?.inviteLink)}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition min-w-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-700/80 flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4 text-white shrink-0" />
                  </div>
                  <div className="text-left truncate min-w-0">
                    <div className="text-xs sm:text-sm font-black leading-tight">Broadcast to WhatsApp Group</div>
                    {activeGroup && (
                      <div className="text-[11px] font-medium text-emerald-100/90 truncate">
                        to {activeGroup.name} ({activeGroup.memberCount || 25} members)
                      </div>
                    )}
                  </div>
                </button>

                {activeGroup?.inviteLink && (
                  <button
                    onClick={() => window.open(activeGroup.inviteLink, '_blank')}
                    className="px-4 py-3 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold text-xs rounded-2xl border border-teal-200 dark:border-teal-800 flex items-center justify-center gap-1.5 transition shrink-0"
                    title="Open Group Invite Chat"
                  >
                    <ExternalLink className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                    <span>Open Group</span>
                  </button>
                )}

                <button
                  onClick={handleCopyText}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
                <button
                  onClick={() => handleOpenWhatsApp()}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition min-w-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-700/80 flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4 text-white shrink-0" />
                  </div>
                  <div className="text-left truncate min-w-0">
                    <div className="text-xs sm:text-sm font-black leading-tight">Send via WhatsApp</div>
                    {activeMember && (
                      <div className="text-[11px] font-medium text-emerald-100/90 truncate">
                        to {activeMember.firstName} {activeMember.lastName} • {activeMember.phone}
                      </div>
                    )}
                  </div>
                </button>

                <button
                  onClick={handleCopyText}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Mobile Chat Preview Column */}
        <div className="lg:col-span-1 space-y-5">
          <div 
            data-theme-surface="dark"
            data-preserve-dark="true"
            className="dark-hero-panel bg-emerald-950 p-4 rounded-3xl border border-emerald-800 text-white shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-extrabold flex items-center justify-center text-xs shadow-inner">
                  {targetType === 'group' ? (activeGroup?.name.charAt(0) || 'G') : currentChurch.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white leading-tight truncate" style={{ color: '#ffffff' }}>
                    {targetType === 'group' ? (activeGroup?.name || 'WhatsApp Group') : currentChurch.name}
                  </h4>
                  <div className="text-[10px] text-[#a7f3d0] truncate" style={{ color: '#a7f3d0' }}>
                    {targetType === 'group' ? `${activeGroup?.memberCount || 25} participants • Official Channel` : 'WhatsApp Official Notice'}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#34d399] bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-700 shrink-0" style={{ color: '#34d399' }}>
                {targetType === 'group' ? 'Group Live' : 'Direct Live'}
              </span>
            </div>

            {/* Chat Bubble Container */}
            <div className="bg-[#0b141a] p-4 rounded-2xl min-h-[300px] border border-emerald-900/50 flex flex-col justify-end">
              <div 
                className="bg-[#005c4b] p-3.5 rounded-2xl rounded-tr-none text-xs space-y-2 shadow-md max-w-[96%] ml-auto text-white"
                style={{ color: '#ffffff' }}
              >
                <div 
                  className="whitespace-pre-wrap leading-relaxed font-sans text-white text-[#ffffff]"
                  style={{ color: '#ffffff' }}
                >
                  {finalMessage}
                </div>
                <div className="flex items-center justify-end gap-1 text-[9px] text-[#a7f3d0] font-mono" style={{ color: '#a7f3d0' }}>
                  <span style={{ color: '#a7f3d0' }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-sky-400 font-bold" style={{ color: '#38bdf8' }}>✓✓</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Target List */}
          {targetType === 'group' ? (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Church Group Channels</h4>
                <button
                  onClick={handleOpenCreateGroupModal}
                  className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold hover:underline"
                >
                  + Add Group
                </button>
              </div>

              <input
                type="text"
                placeholder="Search groups or leaders..."
                value={searchGroupQuery}
                onChange={(e) => setSearchGroupQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {filteredGroups.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{g.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{g.category} • {g.memberCount || 25} members</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedGroupId(g.id);
                          setTargetType('group');
                          handleShareToGroup(g.inviteLink);
                        }}
                        className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow"
                        title={`Share broadcast to ${g.name}`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Quick Direct Send</h4>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">{filteredMembers.length} Members</span>
              </div>

              <input
                type="text"
                placeholder="Search member name or phone..."
                value={searchMemberQuery}
                onChange={(e) => setSearchMemberQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {filteredMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{m.firstName} {m.lastName}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{m.phone}</p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedMemberId(m.id);
                        setTargetType('direct');
                        handleOpenWhatsApp(m.phone);
                      }}
                      className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow shrink-0"
                      title={`Send template to ${m.firstName}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODAL 1: CREATE / EDIT WHATSAPP TEMPLATE */}
      {/* ============================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingTemplateId ? 'Edit WhatsApp Template' : 'Create WhatsApp Template'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Configure reminder presets with dynamic tags</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Template Title *</label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. Sunday Morning Fasting Prayer Reminder"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {STANDARD_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-slate-900 text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {modalCategory === 'Custom' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Custom Category Name *</label>
                  <input
                    type="text"
                    required
                    value={modalCustomCategory}
                    onChange={(e) => setModalCustomCategory(e.target.value)}
                    placeholder="e.g. Youth Camp 2026"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Insert Dynamic Tags</label>
                <div className="flex flex-wrap gap-1.5 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 max-h-32 overflow-y-auto">
                  {VARIABLE_TAGS.map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertTag(v.tag)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 hover:border-emerald-500 hover:text-emerald-300 text-slate-300 text-[10px] font-mono font-bold rounded-lg border border-slate-700 transition"
                      title={v.desc}
                    >
                      + {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Message Text Template *</label>
                <textarea
                  ref={modalTextareaRef}
                  required
                  rows={6}
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder="Dear {MemberName}, peace be with you! Join us for service at {ChurchName}..."
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tip: Use standard WhatsApp formatting: <code className="text-emerald-400 font-bold">*bold*</code>, <code className="text-emerald-400 font-bold">_italic_</code>, <code className="text-emerald-400 font-bold">~strikethrough~</code>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingTemplateId ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: CONFIGURE WHATSAPP GROUP */}
      {/* ============================================================= */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingGroupId ? 'Edit WhatsApp Group Channel' : 'Configure WhatsApp Group Channel'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Set up church community & ministry group channels</p>
                </div>
              </div>

              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp Group Name *</label>
                <input
                  type="text"
                  required
                  value={modalGroupName}
                  onChange={(e) => setModalGroupName(e.target.value)}
                  placeholder="e.g. New Creation Church - Youth Fellowship"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Group Ministry / Category</label>
                  <select
                    value={modalGroupCategory}
                    onChange={(e) => setModalGroupCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {GROUP_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-slate-900 text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Leader / Admin Name</label>
                  <input
                    type="text"
                    value={modalGroupLeader}
                    onChange={(e) => setModalGroupLeader(e.target.value)}
                    placeholder="e.g. Pastor David / Bro. John"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>WhatsApp Group Invite Link (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">e.g. https://chat.whatsapp.com/...</span>
                </label>
                <div className="relative">
                  <Link className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="url"
                    value={modalGroupInviteLink}
                    onChange={(e) => setModalGroupInviteLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/J8KL90MNOPQ12345678901"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Estimated Member Count</label>
                  <input
                    type="number"
                    min="1"
                    value={modalGroupMemberCount}
                    onChange={(e) => setModalGroupMemberCount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Group Accent Badge Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={modalGroupColor}
                      onChange={(e) => setModalGroupColor(e.target.value)}
                      className="w-9 h-9 rounded-xl border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-slate-300">{modalGroupColor}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Group Purpose & Description</label>
                <textarea
                  rows={2}
                  value={modalGroupDescription}
                  onChange={(e) => setModalGroupDescription(e.target.value)}
                  placeholder="e.g. Official communication channel for Sunday school parents and weekly memory verse updates."
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingGroupId ? 'Save Group Details' : 'Add WhatsApp Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
