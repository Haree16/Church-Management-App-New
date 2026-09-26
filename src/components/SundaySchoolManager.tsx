import React, { useState } from 'react';
import { SundaySchoolClass, SundaySchoolStudent, SundaySchoolAttendanceRecord, SaaSUser, WhatsAppGroup } from '../types';
import { 
  GraduationCap, Award, BookOpen, UserPlus, Phone, MessageSquare, Send, Copy, Share2, 
  Check, Sparkles, Plus, AlertCircle, Trash2, AlertTriangle, Edit3, Save, X,
  ClipboardCheck, Calendar, Users, CheckCircle2, XCircle, History, UserCheck,
  Smile, ExternalLink, FileText, ChevronRight, HeartHandshake
} from 'lucide-react';
import { UserAvatar } from './common/UserAvatar';

interface SundaySchoolManagerProps {
  classes?: SundaySchoolClass[];
  students?: SundaySchoolStudent[];
  attendanceRecords?: SundaySchoolAttendanceRecord[];
  groups?: WhatsAppGroup[];
  currentChurchId?: string;
  churchName?: string;
  currentUser?: SaaSUser | null;
  canManageSundaySchool?: boolean;
  onSaveClass?: (cls: SundaySchoolClass) => void;
  onAddClass: (newCls: SundaySchoolClass) => void;
  onSaveStudent?: (stud: SundaySchoolStudent) => void;
  onAddStudent: (newStud: SundaySchoolStudent) => void;
  onAwardBadge: (studentId: string, badgeName: string) => void;
  onDeleteStudent?: (studentId: string) => void;
  onDeleteClass?: (classId: string) => void;
  onSaveAttendance?: (record: SundaySchoolAttendanceRecord) => void;
  onDeleteAttendance?: (attendanceId: string) => void;
}

export const SundaySchoolManager: React.FC<SundaySchoolManagerProps> = ({
  classes = [],
  students = [],
  attendanceRecords = [],
  groups = [],
  currentChurchId = 'church-1',
  churchName = 'New Creation Assembly Church',
  currentUser,
  canManageSundaySchool = true,
  onSaveClass,
  onAddClass,
  onSaveStudent,
  onAddStudent,
  onAwardBadge,
  onDeleteStudent,
  onDeleteClass,
  onSaveAttendance,
  onDeleteAttendance,
}) => {
  // Navigation / View state
  const [activeView, setActiveView] = useState<'roster' | 'history'>('roster');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  
  // Modals state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  
  const [studentToDelete, setStudentToDelete] = useState<SundaySchoolStudent | null>(null);
  const [classToDelete, setClassToDelete] = useState<SundaySchoolClass | null>(null);
  const [attendanceToDelete, setAttendanceToDelete] = useState<SundaySchoolAttendanceRecord | null>(null);
  const [viewingAttendanceRecord, setViewingAttendanceRecord] = useState<SundaySchoolAttendanceRecord | null>(null);

  // Student Form State (Add & Edit)
  const [studentName, setStudentName] = useState('');
  const [age, setAge] = useState<number>(7);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [studentClassId, setStudentClassId] = useState<string>('');

  // Class Form State (Add & Edit)
  const [className, setClassName] = useState('');
  const [ageGroup, setAgeGroup] = useState('Ages 5 - 8 yrs');
  const [teacherName, setTeacherName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [roomNumber, setRoomNumber] = useState('Kids Annex A');
  const [currentLesson, setCurrentLesson] = useState('');
  const [memoryVerse, setMemoryVerse] = useState('');

  // Attendance Form State
  const [attendanceClassId, setAttendanceClassId] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [presentStudentIds, setPresentStudentIds] = useState<string[]>([]);
  const [guestCount, setGuestCount] = useState<number>(0);
  const [lessonTaught, setLessonTaught] = useState<string>('');
  const [attendanceMemoryVerse, setAttendanceMemoryVerse] = useState<string>('');
  const [attendanceNotes, setAttendanceNotes] = useState<string>('');

  const [newBadgeInput, setNewBadgeInput] = useState<{ [key: string]: string }>({});

  const safeClasses = classes || [];
  const safeStudents = students || [];
  const safeAttendance = attendanceRecords || [];
  const safeGroups = groups || [];
  const [isSSWhatsAppModalOpen, setIsSSWhatsAppModalOpen] = useState(false);
  const [activeSummaryRecord, setActiveSummaryRecord] = useState<SundaySchoolAttendanceRecord | null>(null);
  const [activeSummaryClass, setActiveSummaryClass] = useState<SundaySchoolClass | null>(null);
  const [ssSummaryMode, setSsSummaryMode] = useState<'full_summary' | 'verse_challenge' | 'absentee_care'>('full_summary');
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState<string>('');
  const [ssWhatsAppText, setSsWhatsAppText] = useState('');
  const [ssCopied, setSsCopied] = useState(false);

  const getTargetSSGroup = () => {
    return safeGroups.find((g) => g.category === 'Sunday School' || g.name.toLowerCase().includes('sunday school')) || safeGroups[0];
  };

  const generateSSBroadcastMessage = (
    cls: SundaySchoolClass | undefined,
    record: SundaySchoolAttendanceRecord | null,
    mode: 'full_summary' | 'verse_challenge' | 'absentee_care'
  ): string => {
    const classNameStr = cls?.className || record?.className || 'Sunday School';
    const teacherStr = record?.recordedBy || cls?.teacherName || 'Sunday School Teacher';
    const lessonStr = record?.lessonTaught || cls?.currentLesson || 'God is Love';
    const verseStr = record?.memoryVerse || cls?.memoryVerse || 'John 3:16';
    const dateStr = record?.date
      ? new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const presentCount = record?.presentStudentIds?.length || 0;
    const absentCount = record?.absentStudentIds?.length || 0;
    const guestCount = record?.guestCount || 0;

    if (mode === 'full_summary') {
      return `🌟 *${churchName} - Sunday School Weekly Attendance & Verse Summary*\n\n` +
        `Dear Parents & Church Family,\n\n` +
        `Praise the Lord for a joyful and blessed Sunday School session today in *${classNameStr}* (${cls?.ageGroup || 'Children'})!\n\n` +
        `📊 *Session Overview (${dateStr}):*\n` +
        `• Total Present: *${presentCount} children*\n` +
        `• Absent: *${absentCount} children*\n` +
        (guestCount > 0 ? `• First-Time Guests: *+${guestCount} children*\n` : '') +
        `• Teacher / Leader: *${teacherStr}*\n\n` +
        `📖 *Lesson of the Week:*\n` +
        `*${lessonStr}*\n\n` +
        `📜 *Memory Verse of the Week:*\n` +
        `> "${verseStr}"\n\n` +
        (record?.notes ? `📝 *Teacher's Note:* ${record.notes}\n\n` : '') +
        `🎯 *Home Action:* Please practice this verse with your child at home this week! Children who recite next Sunday will receive a badge.\n\n` +
        `_“Train up a child in the way he should go, and when he is old he will not depart from it.” — Proverbs 22:6_\n\n` +
        `Blessings,\n*${teacherStr}* • ${churchName}`;
    } else if (mode === 'verse_challenge') {
      return `📖 *Weekly Memory Verse Challenge | ${classNameStr}*\n\n` +
        `Dear Parents of ${churchName},\n\n` +
        `Here is this week's memory verse for our Sunday School students:\n\n` +
        `✨ *"${verseStr}"*\n\n` +
        `📚 *Lesson Theme:* ${lessonStr}\n` +
        `🗓️ *Target Sunday:* Next Sunday Service\n\n` +
        `🏆 *Challenge:* Please practice reciting this verse 3 times before bed with your child each night. Let's hide God's Word in their hearts!\n\n` +
        `With prayers,\n*${teacherStr}* • ${churchName}`;
    } else {
      return `Dear Parents of ${churchName},\n\n` +
        `Warm greetings from *${churchName}* Sunday School! We missed having your child in *${classNameStr}* class today.\n\n` +
        `Here is today's lesson and memory verse so your child can stay on track at home:\n` +
        `📖 *Lesson:* ${lessonStr}\n` +
        `📜 *Memory Verse:* "${verseStr}"\n\n` +
        `We prayed for you and your family today and look forward to seeing you next Sunday!\n\n` +
        `In Christ,\n*${teacherStr}*`;
    }
  };

  const handleOpenSSWhatsAppModal = (
    record: SundaySchoolAttendanceRecord | null,
    targetClass?: SundaySchoolClass,
    initialMode: 'full_summary' | 'verse_challenge' | 'absentee_care' = 'full_summary'
  ) => {
    const cls = targetClass || safeClasses.find((c) => c.id === record?.classId) || activeClass;
    setActiveSummaryRecord(record);
    setActiveSummaryClass(cls || null);
    setSsSummaryMode(initialMode);

    const defaultGroup = getTargetSSGroup();
    setSelectedTargetGroupId(defaultGroup?.id || safeGroups[0]?.id || '');

    const msg = generateSSBroadcastMessage(cls, record, initialMode);
    setSsWhatsAppText(msg);
    setIsSSWhatsAppModalOpen(true);
  };

  const handleSummaryModeChange = (newMode: 'full_summary' | 'verse_challenge' | 'absentee_care') => {
    setSsSummaryMode(newMode);
    const msg = generateSSBroadcastMessage(activeSummaryClass || activeClass, activeSummaryRecord, newMode);
    setSsWhatsAppText(msg);
  };

  const handleDispatchSSWhatsApp = () => {
    navigator.clipboard.writeText(ssWhatsAppText);
    setSsCopied(true);
    setTimeout(() => setSsCopied(false), 3000);

    const targetGroup = safeGroups.find((g) => g.id === selectedTargetGroupId) || getTargetSSGroup();
    const encoded = encodeURIComponent(ssWhatsAppText);
    const targetUrl = targetGroup?.inviteLink && targetGroup.inviteLink.startsWith('http')
      ? targetGroup.inviteLink
      : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(targetUrl, '_blank');
  };

  const handleCopySSWhatsAppText = () => {
    navigator.clipboard.writeText(ssWhatsAppText);
    setSsCopied(true);
    setTimeout(() => setSsCopied(false), 2000);
  };

  
  const activeClass = safeClasses.find((c) => c.id === selectedClassId) || safeClasses[0];
  const classStudents = safeStudents.filter((s) => s.classId === activeClass?.id);
  
  // Filter attendance records by active class or all
  const filteredAttendance = safeAttendance.filter((a) => !activeClass || a.classId === activeClass?.id);

  // --- Handlers: Class Modal ---
  const handleOpenAddClassModal = () => {
    setEditingClassId(null);
    setClassName('');
    setAgeGroup('Ages 5 - 8 yrs');
    setTeacherName(currentUser?.name || '');
    setTeacherPhone('');
    setRoomNumber('Kids Annex A');
    setCurrentLesson('');
    setMemoryVerse('');
    setIsClassModalOpen(true);
  };

  const handleOpenEditClassModal = (cls: SundaySchoolClass) => {
    setEditingClassId(cls.id);
    setClassName(cls.className || '');
    setAgeGroup(cls.ageGroup || 'Ages 5 - 8 yrs');
    setTeacherName(cls.teacherName || '');
    setTeacherPhone(cls.teacherPhone || '');
    setRoomNumber(cls.roomNumber || 'Room 1');
    setCurrentLesson(cls.currentLesson || '');
    setMemoryVerse(cls.memoryVerse || '');
    setIsClassModalOpen(true);
  };

  const handleSaveClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;

    const classPayload: SundaySchoolClass = {
      id: editingClassId || `ss-cls-${Date.now()}`,
      churchId: activeClass?.churchId || currentChurchId || 'church-1',
      church_id: activeClass?.church_id || currentChurchId || 'church-1',
      className: className.trim(),
      ageGroup: ageGroup.trim() || 'Ages 5 - 8 yrs',
      teacherName: teacherName.trim() || 'Sunday School Teacher',
      teacherPhone: teacherPhone.trim() || '+91 98765 00000',
      roomNumber: roomNumber.trim() || 'Room 1',
      currentLesson: currentLesson.trim() || 'Love One Another',
      memoryVerse: memoryVerse.trim() || 'John 13:34',
    };

    if (onSaveClass) {
      onSaveClass(classPayload);
    } else {
      onAddClass(classPayload);
    }

    setSelectedClassId(classPayload.id);
    setIsClassModalOpen(false);
    setEditingClassId(null);
  };

  // --- Handlers: Student Modal ---
  const handleOpenAddStudentModal = () => {
    setEditingStudentId(null);
    setStudentName('');
    setAge(7);
    setParentName('');
    setParentPhone('');
    setMedicalNotes('');
    setStudentClassId(activeClass?.id || safeClasses[0]?.id || '');
    setIsAddStudentOpen(true);
  };

  const handleOpenEditStudentModal = (stud: SundaySchoolStudent) => {
    setEditingStudentId(stud.id);
    setStudentName(stud.studentName || '');
    setAge(stud.age || 7);
    setParentName(stud.parentName || '');
    setParentPhone(stud.parentPhone || '');
    setMedicalNotes(stud.allergiesMedicalNotes || '');
    setStudentClassId(stud.classId || activeClass?.id || safeClasses[0]?.id || '');
    setIsAddStudentOpen(true);
  };

  const handleSaveStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;

    const targetCls = safeClasses.find((c) => c.id === studentClassId) || activeClass;
    const existingStud = editingStudentId ? safeStudents.find((s) => s.id === editingStudentId) : null;

    const studentPayload: SundaySchoolStudent = {
      id: editingStudentId || `ss-stud-${Date.now()}`,
      churchId: targetCls?.churchId || currentChurchId || 'church-1',
      church_id: targetCls?.church_id || currentChurchId || 'church-1',
      classId: studentClassId || activeClass?.id || safeClasses[0]?.id || '',
      studentName: studentName.trim(),
      age: Number(age),
      parentName: parentName.trim() || 'Parent',
      parentPhone: parentPhone.trim() || '+91 98765 00000',
      allergiesMedicalNotes: medicalNotes.trim() || undefined,
      attendancePresentCount: existingStud?.attendancePresentCount ?? 1,
      badges: existingStud?.badges ?? ['Welcome Gift'],
    };

    if (onSaveStudent) {
      onSaveStudent(studentPayload);
    } else {
      onAddStudent(studentPayload);
    }

    setIsAddStudentOpen(false);
    setEditingStudentId(null);
    setStudentName('');
    setParentName('');
    setParentPhone('');
    setMedicalNotes('');
  };

  // --- Handlers: Take Attendance Modal ---
  const handleOpenTakeAttendanceModal = (targetClass?: SundaySchoolClass) => {
    const cls = targetClass || activeClass || safeClasses[0];
    const clsId = cls?.id || '';
    const classStudentsList = safeStudents.filter((s) => s.classId === clsId);
    
    setAttendanceClassId(clsId);
    setAttendanceDate(new Date().toISOString().split('T')[0]);
    // By default mark all enrolled students as present for convenience
    setPresentStudentIds(classStudentsList.map((s) => s.id));
    setGuestCount(0);
    setLessonTaught(cls?.currentLesson || 'God is Good');
    setAttendanceMemoryVerse(cls?.memoryVerse || 'John 3:16');
    setAttendanceNotes('');
    setIsAttendanceModalOpen(true);
  };

  const handleAttendanceClassChange = (newClsId: string) => {
    setAttendanceClassId(newClsId);
    const cls = safeClasses.find((c) => c.id === newClsId);
    const classStudentsList = safeStudents.filter((s) => s.classId === newClsId);
    setPresentStudentIds(classStudentsList.map((s) => s.id));
    if (cls) {
      setLessonTaught(cls.currentLesson || '');
      setAttendanceMemoryVerse(cls.memoryVerse || '');
    }
  };

  const toggleStudentAttendance = (studId: string) => {
    if (presentStudentIds.includes(studId)) {
      setPresentStudentIds(presentStudentIds.filter((id) => id !== studId));
    } else {
      setPresentStudentIds([...presentStudentIds, studId]);
    }
  };

  const handleMarkAllPresent = () => {
    const classStudentsList = safeStudents.filter((s) => s.classId === attendanceClassId);
    setPresentStudentIds(classStudentsList.map((s) => s.id));
  };

  const handleMarkAllAbsent = () => {
    setPresentStudentIds([]);
  };

  const handleSaveAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceClassId || !attendanceDate) return;

    const targetCls = safeClasses.find((c) => c.id === attendanceClassId);
    const targetStudents = safeStudents.filter((s) => s.classId === attendanceClassId);
    const absentIds = targetStudents.filter((s) => !presentStudentIds.includes(s.id)).map((s) => s.id);

    const record: SundaySchoolAttendanceRecord = {
      id: `ss-att-${Date.now()}`,
      churchId: targetCls?.churchId || currentChurchId || 'church-1',
      church_id: targetCls?.church_id || currentChurchId || 'church-1',
      classId: attendanceClassId,
      className: targetCls?.className || 'Sunday School',
      date: attendanceDate,
      presentStudentIds: presentStudentIds,
      absentStudentIds: absentIds,
      guestCount: Math.max(0, Number(guestCount) || 0),
      lessonTaught: lessonTaught.trim() || targetCls?.currentLesson || 'Lesson of the Week',
      memoryVerse: attendanceMemoryVerse.trim() || targetCls?.memoryVerse || '',
      notes: attendanceNotes.trim() || undefined,
      recordedBy: currentUser?.name || targetCls?.teacherName || 'Sunday School Teacher',
      createdAt: new Date().toISOString()
    };

    if (onSaveAttendance) {
      onSaveAttendance(record);
    }

    setIsAttendanceModalOpen(false);
    setActiveView('history');
  };

  const handleAddBadgeSubmit = (studentId: string) => {
    const badgeText = newBadgeInput[studentId]?.trim();
    if (badgeText) {
      onAwardBadge(studentId, badgeText);
      setNewBadgeInput({ ...newBadgeInput, [studentId]: '' });
    }
  };

  // Compute session roll-call target students for attendance modal
  const modalTargetStudents = safeStudents.filter((s) => s.classId === attendanceClassId);
  const modalPresentCount = presentStudentIds.length;
  const modalAbsentCount = modalTargetStudents.length - modalPresentCount;

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div 
        data-theme-surface="dark"
        data-preserve-dark="true"
        className="dark-hero-panel bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden border border-purple-800/40"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-[#e9d5ff] text-xs font-bold mb-3 border border-purple-500/30"
              style={{ color: '#e9d5ff' }}
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#c084fc]" style={{ color: '#c084fc' }} />
              <span>Sunday School & Children's Ministry</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white" style={{ color: '#ffffff' }}>
              Nurturing Young Disciples in Christ
            </h2>
            <div 
              className="text-[#f3e8ff] text-sm mt-1 max-w-xl font-normal leading-relaxed"
              style={{ color: '#f3e8ff' }}
            >
              Track student attendance, roll-call weekly sessions, award spiritual badges, and update parents on WhatsApp.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canManageSundaySchool && (
              <button
                onClick={() => handleOpenTakeAttendanceModal()}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5"
              >
                <ClipboardCheck className="w-4 h-4" />
                Take Attendance
              </button>
            )}

            {canManageSundaySchool && (
              <button
                onClick={handleOpenAddClassModal}
                className="px-3.5 py-2.5 bg-purple-900/60 hover:bg-purple-900 text-white font-bold text-xs rounded-xl border border-purple-400/30 transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Class
              </button>
            )}

            <button
              onClick={handleOpenAddStudentModal}
              className="px-3.5 py-2.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Enroll Student
            </button>
          </div>
        </div>
      </div>

      {/* Main View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none max-w-full pb-0.5">
          <button
            onClick={() => setActiveView('roster')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeView === 'roster'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Class Roster ({safeStudents.length})</span>
          </button>

          <button
            onClick={() => setActiveView('history')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeView === 'history'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span>Attendance Records ({safeAttendance.length})</span>
          </button>
        </div>

        {activeView === 'history' && canManageSundaySchool && (
          <button
            onClick={() => handleOpenTakeAttendanceModal()}
            className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-white" />
            <span>+ Record Attendance</span>
          </button>
        )}
      </div>

      {/* Class Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none py-0.5">
        {safeClasses.map((cls) => {
          const isSelected = cls.id === activeClass?.id;
          const clsStudentCount = safeStudents.filter((s) => s.classId === cls.id).length;
          return (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition border flex items-center gap-2 ${
                isSelected
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{cls.className}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isSelected ? 'bg-purple-700 text-purple-100' : 'bg-slate-800 text-slate-400'}`}>
                {clsStudentCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* VIEW 1: CLASS ROSTER & ENROLLED STUDENTS */}
      {activeView === 'roster' && activeClass && (
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-purple-300 bg-purple-950/80 border border-purple-800 px-2.5 py-0.5 rounded-full">
                  {activeClass.ageGroup} • {activeClass.roomNumber}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <h3 className="text-xl font-extrabold text-white">{activeClass.className} Class</h3>

                {canManageSundaySchool && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditClassModal(activeClass)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition"
                    title="Edit Sunday School Class & Teacher Details"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}

                {canManageSundaySchool && onDeleteClass && (
                  <button
                    type="button"
                    onClick={() => setClassToDelete(activeClass)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                    title="Delete Sunday School Class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Teacher Contact Info */}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <p className="text-xs text-slate-400">
                  Teacher: <strong className="text-white font-bold">{activeClass.teacherName}</strong>
                </p>

                {activeClass.teacherPhone && (
                  <a
                    href={`https://wa.me/${activeClass.teacherPhone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(activeClass.teacherName)},%20Sunday%20School%20Update%20for%20${encodeURIComponent(activeClass.className)}:`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/80 px-2 py-0.5 rounded-lg border border-emerald-800 transition"
                    title="WhatsApp / Call Class Teacher"
                  >
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>{activeClass.teacherPhone}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Quick Stats & Action Cards */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="bg-purple-950/40 border border-purple-900/60 p-3.5 rounded-2xl max-w-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-purple-400" /> Memory Verse of the Week
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenSSWhatsAppModal(null, activeClass, 'verse_challenge')}
                      className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/80 px-2 py-0.5 rounded-lg border border-emerald-800 transition"
                      title="Broadcast this weekly memory verse to parents on WhatsApp"
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-400" />
                      <span>WhatsApp Verse</span>
                    </button>

                    {canManageSundaySchool && (
                      <button
                        onClick={() => handleOpenEditClassModal(activeClass)}
                        className="text-[10px] font-bold text-purple-400 hover:text-purple-300 underline"
                      >
                        Edit Verse
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs font-bold text-purple-100 mt-1 italic">"{activeClass.memoryVerse}"</p>
                <p className="text-[10px] text-purple-300 mt-1 font-semibold">Lesson: {activeClass.currentLesson}</p>
              </div>

              {canManageSundaySchool && (
                <button
                  onClick={() => handleOpenTakeAttendanceModal(activeClass)}
                  className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-2xl font-extrabold text-xs shadow-md transition flex flex-col items-center justify-center gap-1 shrink-0"
                >
                  <ClipboardCheck className="w-5 h-5" />
                  <span>Take Attendance</span>
                </button>
              )}
            </div>
          </div>

          {/* Student Roster */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Enrolled Students ({classStudents.length})</h4>
              <span className="text-xs text-slate-400">Sorted by class age</span>
            </div>

            {classStudents.length === 0 ? (
              <div className="text-center py-10 bg-slate-800/60 rounded-2xl border border-dashed border-slate-700 space-y-3">
                <GraduationCap className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">No students enrolled in this class yet.</p>
                <button
                  onClick={handleOpenAddStudentModal}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  + Enroll First Student
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classStudents.map((stud) => (
                  <div key={stud.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 hover:border-purple-500/50 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={stud.studentName}
                          size="md"
                          shape="rounded"
                          border="border border-purple-800 shadow-2xs"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-extrabold text-white">{stud.studentName}</h5>
                            <span className="px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800 text-[10px] font-black">
                              {stud.attendancePresentCount || 0} Attended
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">Age {stud.age} • Parent: {stud.parentName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://wa.me/${stud.parentPhone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(stud.parentName)},%20Sunday%20School%20update%20from%20${encodeURIComponent(churchName)}%20for%20${encodeURIComponent(stud.studentName)}:`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-800 transition"
                          title="WhatsApp Parent"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </a>

                        {canManageSundaySchool && (
                          <button
                            onClick={() => handleOpenEditStudentModal(stud)}
                            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-purple-300 hover:bg-slate-700 transition"
                            title="Edit Student & Parent Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onDeleteStudent && (
                          <button
                            onClick={() => setStudentToDelete(stud)}
                            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                            title="Remove / Delete Enrolled Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {stud.allergiesMedicalNotes && (
                      <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800 text-[11px] text-amber-200 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong className="text-amber-100">Care Notes:</strong> {stud.allergiesMedicalNotes}</span>
                      </div>
                    )}

                    {/* Badges List */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Badges & Honors</span>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(stud.badges || []).map((b, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800">
                            <Award className="w-3 h-3 text-purple-400" /> {b}
                          </span>
                        ))}
                      </div>

                      {/* Add Badge Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Award new badge..."
                          value={newBadgeInput[stud.id] || ''}
                          onChange={(e) => setNewBadgeInput({ ...newBadgeInput, [stud.id]: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <button
                          onClick={() => handleAddBadgeSubmit(stud.id)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-xl shrink-0"
                        >
                          Award
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: ATTENDANCE HISTORY */}
      {activeView === 'history' && (
        <div className="space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400">Total Sessions</span>
              <p className="text-xl font-black text-white mt-0.5">{filteredAttendance.length}</p>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-400">Total Present Kids</span>
              <p className="text-xl font-black text-emerald-400 mt-0.5">
                {filteredAttendance.reduce((acc, a) => acc + (a.presentStudentIds?.length || 0), 0)}
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-indigo-400">Guest / Visitor Kids</span>
              <p className="text-xl font-black text-indigo-400 mt-0.5">
                {filteredAttendance.reduce((acc, a) => acc + (a.guestCount || 0), 0)}
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-purple-400">Active Class</span>
              <p className="text-sm font-extrabold text-white mt-1 truncate">
                {activeClass?.className || 'All Classes'}
              </p>
            </div>
          </div>

          {/* Attendance Records List */}
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  {activeClass ? `${activeClass.className} Attendance Log` : 'All Class Attendance Logs'}
                </h3>
                <p className="text-xs text-slate-400">Weekly session records and parent updates</p>
              </div>

              {canManageSundaySchool && (
                <button
                  onClick={() => handleOpenTakeAttendanceModal(activeClass)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Take Attendance</span>
                </button>
              )}
            </div>

            {filteredAttendance.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/60 rounded-2xl border border-dashed border-slate-700 space-y-3">
                <ClipboardCheck className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-sm font-bold text-slate-300">No attendance sessions recorded yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click "Take Attendance" above to record the roll-call for this Sunday's class.
                </p>
                {canManageSundaySchool && (
                  <button
                    onClick={() => handleOpenTakeAttendanceModal(activeClass)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    Take First Attendance
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAttendance.map((record) => {
                  const presentCount = record.presentStudentIds?.length || 0;
                  const absentCount = record.absentStudentIds?.length || 0;
                  const total = presentCount + absentCount;
                  const pct = total > 0 ? Math.round((presentCount / total) * 100) : 100;

                  return (
                    <div
                      key={record.id}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-purple-500/50 transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-purple-950/80 text-purple-300 border border-purple-800 flex flex-col items-center justify-center font-black shrink-0">
                            <span className="text-xs uppercase">{new Date(record.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-sm leading-none">{new Date(record.date).getDate()}</span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white">
                                {record.className} Class
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                                {presentCount} Present ({pct}%)
                              </span>
                              {record.guestCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                                  +{record.guestCount} Guests
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Recorded by: <strong className="text-white font-bold">{record.recordedBy}</strong></span>
                              <span>•</span>
                              <span>Date: {record.date}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenSSWhatsAppModal(record, undefined, 'full_summary')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                            title="Send Automated Sunday School Attendance & Verse Summary to WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp Summary</span>
                          </button>

                          <button
                            onClick={() => setViewingAttendanceRecord(record)}
                            className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900/80 text-purple-300 font-bold text-xs rounded-xl border border-purple-800 transition flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Roll-Call Details</span>
                          </button>

                          {onDeleteAttendance && canManageSundaySchool && (
                            <button
                              onClick={() => setAttendanceToDelete(record)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition"
                              title="Delete Attendance Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lesson & Verse Chips */}
                      {(record.lessonTaught || record.memoryVerse) && (
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                          {record.lessonTaught && (
                            <p className="text-slate-200 font-medium">
                              <strong className="text-white">Lesson:</strong> {record.lessonTaught}
                            </p>
                          )}
                          {record.memoryVerse && (
                            <p className="text-purple-300 italic font-semibold">
                              <strong className="text-purple-200">Memory Verse:</strong> "{record.memoryVerse}"
                            </p>
                          )}
                          {record.notes && (
                            <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                              <strong className="text-slate-300">Notes:</strong> {record.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: TAKE ATTENDANCE / ROLL CALL */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Sunday School Roll-Call Sheet</h3>
                  <p className="text-[11px] text-slate-400">Record attendance, visitor count & lesson details</p>
                </div>
              </div>

              <button
                onClick={() => setIsAttendanceModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendanceSubmit} className="space-y-4">
              {/* Session Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">Sunday School Class *</label>
                  <select
                    value={attendanceClassId}
                    onChange={(e) => handleAttendanceClassChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold text-white"
                  >
                    {safeClasses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.className} ({c.ageGroup})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">Session Date *</label>
                  <input
                    type="date"
                    required
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Lesson & Memory Verse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">Lesson of the Day</label>
                  <input
                    type="text"
                    value={lessonTaught}
                    onChange={(e) => setLessonTaught(e.target.value)}
                    placeholder="e.g. David & Goliath"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">Memory Verse</label>
                  <input
                    type="text"
                    value={attendanceMemoryVerse}
                    onChange={(e) => setAttendanceMemoryVerse(e.target.value)}
                    placeholder="e.g. 1 Samuel 17:45"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Guest Counter */}
              <div className="flex items-center justify-between p-3 bg-purple-950/40 rounded-2xl border border-purple-900/60">
                <div>
                  <span className="text-xs font-extrabold text-purple-300 block">First-Time Visitor / Guest Kids</span>
                  <span className="text-[11px] text-purple-400">Children visiting without prior registration</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGuestCount(Math.max(0, guestCount - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-800 border border-purple-800 font-black text-purple-300 flex items-center justify-center hover:bg-slate-700 transition"
                  >
                    -
                  </button>
                  <span className="text-sm font-black text-purple-200 w-6 text-center">{guestCount}</span>
                  <button
                    type="button"
                    onClick={() => setGuestCount(guestCount + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-800 border border-purple-800 font-black text-purple-300 flex items-center justify-center hover:bg-slate-700 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Roll-Call Student Roster */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    Student Roll-Call ({modalPresentCount} Present • {modalAbsentCount} Absent)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleMarkAllPresent}
                      className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-800 hover:bg-emerald-900/90 text-emerald-300 text-[10px] font-extrabold rounded-lg transition"
                    >
                      ✓ All Present
                    </button>
                    <button
                      type="button"
                      onClick={handleMarkAllAbsent}
                      className="px-2.5 py-1 bg-rose-950/80 border border-rose-800 hover:bg-rose-900/90 text-rose-300 text-[10px] font-extrabold rounded-lg transition"
                    >
                      ✕ All Absent
                    </button>
                  </div>
                </div>

                {modalTargetStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-800/60 rounded-xl border border-slate-700">
                    No students currently enrolled in this class. You can log guests only or enroll students first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {modalTargetStudents.map((stud) => {
                      const isPresent = presentStudentIds.includes(stud.id);
                      return (
                        <div
                          key={stud.id}
                          onClick={() => toggleStudentAttendance(stud.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                            isPresent
                              ? 'bg-emerald-950/40 border-emerald-800'
                              : 'bg-slate-800/80 border-slate-700 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isPresent ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {isPresent ? '✓' : '✕'}
                            </div>

                            <div>
                              <p className="text-xs font-extrabold text-white">{stud.studentName}</p>
                              <p className="text-[10px] text-slate-400">Age {stud.age} • Parent: {stud.parentName}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                              isPresent ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {isPresent ? 'Present' : 'Absent'}
                            </span>

                            {/* WhatsApp Parent Attendance Confirmation */}
                            <a
                              href={`https://wa.me/${stud.parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                isPresent
                                  ? `Dear ${stud.parentName}, ${stud.studentName} attended Sunday School today at ${churchName}! Lesson: ${lessonTaught} | Verse: ${attendanceMemoryVerse}. God bless!`
                                  : `Dear ${stud.parentName}, we missed ${stud.studentName} at Sunday School today at ${churchName}. Memory Verse for this week: ${attendanceMemoryVerse}. Hope to see you next Sunday!`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-emerald-950 hover:text-emerald-300 text-slate-400 transition"
                              title="Send WhatsApp Update to Parent"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">Session Highlights & Notes</label>
                <textarea
                  rows={2}
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                  placeholder="e.g. 10 kids recited the memory verse, active participation during craft..."
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition text-center"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 shrink-0 text-white" />
                  <span className="truncate">Save & Complete Attendance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW ATTENDANCE SESSION DETAILS & ROLL CALL */}
      {viewingAttendanceRecord && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {viewingAttendanceRecord.className} • {viewingAttendanceRecord.date}
                  </h3>
                  <p className="text-[11px] text-slate-400">Recorded by: {viewingAttendanceRecord.recordedBy}</p>
                </div>
              </div>

              <button
                onClick={() => setViewingAttendanceRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/80">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Present</span>
                <p className="text-base font-black text-emerald-300">{viewingAttendanceRecord.presentStudentIds?.length || 0}</p>
              </div>
              <div className="bg-rose-950/40 p-2.5 rounded-xl border border-rose-800/80">
                <span className="text-[10px] font-bold text-rose-400 uppercase">Absent</span>
                <p className="text-base font-black text-rose-300">{viewingAttendanceRecord.absentStudentIds?.length || 0}</p>
              </div>
              <div className="bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-800/80">
                <span className="text-[10px] font-bold text-indigo-400 uppercase">Guests</span>
                <p className="text-base font-black text-indigo-300">{viewingAttendanceRecord.guestCount || 0}</p>
              </div>
            </div>

            {viewingAttendanceRecord.lessonTaught && (
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-xs space-y-1">
                <p className="text-slate-200"><strong>Lesson:</strong> {viewingAttendanceRecord.lessonTaught}</p>
                {viewingAttendanceRecord.memoryVerse && (
                  <p className="text-purple-300 italic font-semibold">
                    <strong>Memory Verse:</strong> "{viewingAttendanceRecord.memoryVerse}"
                  </p>
                )}
                {viewingAttendanceRecord.notes && (
                  <p className="text-slate-400 text-[11px] pt-1">
                    <strong>Notes:</strong> {viewingAttendanceRecord.notes}
                  </p>
                )}
              </div>
            )}

            {/* Present Students */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Present Students ({viewingAttendanceRecord.presentStudentIds?.length || 0})
              </span>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {(viewingAttendanceRecord.presentStudentIds || []).map((id) => {
                  const s = safeStudents.find((stud) => stud.id === id);
                  if (!s) return null;
                  return (
                    <div key={id} className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-900/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-white">{s.studentName}</span>
                        <span className="text-slate-400 text-[10px] ml-2">Parent: {s.parentName}</span>
                      </div>
                      <a
                        href={`https://wa.me/${s.parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Dear ${s.parentName}, ${s.studentName} attended Sunday School at ${churchName}! Today's lesson was ${viewingAttendanceRecord.lessonTaught || 'God\'s Word'}. Blessings!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800 transition"
                        title="Send WhatsApp update"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Absent Students */}
            {viewingAttendanceRecord.absentStudentIds && viewingAttendanceRecord.absentStudentIds.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" /> Absent Students ({viewingAttendanceRecord.absentStudentIds.length})
                </span>

                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {viewingAttendanceRecord.absentStudentIds.map((id) => {
                    const s = safeStudents.find((stud) => stud.id === id);
                    if (!s) return null;
                    return (
                      <div key={id} className="p-2 rounded-xl bg-rose-950/30 border border-rose-900/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-extrabold text-white">{s.studentName}</span>
                          <span className="text-slate-400 text-[10px] ml-2">Parent: {s.parentName}</span>
                        </div>
                        <a
                          href={`https://wa.me/${s.parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Dear ${s.parentName}, we missed ${s.studentName} at Sunday School today at ${churchName}! Memory Verse: ${viewingAttendanceRecord.memoryVerse || 'God is with you'}. Hope to see you next Sunday!`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg bg-rose-900/60 text-rose-300 hover:bg-rose-800 transition"
                          title="Send Pastoral Care WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  const rec = viewingAttendanceRecord;
                  setViewingAttendanceRecord(null);
                  handleOpenSSWhatsAppModal(rec, undefined, 'full_summary');
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Broadcast Summary to WhatsApp</span>
              </button>

              <button
                onClick={() => setViewingAttendanceRecord(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: STUDENT MODAL (ADD & EDIT) */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-950/70 border border-purple-800/50 text-purple-400 flex items-center justify-center font-bold">
                  {editingStudentId ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingStudentId ? 'Edit Student Details' : 'Enroll Student in Sunday School'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Manage student info, target class, and parent contacts</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setIsAddStudentOpen(false);
                  setEditingStudentId(null);
                }} 
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Child's Name *</label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Leo Kumar"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Age (Years) *</label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Class *</label>
                  <select
                    value={studentClassId}
                    onChange={(e) => setStudentClassId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {safeClasses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.className} ({c.ageGroup})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Parent Name(s)</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="e.g. Rajesh & Sunitha Kumar"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Parent WhatsApp Phone</label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Allergies or Special Care Notes</label>
                <input
                  type="text"
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  placeholder="e.g. Peanut allergy, Asthma inhaler"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddStudentOpen(false);
                    setEditingStudentId(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingStudentId ? 'Save Changes' : 'Complete Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CLASS MODAL (CREATE & EDIT) */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-950/70 border border-purple-800/50 text-purple-400 flex items-center justify-center font-bold">
                  {editingClassId ? <Edit3 className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingClassId ? 'Edit Sunday School Class' : 'Create New Sunday School Class'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Configure class details, age group, teacher & lessons</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setIsClassModalOpen(false);
                  setEditingClassId(null);
                }} 
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Class Name *</label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Little Lambs / Faith Explorers"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Age Group</label>
                  <input
                    type="text"
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    placeholder="e.g. Ages 4 - 7 yrs"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none text-white placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Room / Hall</label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. Room 102 / Annex"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Teacher / Leader Name *</label>
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="e.g. Sister Grace"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Teacher WhatsApp / Phone *</label>
                  <input
                    type="tel"
                    required
                    value={teacherPhone}
                    onChange={(e) => setTeacherPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Lesson of the Week</label>
                <input
                  type="text"
                  value={currentLesson}
                  onChange={(e) => setCurrentLesson(e.target.value)}
                  placeholder="e.g. David & Goliath - Courage in the Lord"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Memory Verse of the Week</label>
                <textarea
                  rows={2}
                  value={memoryVerse}
                  onChange={(e) => setMemoryVerse(e.target.value)}
                  placeholder="e.g. Ephesians 6:11 - Put on the full armor of God..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsClassModalOpen(false);
                    setEditingClassId(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingClassId ? 'Save Changes' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODALS */}
      {/* Delete Student Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4 text-white">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Remove Enrolled Student?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to delete <strong className="text-white">{studentToDelete.studentName}</strong> (Age {studentToDelete.age}) from this Sunday School class?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteStudent) {
                    onDeleteStudent(studentToDelete.id);
                  }
                  setStudentToDelete(null);
                }}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Modal */}
      {classToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4 text-white">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Delete Sunday School Class?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to delete <strong className="text-white">{classToDelete.className}</strong>? Any enrolled students in this class will also be removed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteClass) {
                    onDeleteClass(classToDelete.id);
                  }
                  setClassToDelete(null);
                }}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Attendance Session Modal */}
      {attendanceToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-800 space-y-4 text-white">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Delete Attendance Session?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to delete the attendance record for <strong className="text-white">{attendanceToDelete.className}</strong> on <strong className="text-white">{attendanceToDelete.date}</strong>?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAttendanceToDelete(null)}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAttendance) {
                    onDeleteAttendance(attendanceToDelete.id);
                  }
                  setAttendanceToDelete(null);
                }}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    
      {/* MODAL: SUNDAY SCHOOL WHATSAPP SUMMARY & VERSE BROADCAST */}
      {isSSWhatsAppModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl max-w-xl w-full p-6 space-y-4 border border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-950/70 border border-emerald-800/50 text-emerald-400 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Sunday School WhatsApp Summary & Verse Broadcast
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Auto-formatted bulletin for {activeSummaryClass?.className || activeClass?.className || 'Sunday School'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsSSWhatsAppModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => handleSummaryModeChange('full_summary')}
                className={`flex-1 py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-center ${
                  ssSummaryMode === 'full_summary'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Attendance Summary</span>
              </button>

              <button
                type="button"
                onClick={() => handleSummaryModeChange('verse_challenge')}
                className={`flex-1 py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-center ${
                  ssSummaryMode === 'verse_challenge'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Verse Challenge</span>
              </button>

              <button
                type="button"
                onClick={() => handleSummaryModeChange('absentee_care')}
                className={`flex-1 py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 text-center ${
                  ssSummaryMode === 'absentee_care'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Absentee Recap</span>
              </button>
            </div>

            {/* Target WhatsApp Group */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Church WhatsApp Group Channel
              </label>
              <select
                value={selectedTargetGroupId}
                onChange={(e) => setSelectedTargetGroupId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {safeGroups.map((g) => (
                  <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                    {g.name} ({g.category}) — {g.memberCount || 25} Members
                  </option>
                ))}
              </select>
            </div>

            {/* Formatted Message Preview / Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Formatted WhatsApp Message
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const msg = generateSSBroadcastMessage(activeSummaryClass || activeClass, activeSummaryRecord, ssSummaryMode);
                    setSsWhatsAppText(msg);
                  }}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline"
                >
                  Reset Text
                </button>
              </div>

              <textarea
                rows={8}
                value={ssWhatsAppText}
                onChange={(e) => setSsWhatsAppText(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleDispatchSSWhatsApp}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4" />
                <span>Broadcast to WhatsApp Group</span>
              </button>

              <button
                type="button"
                onClick={handleCopySSWhatsAppText}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition"
              >
                {ssCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{ssCopied ? 'Copied!' : 'Copy Text'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSSWhatsAppModalOpen(false)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
