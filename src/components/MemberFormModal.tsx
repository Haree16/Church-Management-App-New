import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Member, MembershipStatus, MinistryRole, AvailabilityDay, FamilyMember, ChurchMinistry } from '../types';
import { 
  X, Plus, Trash2, Save, User, ShieldCheck, HeartHandshake,
  Upload, Camera, Image as ImageIcon, Sparkles, RefreshCw, Check, Link as LinkIcon, CheckCircle2
} from 'lucide-react';
import { UserAvatar } from './common/UserAvatar';
import { DuplicateMemberCheckModal } from './people/DuplicateMemberCheckModal';

interface MemberFormModalProps {
  isOpen: boolean;
  member: Member | null; // null if creating
  existingMembers?: Member[];
  onClose: () => void;
  onSave: (member: Member) => void;
  onSelectExistingMember?: (member: Member) => void;
  currentChurchId?: string;
  ministries?: ChurchMinistry[];
}

const ALL_STATUSES: MembershipStatus[] = [
  'Pastor',
  'Assistant Pastor',
  'Leader',
  'Clergy/Staff',
  'Member',
  'Regular Attender',
  'Visitor',
  'Youth'
];

const ALL_ROLES: MinistryRole[] = [
  'Worship & Music',
  'Hospitality & Welcome',
  "Children's Ministry",
  'Tech & Media',
  'Youth Ministry',
  'Outreach & Missions',
  'Facilities & Setup',
  'Prayer Team'
];

const ALL_AVAILABILITY: AvailabilityDay[] = [
  'Sunday First Service',
  'Sunday Second Service',
  'Wednesday Evening',
  'Saturday Events',
  'On-Call / As Needed'
];

/**
 * Resizes and compresses image to lightweight base64 Data URL
 */
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressedDataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  member,
  existingMembers = [],
  onClose,
  onSave,
  onSelectExistingMember,
  currentChurchId,
  ministries = [],
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [status, setStatus] = useState<MembershipStatus>('Member');
  const [joinedDate, setJoinedDate] = useState(new Date().toISOString().split('T')[0]);
  const [birthdate, setBirthdate] = useState('');
  const [pastoralNotes, setPastoralNotes] = useState('');

  // Duplicate Check State
  const [duplicateCandidates, setDuplicateCandidates] = useState<Member[]>([]);
  const [pendingSavedMember, setPendingSavedMember] = useState<Member | null>(null);

  // Dynamic available ministry roles
  const availableMinistryRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    if (ministries && ministries.length > 0) {
      ministries.forEach((m) => {
        if (m.name) rolesSet.add(m.name);
      });
    }
    if (rolesSet.size === 0) {
      ALL_ROLES.forEach((r) => rolesSet.add(r));
    }
    (member?.ministryTeams || []).forEach((r) => rolesSet.add(r));
    return Array.from(rolesSet);
  }, [ministries, member]);
  
  // Lists
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [ministryTeams, setMinistryTeams] = useState<MinistryRole[]>([]);
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [skillsText, setSkillsText] = useState('');

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Temporary family member state for inline add
  const [newFamName, setNewFamName] = useState('');
  const [newFamRel, setNewFamRel] = useState<'Spouse' | 'Child' | 'Parent' | 'Sibling' | 'Other'>('Spouse');
  const [newFamAge, setNewFamAge] = useState('');

  useEffect(() => {
    if (member) {
      setFirstName(member.firstName || '');
      setLastName(member.lastName || '');
      setEmail(member.email || '');
      setPhone(member.phone || '');
      setAddress(member.address || '');
      setCity(member.city || '');
      setState(member.state || '');
      setZipCode(member.zipCode || '');
      setAvatarUrl(member.avatarUrl || '');
      setStatus(member.status || 'Member');
      setJoinedDate(member.joinedDate || new Date().toISOString().split('T')[0]);
      setBirthdate(member.birthdate || '');
      setPastoralNotes(member.pastoralNotes || '');
      setFamilyMembers(member.familyMembers || []);
      setMinistryTeams(member.ministryTeams || []);
      setAvailability(member.availability || []);
      setSkillsText((member.skills || []).join(', '));
      setCustomUrlInput(member.avatarUrl || '');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCity('Chennai');
      setState('Tamil Nadu');
      setZipCode('');
      setAvatarUrl('');
      setStatus('Member');
      setJoinedDate(new Date().toISOString().split('T')[0]);
      setBirthdate('');
      setPastoralNotes('');
      setFamilyMembers([]);
      setMinistryTeams([]);
      setAvailability([]);
      setSkillsText('');
      setCustomUrlInput('');
    }
    setShowPresetPicker(false);
    setShowUrlInput(false);
    setUploadSuccessMsg('');
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, WEBP, GIF)');
      return;
    }
    try {
      setIsUploading(true);
      const compressedDataUrl = await compressImageFile(file);
      setAvatarUrl(compressedDataUrl);
      setUploadSuccessMsg('Profile photo uploaded and optimized successfully!');
      setTimeout(() => setUploadSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error uploading/compressing image:', err);
      alert('Failed to process image file. Please try a different photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleApplyUrl = () => {
    if (!customUrlInput.trim()) return;
    setAvatarUrl(customUrlInput.trim());
    setShowUrlInput(false);
    setUploadSuccessMsg('Photo URL applied!');
    setTimeout(() => setUploadSuccessMsg(''), 3000);
  };

  const handleAddFamilyMember = () => {
    if (!newFamName.trim()) return;
    const newFam: FamilyMember = {
      id: 'fam-' + Date.now(),
      name: newFamName.trim(),
      relationship: newFamRel,
      age: newFamAge ? parseInt(newFamAge, 10) : undefined
    };
    setFamilyMembers([...familyMembers, newFam]);
    setNewFamName('');
    setNewFamAge('');
  };

  const handleRemoveFamilyMember = (id: string) => {
    setFamilyMembers(familyMembers.filter(f => f.id !== id));
  };

  const toggleMinistryRole = (role: MinistryRole) => {
    if (ministryTeams.includes(role)) {
      setMinistryTeams(ministryTeams.filter(r => r !== role));
    } else {
      setMinistryTeams([...ministryTeams, role]);
    }
  };

  const toggleAvailability = (day: AvailabilityDay) => {
    if (availability.includes(day)) {
      setAvailability(availability.filter(d => d !== day));
    } else {
      setAvailability([...availability, day]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      alert('Please provide both First Name and Last Name.');
      return;
    }

    const skillsArray = skillsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const savedMember: Member = {
      id: member ? member.id : 'mem-' + Date.now(),
      church_id: member?.church_id || member?.churchId || currentChurchId || 'church-1',
      churchId: member?.church_id || member?.churchId || currentChurchId || 'church-1',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim() || 'Chennai',
      state: state.trim() || 'Tamil Nadu',
      zipCode: zipCode.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
      status,
      joinedDate: joinedDate || new Date().toISOString().split('T')[0],
      birthdate: birthdate || undefined,
      familyMembers,
      ministryTeams,
      availability,
      skills: skillsArray,
      pastoralNotes: pastoralNotes.trim(),
      isPrivateNotes: true,
      createdAt: member ? member.createdAt : new Date().toISOString()
    };

    // Duplicate member check when creating new member
    if (!member && existingMembers && existingMembers.length > 0) {
      const normPhone = phone.trim().replace(/\D/g, '');
      const normEmail = email.trim().toLowerCase();
      const normName = `${firstName.trim()} ${lastName.trim()}`.toLowerCase();

      const duplicates = existingMembers.filter((m) => {
        if (m.id === savedMember.id) return false;
        const mPhone = (m.phone || '').replace(/\D/g, '');
        const mEmail = (m.email || '').toLowerCase();
        const mName = `${m.firstName || ''} ${m.lastName || ''}`.trim().toLowerCase();

        const phoneMatch = normPhone.length >= 7 && mPhone.length >= 7 && (normPhone === mPhone || normPhone.endsWith(mPhone) || mPhone.endsWith(normPhone));
        const emailMatch = normEmail.length >= 4 && mEmail.length >= 4 && normEmail === mEmail;
        const nameMatch = normName.length >= 3 && mName.length >= 3 && normName === mName;

        return Boolean(phoneMatch || emailMatch || nameMatch);
      });

      if (duplicates.length > 0 && duplicateCandidates.length === 0) {
        setPendingSavedMember(savedMember);
        setDuplicateCandidates(duplicates);
        return;
      }
    }

    onSave(savedMember);
    onClose();
  };

  const initials = `${firstName[0] || 'M'}${lastName[0] || 'D'}`;

  return (
    <>
      {duplicateCandidates.length > 0 && pendingSavedMember && (
        <DuplicateMemberCheckModal
          isOpen={true}
          duplicateCandidates={duplicateCandidates}
          onClose={() => {
            setDuplicateCandidates([]);
            setPendingSavedMember(null);
          }}
          onProceedAnyway={() => {
            if (pendingSavedMember) {
              onSave(pendingSavedMember);
              setDuplicateCandidates([]);
              setPendingSavedMember(null);
              onClose();
            }
          }}
          onReviewExisting={(existing: Member) => {
            setDuplicateCandidates([]);
            setPendingSavedMember(null);
            onClose();
            if (onSelectExistingMember) {
              onSelectExistingMember(existing);
            }
          }}
        />
      )}
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Modal Header */}
        <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold">
              {member ? `Edit Member: ${member.firstName} ${member.lastName}` : 'Add New Church Member'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-6 overflow-y-auto flex-1 text-xs sm:text-sm">
          
          {/* PROFILE PHOTO UPLOAD SECTION */}
          <div className="bg-slate-800/80 p-4 sm:p-5 rounded-2xl border border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-400" />
                Member Profile Photo
              </h3>
              {avatarUrl && (
                <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Photo Attached
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Photo Avatar Preview & Clickable Upload Box */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative group cursor-pointer w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 transition shrink-0 flex items-center justify-center shadow-md ${
                  isDragOver 
                    ? 'border-amber-500 bg-amber-950/50 ring-4 ring-amber-400/30' 
                    : avatarUrl 
                    ? 'border-amber-400 bg-slate-900' 
                    : 'border-dashed border-slate-600 bg-slate-850 hover:bg-slate-750'
                }`}
                title="Click or Drag & Drop to upload photo"
              >
                {avatarUrl && avatarUrl.trim() ? (
                  <img
                    src={avatarUrl.trim()}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-center w-full h-full">
                    <UserAvatar
                      name={`${firstName} ${lastName}`.trim() || 'Member'}
                      avatarUrl={null}
                      size="lg"
                      shape="rounded"
                      className="mb-1"
                    />
                    <span className="text-[10px] font-bold text-amber-800 flex items-center gap-0.5">
                      <Upload className="w-3 h-3" /> Upload
                    </span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white p-1 text-center">
                  <Camera className="w-5 h-5 mb-1 text-amber-300" />
                  <span className="text-[10px] font-bold">Change Photo</span>
                </div>

                {isUploading && (
                  <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center text-white">
                    <RefreshCw className="w-5 h-5 animate-spin text-amber-400 mb-1" />
                    <span className="text-[10px]">Processing...</span>
                  </div>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Upload Controls */}
              <div className="flex-1 space-y-2.5 w-full text-center sm:text-left">
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {member ? 'Update Member Picture' : 'Upload Member Photo'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Upload from device, browse from camera roll, choose curated preset, or paste image URL.
                  </p>
                </div>

                {uploadSuccessMsg && (
                  <div className="text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800 p-2 rounded-xl flex items-center gap-1.5">
                    <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{uploadSuccessMsg}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUrlInput(!showUrlInput);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Image URL</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl('');
                        setCustomUrlInput('');
                        setUploadSuccessMsg('Photo removed. Initials will be used.');
                        setTimeout(() => setUploadSuccessMsg(''), 3000);
                      }}
                      className="px-2.5 py-1.5 text-rose-400 hover:bg-rose-950/50 border border-rose-800/80 font-medium rounded-xl text-xs flex items-center gap-1 transition"
                      title="Remove profile photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Custom URL Input */}
                {showUrlInput && (
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 shadow-sm space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">Paste Image Web Link:</span>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(false)}
                        className="text-slate-400 hover:text-slate-200 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/... or web image url"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        className="flex-1 p-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyUrl}
                        className="px-3 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Basic Contact Info */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400">
              Personal & Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-200 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. John"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Doe"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-200 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rajesh.k@example.in"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="42 MG Road, Indiranagar"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-slate-200 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-200 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-200 mb-1">PIN Code</label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="600040"
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Membership Status & Dates */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400">
              Church Status & Dates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-200 mb-1">Membership Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MembershipStatus)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {ALL_STATUSES.map(st => (
                    <option key={st} value={st} className="bg-slate-900 text-white">{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">Joined Date</label>
                <input
                  type="date"
                  value={joinedDate}
                  onChange={(e) => setJoinedDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">Birthdate</label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Family & Household Members */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400">
              Household / Family Members
            </h3>

            {familyMembers.length > 0 && (
              <div className="space-y-1.5">
                {familyMembers.map((fam) => (
                  <div key={fam.id} className="flex items-center justify-between bg-slate-800 p-2.5 rounded-xl border border-slate-700">
                    <span className="font-medium text-slate-200">
                      {fam.name} ({fam.relationship} {fam.age ? `- ${fam.age} yrs` : ''})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFamilyMember(fam.id)}
                      className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-950/40 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
              <input
                type="text"
                placeholder="Family member name"
                value={newFamName}
                onChange={(e) => setNewFamName(e.target.value)}
                className="p-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl text-xs flex-1 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <select
                value={newFamRel}
                onChange={(e) => setNewFamRel(e.target.value as any)}
                className="p-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="Spouse" className="bg-slate-900 text-white">Spouse</option>
                <option value="Child" className="bg-slate-900 text-white">Child</option>
                <option value="Parent" className="bg-slate-900 text-white">Parent</option>
                <option value="Sibling" className="bg-slate-900 text-white">Sibling</option>
                <option value="Other" className="bg-slate-900 text-white">Other</option>
              </select>
              <input
                type="number"
                placeholder="Age"
                value={newFamAge}
                onChange={(e) => setNewFamAge(e.target.value)}
                className="p-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl text-xs w-16 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddFamilyMember}
                className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-xl text-xs hover:bg-slate-700 hover:text-white shrink-0 transition"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Volunteer Ministry Teams & Availability */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-amber-400" />
              Volunteer Teams & Availability
            </h3>

            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">Ministry Team Involvement</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableMinistryRoles.map((role) => {
                  const isChecked = ministryTeams.includes(role as any);
                  const matchedMin = (ministries || []).find(
                    (m) => m.name.toLowerCase().trim() === role.toLowerCase().trim()
                  );
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleMinistryRole(role as any)}
                      className={`p-2.5 rounded-xl text-xs text-left border transition flex flex-col justify-between gap-1 ${
                        isChecked
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold shadow-2xs'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">
                          {isChecked ? '✓ ' : '+ '}
                          {role}
                        </span>
                      </div>
                      {matchedMin?.leaderName && (
                        <span className="text-[10px] text-slate-400 truncate font-normal">
                          👑 {matchedMin.leaderName}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1.5">Volunteer Availability</label>
              <div className="flex flex-wrap gap-2">
                {ALL_AVAILABILITY.map((day) => {
                  const isChecked = availability.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleAvailability(day)}
                      className={`px-3 py-1.5 rounded-xl text-xs border transition ${
                        isChecked
                          ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}{day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-200 mb-1">Special Skills / Talents (comma separated)</label>
              <input
                type="text"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="e.g. Guitar, Sound Mixer, First Aid, CPR, Baking"
                className="w-full p-2.5 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pastoral & Care Notes */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Confidential Pastoral Notes
            </h3>
            <textarea
              rows={3}
              value={pastoralNotes}
              onChange={(e) => setPastoralNotes(e.target.value)}
              placeholder="Care updates, prayer interests, discipleship goals (visible to staff/leaders only)..."
              className="w-full p-2.5 bg-slate-800 border border-amber-900/40 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-white placeholder:text-slate-500"
            />
          </div>

          {/* Submit Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>{member ? 'Save Changes' : 'Create Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};
