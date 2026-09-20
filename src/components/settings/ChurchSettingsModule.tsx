import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Clock, Heart, HeartHandshake, Users, UserCheck, UserPlus, Bell, 
  Globe, Palette, ShieldCheck, SlidersHorizontal, Save, RotateCcw, 
  Plus, Trash2, Edit2, Check, X, ChevronUp, ChevronDown, ChevronRight, 
  AlertCircle, CheckCircle2, Shield, Lock, Eye, EyeOff, Sparkles, 
  Coffee, Music, Video, MessageSquare, Phone, Mail, MapPin, 
  Upload, Camera, Image as ImageIcon, ExternalLink, Calendar, 
  GraduationCap, Megaphone, Info, RefreshCw, CheckCheck, Landmark,
  LayoutDashboard, BarChart3
} from 'lucide-react';
import { 
  ChurchTenant, SaaSUser, SaaSUserRole, Member,
  CompleteChurchSettings, ChurchServiceConfig, ChurchMinistryConfig,
  ChurchMemberTypeConfig, ChurchAttendanceTypeConfig, ChurchAttendanceStatusConfig,
  ChurchModuleToggles
} from '../../types';
import { canEditChurchSettings, canAccessChurchSettings, getRoleConfig, canManageSystemPreferences } from '../../utils/rbac';
import { auditService } from '../../services/auditService';
import { AdminNotificationSettingsModule } from '../notifications/AdminNotificationSettingsModule';

export type SettingsSectionId = 
  | 'profile'
  | 'services'
  | 'ministries'
  | 'members'
  | 'attendance'
  | 'notifications'
  | 'localization'
  | 'appearance'
  | 'security'
  | 'preferences';

interface ChurchSettingsModuleProps {
  currentChurch: ChurchTenant;
  currentUser: SaaSUser;
  members: Member[];
  settings: CompleteChurchSettings;
  onSaveSettings: (updated: CompleteChurchSettings) => void;
  onNavigateTab?: (tab: string) => void;
}

const SECTION_METADATA = [
  { id: 'profile' as SettingsSectionId, label: 'Church Profile', icon: Building2, desc: 'Name, logo, address, contact details & preview' },
  { id: 'services' as SettingsSectionId, label: 'Services', icon: Clock, desc: 'Regular worship timings, schedules & locations' },
  { id: 'ministries' as SettingsSectionId, label: 'Ministries', icon: HeartHandshake, desc: 'Church departments, leaders, colors & schedules' },
  { id: 'members' as SettingsSectionId, label: 'Members', icon: Users, desc: 'Member types, titles, statuses & custom fields' },
  { id: 'attendance' as SettingsSectionId, label: 'Attendance', icon: UserCheck, desc: 'Session types, statuses, visitor counts & defaults' },
  { id: 'notifications' as SettingsSectionId, label: 'Notifications', icon: Bell, desc: 'WhatsApp, Email, SMS, Push & trigger preferences' },
  { id: 'localization' as SettingsSectionId, label: 'Localization', icon: Globe, desc: 'Language, currency, timezone & date formats' },
  { id: 'appearance' as SettingsSectionId, label: 'Appearance', icon: Palette, desc: 'Theme, accent palette & header branding styles' },
  { id: 'security' as SettingsSectionId, label: 'Security & Permissions', icon: ShieldCheck, desc: 'Access control, directory privacy & moderation' },
  { id: 'preferences' as SettingsSectionId, label: 'System Preferences', icon: SlidersHorizontal, desc: 'Default landing tab & church module availability' },
];

const MINISTRY_ICON_OPTIONS = [
  { name: 'Music', icon: Music, label: 'Worship / Music' },
  { name: 'Heart', icon: HeartHandshake, label: 'Care / Prayer' },
  { name: 'GraduationCap', icon: GraduationCap, label: 'Sunday School / Kids' },
  { name: 'Sparkles', icon: Sparkles, label: 'Youth / Revival' },
  { name: 'Video', icon: Video, label: 'Media / Tech' },
  { name: 'Globe', icon: Globe, label: 'Missions / Outreach' },
  { name: 'Coffee', icon: Coffee, label: 'Hospitality / Greeter' },
  { name: 'Shield', icon: Shield, label: 'Facilities / Security' },
  { name: 'Megaphone', icon: Megaphone, label: 'Evangelism' },
  { name: 'Users', icon: Users, label: 'Cell Groups / Fellowship' },
];

const COLOR_PALETTE = [
  { hex: '#f59e0b', name: 'Amber Gold', bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-500' },
  { hex: '#10b981', name: 'Emerald Green', bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-500' },
  { hex: '#0284c7', name: 'Sky Blue', bg: 'bg-sky-600', border: 'border-sky-600', text: 'text-sky-600' },
  { hex: '#6366f1', name: 'Indigo Royal', bg: 'bg-indigo-600', border: 'border-indigo-600', text: 'text-indigo-600' },
  { hex: '#8b5cf6', name: 'Purple Spirit', bg: 'bg-purple-600', border: 'border-purple-600', text: 'text-purple-600' },
  { hex: '#f43f5e', name: 'Rose Red', bg: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-500' },
  { hex: '#0d9488', name: 'Teal Grace', bg: 'bg-teal-600', border: 'border-teal-600', text: 'text-teal-600' },
  { hex: '#475569', name: 'Slate Gray', bg: 'bg-slate-600', border: 'border-slate-600', text: 'text-slate-600' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST - Asia/Kolkata +05:30)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST - Dubai +04:00)' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT +08:00)' },
  { value: 'Europe/London', label: 'London GMT / BST (+00:00 / +01:00)' },
  { value: 'America/New_York', label: 'Eastern Time (EST/EDT - New York -05:00)' },
  { value: 'America/Chicago', label: 'Central Time (CST/CDT - Chicago -06:00)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT - Los Angeles -08:00)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST - Sydney +10:00)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (INR - ₹)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD - $)' },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR - €)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP - £)' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar (SGD - S$)' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (AUD - A$)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (CAD - C$)' },
];

const LANGUAGES = [
  { code: 'en', label: 'English (Default)', native: 'English' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

const LOGO_PRESETS = [
  { label: 'NCA Church Gold', url: '/nca_church_logo.jpg' },
  { label: 'App Classic Logo', url: '/church_app_logo.jpg' },
  { label: 'Chapel Cross', url: '/church_logo_2.jpg' },
  { label: 'Cathedral Dome', url: 'https://images.unsplash.com/photo-1548625361-195fe578b9ec?w=200&auto=format&fit=crop&q=80' },
  { label: 'Worship Lights', url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=200&auto=format&fit=crop&q=80' },
];

export const ChurchSettingsModule: React.FC<ChurchSettingsModuleProps> = ({
  currentChurch,
  currentUser,
  members = [],
  settings,
  onSaveSettings,
  onNavigateTab,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('profile');
  const [formData, setFormData] = useState<CompleteChurchSettings>(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Sub-modal states for Services and Ministries
  const [editingService, setEditingService] = useState<ChurchServiceConfig | null>(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<ChurchMinistryConfig | null>(null);
  const [isMinistryModalOpen, setIsMinistryModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userRole = currentUser.role;
  const roleConfig = getRoleConfig(userRole);
  const canEdit = canEditChurchSettings(userRole);
  const isSuperAdmin = canManageSystemPreferences(userRole);

  // System Preferences section is strictly reserved for SuperAdmin only
  const visibleSections = SECTION_METADATA.filter(
    (sec) => sec.id !== 'preferences' || isSuperAdmin
  );

  // Redirect non-SuperAdmins if they land on preferences
  useEffect(() => {
    if (activeSection === 'preferences' && !isSuperAdmin) {
      setActiveSection('profile');
    }
  }, [activeSection, isSuperAdmin]);

  // Sync state if active church or settings prop changes
  useEffect(() => {
    setFormData(JSON.parse(JSON.stringify(settings)));
    setHasUnsavedChanges(false);
    setValidationErrors({});
  }, [settings, currentChurch.id]);

  // Helper to mark changes
  const updateSettingsState = (updater: (prev: CompleteChurchSettings) => CompleteChurchSettings) => {
    setFormData((prev) => {
      const next = updater(prev);
      setHasUnsavedChanges(true);
      return next;
    });
  };

  // Image compressor for logo upload
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          updateSettingsState((prev) => ({
            ...prev,
            profile: { ...prev.profile, logoUrl: compressed },
            appearance: { ...prev.appearance, logoUrl: compressed },
          }));
        }
      };
    };
    reader.readAsDataURL(file);
  };

  // Validation before saving
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.profile.name.trim()) {
      errors.name = 'Church name cannot be empty.';
    }

    if (formData.profile.email && !formData.profile.email.includes('@')) {
      errors.email = 'Please enter a valid email address.';
    }

    if (formData.profile.primaryContactEmail && !formData.profile.primaryContactEmail.includes('@')) {
      errors.primaryContactEmail = 'Please enter a valid primary contact email address.';
    }

    // Check services
    formData.services.forEach((srv, idx) => {
      if (!srv.name.trim()) {
        errors[`service_${srv.id || idx}`] = 'Service name cannot be empty.';
      }
    });

    // Check ministries
    const ministryNames = new Set<string>();
    formData.ministries.forEach((min, idx) => {
      if (!min.name.trim()) {
        errors[`ministry_${min.id || idx}`] = 'Ministry name cannot be empty.';
      } else {
        const lower = min.name.trim().toLowerCase();
        if (ministryNames.has(lower)) {
          errors[`ministry_${min.id || idx}`] = `Duplicate ministry name "${min.name}".`;
        }
        ministryNames.add(lower);
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Settings handler
  const handleSave = () => {
    if (!canEdit) return;
    if (!validateForm()) {
      alert('Please correct the validation errors highlighted on the form before saving.');
      return;
    }

    const updated: CompleteChurchSettings = {
      ...formData,
      church_id: currentChurch.id,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.name,
    };

    onSaveSettings(updated);
    setHasUnsavedChanges(false);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 4000);

    // Record in audit log
    auditService.logAction(currentChurch.id, {
      action: 'church_settings.updated',
      resource_type: 'church_settings',
      resource_id: updated.id,
      actor_id: currentUser.id,
      actor_name: currentUser.name,
      actor_role: currentUser.role,
      details: {
        church_name: updated.profile.name,
        services_count: updated.services.length,
        ministries_count: updated.ministries.length,
        enabled_modules: Object.keys(updated.preferences.moduleToggles).filter(
          (k) => updated.preferences.moduleToggles[k as keyof ChurchModuleToggles]
        ),
      },
    });
  };

  // Reset to original settings
  const handleResetToSaved = () => {
    if (confirm('Discard all unsaved changes and reload saved settings?')) {
      setFormData(JSON.parse(JSON.stringify(settings)));
      setHasUnsavedChanges(false);
      setValidationErrors({});
    }
  };

  // Service helper methods
  const handleAddOrUpdateService = (service: ChurchServiceConfig) => {
    updateSettingsState((prev) => {
      const exists = prev.services.some((s) => s.id === service.id);
      const nextServices = exists
        ? prev.services.map((s) => (s.id === service.id ? service : s))
        : [...prev.services, { ...service, order: prev.services.length + 1 }];
      return { ...prev, services: nextServices };
    });
    setIsServiceModalOpen(false);
    setEditingService(null);
  };

  const handleToggleServiceActive = (id: string) => {
    updateSettingsState((prev) => ({
      ...prev,
      services: prev.services.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)),
    }));
  };

  const handleDeleteService = (id: string) => {
    if (confirm('Are you sure you want to delete this service timing?')) {
      updateSettingsState((prev) => ({
        ...prev,
        services: prev.services.filter((s) => s.id !== id),
      }));
    }
  };

  const handleMoveServiceOrder = (index: number, direction: 'up' | 'down') => {
    updateSettingsState((prev) => {
      const list = [...prev.services];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
      return { ...prev, services: reordered };
    });
  };

  // Ministry helper methods
  const handleAddOrUpdateMinistry = (ministry: ChurchMinistryConfig) => {
    updateSettingsState((prev) => {
      const exists = prev.ministries.some((m) => m.id === ministry.id);
      const nextMinistries = exists
        ? prev.ministries.map((m) => (m.id === ministry.id ? ministry : m))
        : [...prev.ministries, { ...ministry, order: prev.ministries.length + 1 }];
      return { ...prev, ministries: nextMinistries };
    });
    setIsMinistryModalOpen(false);
    setEditingMinistry(null);
  };

  const handleToggleMinistryActive = (id: string) => {
    updateSettingsState((prev) => ({
      ...prev,
      ministries: prev.ministries.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m)),
    }));
  };

  const handleDeleteMinistry = (id: string) => {
    if (confirm('Are you sure you want to delete this ministry configuration?')) {
      updateSettingsState((prev) => ({
        ...prev,
        ministries: prev.ministries.filter((m) => m.id !== id),
      }));
    }
  };

  // Render Section Header
  const activeMeta = SECTION_METADATA.find((m) => m.id === activeSection) || SECTION_METADATA[0];
  const ActiveIcon = activeMeta.icon;

  return (
    <div className="space-y-4 text-slate-100 w-full max-w-full overflow-hidden">
      {/* Top Banner with Active Church & Multi-Tenant Scope */}
      <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 p-1 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={formData.profile.logoUrl || currentChurch.logoUrl || '/church_logo.jpg'}
              alt={formData.profile.name}
              className="w-full h-full object-cover rounded-xl bg-white"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/church_logo.jpg';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-100">{formData.profile.name}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Tenant: {currentChurch.id}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Church Settings & Module Control • Changes apply <strong className="text-amber-400">strictly to this church organization</strong>.
            </p>
          </div>
        </div>

        {/* Global Save / Cancel / Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {!canEdit && (
            <div className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Read Only View</span>
            </div>
          )}

          {hasUnsavedChanges && canEdit && (
            <button
              id="btn-settings-reset"
              onClick={handleResetToSaved}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
              title="Discard changes and reload saved settings"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Discard</span>
            </button>
          )}

          {canEdit && (
            <button
              id="btn-settings-save-all"
              onClick={handleSave}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition active:scale-95 ${
                hasUnsavedChanges
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>{hasUnsavedChanges ? 'Save Changes *' : 'Settings Saved'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {saveSuccessToast && (
        <div className="bg-emerald-900/90 border border-emerald-700 text-emerald-100 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Settings saved successfully for {formData.profile.name}! All church preferences are active.</span>
          </div>
          <button onClick={() => setSaveSuccessToast(false)} className="text-emerald-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Top Horizontal Section Navigator */}
      <div className="block lg:hidden overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-xl">
          {visibleSections.map((sec) => {
            const Icon = sec.icon;
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                id={`btn-mobile-sec-${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Settings Grid: Left Sidebar (Desktop) + Right Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Desktop Sidebar Navigation */}
        <div className="hidden lg:block lg:col-span-4 space-y-2">
          <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-sm space-y-1 sticky top-16">
            <div className="px-3 py-2 border-b border-slate-100 mb-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Settings Sections</h3>
              <p className="text-[11px] text-slate-500">Configure isolated church settings</p>
            </div>

            {visibleSections.map((sec) => {
              const Icon = sec.icon;
              const isSelected = activeSection === sec.id;

              return (
                <button
                  key={sec.id}
                  id={`btn-nav-sec-${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full text-left p-3 rounded-2xl flex items-start gap-3 transition ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-md border-slate-900 font-bold'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-amber-400' : 'text-slate-900'}`}>
                        {sec.label}
                      </p>
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <p className={`text-[10px] line-clamp-1 mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {sec.desc}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Quick Multi-Tenant Scope Note */}
            <div className="pt-2 border-t border-slate-100 mt-2">
              <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200/80 text-[11px] text-amber-900">
                <p className="font-bold flex items-center gap-1 text-amber-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Multi-Tenant Security
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5 leading-snug">
                  Settings here configure <strong>{formData.profile.name}</strong> exclusively. Other registered congregations have separate isolated data.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Settings Content Panel */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600">
                  <ActiveIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">{activeMeta.label}</h3>
                  <p className="text-xs text-slate-500">{activeMeta.desc}</p>
                </div>
              </div>

              {hasUnsavedChanges && canEdit && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-200 animate-pulse">
                  Unsaved Edits
                </span>
              )}
            </div>

            {/* ========================================================= */}
            {/* SECTION 1: CHURCH PROFILE */}
            {/* ========================================================= */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                {/* Logo & Live Church Preview Box */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Church Logo & Preview</h4>
                    <span className="text-[11px] text-slate-500">Live Branding Representation</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative group shrink-0">
                      <img
                        src={formData.profile.logoUrl || '/church_logo.jpg'}
                        alt="Church Logo"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400/60 shadow-md bg-white"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/church_logo.jpg';
                        }}
                      />
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/50 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold transition"
                          title="Upload new church logo image"
                        >
                          <Camera className="w-5 h-5 mb-0.5" />
                          <span>Change</span>
                        </button>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <h4 className="text-base font-black text-slate-900 truncate">
                        {formData.profile.name || 'Church Profile'}
                      </h4>
                      {formData.profile.tagline && (
                        <p className="text-xs text-amber-600 font-semibold truncate">
                          {formData.profile.tagline}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-slate-500 mt-2">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {formData.profile.city || 'Chennai'}, {formData.profile.state || 'Tamil Nadu'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {formData.profile.phone || '+91 98401 23456'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {formData.profile.email || 'office@church.org'}
                        </span>
                      </div>
                    </div>

                    {canEdit && (
                      <div className="shrink-0 flex flex-col gap-1.5 w-full sm:w-auto">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleLogoFileUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow transition"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Logo Presets Picker */}
                  {canEdit && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-bold text-slate-600">Quick Logo Presets</label>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {LOGO_PRESETS.map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() =>
                              updateSettingsState((prev) => ({
                                ...prev,
                                profile: { ...prev.profile, logoUrl: preset.url },
                                appearance: { ...prev.appearance, logoUrl: preset.url },
                              }))
                            }
                            className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 shrink-0 transition ${
                              formData.profile.logoUrl === preset.url
                                ? 'bg-amber-500/20 text-amber-800 border-amber-500/50 ring-1 ring-amber-400'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <img src={preset.url} alt="" className="w-4 h-4 rounded-full object-cover" />
                            <span>{preset.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Full Church Legal / Public Name *</span>
                      {validationErrors.name && <span className="text-rose-500 font-semibold">{validationErrors.name}</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.profile.name}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, name: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="e.g. New Creation Assembly Church"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Short Name / Abbreviation</label>
                    <input
                      type="text"
                      value={formData.profile.shortName}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, shortName: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="e.g. NCA Church"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Denomination / Affiliation</label>
                    <input
                      type="text"
                      value={formData.profile.denomination || ''}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, denomination: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="e.g. Pentecostal / Charismatic"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Tagline / Mission Motto</label>
                    <input
                      type="text"
                      value={formData.profile.tagline}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, tagline: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="e.g. Building Families, Impacting Nations"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Church Description & Bio</label>
                    <textarea
                      rows={2}
                      value={formData.profile.description || ''}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, description: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="Brief history, beliefs, and welcoming description..."
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  {/* Campus Address */}
                  <div className="space-y-1.5 sm:col-span-2 pt-2 border-t border-slate-100">
                    <h5 className="text-xs font-extrabold text-slate-800">Campus Location & Address</h5>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Street Address</label>
                    <input
                      type="text"
                      value={formData.profile.address}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, address: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="No. 12, Mount Road, Anna Salai"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">City</label>
                    <input
                      type="text"
                      value={formData.profile.city}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, city: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="Chennai"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">State / Province</label>
                    <input
                      type="text"
                      value={formData.profile.state}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, state: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="Tamil Nadu"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Postal / PIN Code</label>
                    <input
                      type="text"
                      value={formData.profile.postalCode}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, postalCode: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="600002"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Country</label>
                    <input
                      type="text"
                      value={formData.profile.country}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, country: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="India"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  {/* Contact Channels */}
                  <div className="space-y-1.5 sm:col-span-2 pt-2 border-t border-slate-100">
                    <h5 className="text-xs font-extrabold text-slate-800">Public & Administrative Contact Information</h5>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Official Phone Number</label>
                    <input
                      type="text"
                      value={formData.profile.phone}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, phone: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="+91 98401 23456"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Official Email</span>
                      {validationErrors.email && <span className="text-rose-500">{validationErrors.email}</span>}
                    </label>
                    <input
                      type="email"
                      value={formData.profile.email}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, email: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="office@newcreation.org.in"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Website URL</label>
                    <input
                      type="url"
                      value={formData.profile.website}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, website: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="https://newcreation.org.in"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  {/* Primary Pastoral Contact */}
                  <div className="space-y-1.5 sm:col-span-2 pt-2 border-t border-slate-100">
                    <h5 className="text-xs font-extrabold text-slate-800">Primary Pastoral / Admin Representative</h5>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Primary Contact Name</label>
                    <input
                      type="text"
                      value={formData.profile.primaryContactName}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, primaryContactName: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="e.g. Senior Pastor / Church Admin"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Primary Contact Phone</label>
                    <input
                      type="text"
                      value={formData.profile.primaryContactPhone}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, primaryContactPhone: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="+91 98401 23456"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Primary Contact Email</span>
                      {validationErrors.primaryContactEmail && (
                        <span className="text-rose-500">{validationErrors.primaryContactEmail}</span>
                      )}
                    </label>
                    <input
                      type="email"
                      value={formData.profile.primaryContactEmail}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, primaryContactEmail: e.target.value },
                        }))
                      }
                      disabled={!canEdit}
                      placeholder="pastor.samuel@newcreation.org.in"
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 2: SERVICE SETTINGS */}
            {/* ========================================================= */}
            {activeSection === 'services' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Regular Church Services Schedule</h4>
                    <p className="text-xs text-slate-500">
                      Configure weekly worship, prayer, youth, and study services used across Attendance, Roster, and Events.
                    </p>
                  </div>

                  {canEdit && (
                    <button
                      id="btn-add-new-service"
                      onClick={() => {
                        setEditingService({
                          id: `srv-${Date.now()}`,
                          name: '',
                          day: 'Sunday',
                          startTime: '09:00 AM',
                          endTime: '10:30 AM',
                          location: 'Main Sanctuary',
                          isActive: true,
                          description: '',
                          order: formData.services.length + 1,
                        });
                        setIsServiceModalOpen(true);
                      }}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Add Service</span>
                    </button>
                  )}
                </div>

                {/* Services List */}
                <div className="space-y-2.5 pt-2">
                  {formData.services.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">No Services Configured</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Click "Add Service" to create regular weekly worship gatherings.</p>
                    </div>
                  ) : (
                    formData.services.map((service, index) => (
                      <div
                        key={service.id}
                        className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          service.isActive
                            ? 'bg-white border-slate-200 shadow-sm'
                            : 'bg-slate-50 border-slate-200/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center justify-center gap-1 shrink-0 pt-0.5">
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleMoveServiceOrder(index, 'up')}
                                  disabled={index === 0}
                                  className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded text-slate-500"
                                  title="Move Up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveServiceOrder(index, 'down')}
                                  disabled={index === formData.services.length - 1}
                                  className="p-1 hover:bg-slate-100 disabled:opacity-30 rounded text-slate-500"
                                  title="Move Down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>

                          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-700 shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="text-xs font-bold text-slate-900">{service.name}</h5>
                              <span className="text-[10px] px-2 py-0.2 rounded-md font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                                {service.day}
                              </span>
                              <span className="text-[10px] px-2 py-0.2 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {service.startTime} {service.endTime ? `- ${service.endTime}` : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              Location: <strong className="text-slate-700">{service.location}</strong>
                              {service.description ? ` • ${service.description}` : ''}
                            </p>
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleServiceActive(service.id)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                                service.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                              }`}
                            >
                              {service.isActive ? 'Active' : 'Disabled'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingService(service);
                                setIsServiceModalOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              title="Edit service details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteService(service.id)}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition"
                              title="Delete service"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 3: MINISTRIES SETTINGS */}
            {/* ========================================================= */}
            {activeSection === 'ministries' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Church Ministries & Department Teams</h4>
                    <p className="text-xs text-slate-500">
                      Configure church ministries, assign team leaders from member directories, and set colors.
                    </p>
                  </div>

                  {canEdit && (
                    <button
                      id="btn-add-new-ministry"
                      onClick={() => {
                        setEditingMinistry({
                          id: `min-${Date.now()}`,
                          name: '',
                          description: '',
                          leaderName: '',
                          color: '#f59e0b',
                          icon: 'Heart',
                          isActive: true,
                          requiredSkills: [],
                          meetingSchedule: '',
                          order: formData.ministries.length + 1,
                        });
                        setIsMinistryModalOpen(true);
                      }}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Create Ministry</span>
                    </button>
                  )}
                </div>

                {/* Ministries Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {formData.ministries.map((ministry) => {
                    const matchedIcon = MINISTRY_ICON_OPTIONS.find((i) => i.name === ministry.icon) || MINISTRY_ICON_OPTIONS[0];
                    const IconComp = matchedIcon.icon;

                    return (
                      <div
                        key={ministry.id}
                        className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                          ministry.isActive
                            ? 'bg-white border-slate-200 shadow-sm'
                            : 'bg-slate-50 border-slate-200/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="p-2.5 rounded-xl text-white shadow-sm shrink-0"
                              style={{ backgroundColor: ministry.color || '#f59e0b' }}
                            >
                              <IconComp className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-slate-900">{ministry.name}</h5>
                              <p className="text-[10px] text-slate-500">Leader: <strong className="text-slate-800">{ministry.leaderName || 'Unassigned'}</strong></p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleMinistryActive(ministry.id)}
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                                    ministry.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {ministry.isActive ? 'Active' : 'Disabled'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMinistry(ministry);
                                    setIsMinistryModalOpen(true);
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-500"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMinistry(ministry.id)}
                                  className="p-1 hover:bg-rose-50 rounded text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-2">{ministry.description}</p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate">{ministry.meetingSchedule || 'Flexible schedule'}</span>
                          {ministry.leaderPhone && <span>{ministry.leaderPhone}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 4: MEMBER SETTINGS */}
            {/* ========================================================= */}
            {activeSection === 'members' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Member Classification & Types</h4>
                  <p className="text-xs text-slate-500">
                    Enable or customize membership classifications and custom display names for your congregation.
                  </p>
                </div>

                {/* Member Types List */}
                <div className="space-y-2">
                  {formData.memberSettings.memberTypes.map((mt, idx) => (
                    <div
                      key={mt.type}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={mt.isEnabled}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            updateSettingsState((prev) => ({
                              ...prev,
                              memberSettings: {
                                ...prev.memberSettings,
                                memberTypes: prev.memberSettings.memberTypes.map((item, i) =>
                                  i === idx ? { ...item, isEnabled: isChecked } : item
                                ),
                              },
                            }));
                          }}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{mt.type}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-md border ${mt.colorBadge || 'bg-slate-100'}`}>
                              Preview Badge
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500">{mt.description || 'Congregational classification'}</p>
                        </div>
                      </div>

                      <div className="w-48 sm:w-60">
                        <input
                          type="text"
                          value={mt.displayName}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateSettingsState((prev) => ({
                              ...prev,
                              memberSettings: {
                                ...prev.memberSettings,
                                memberTypes: prev.memberSettings.memberTypes.map((item, i) =>
                                  i === idx ? { ...item, displayName: val } : item
                                ),
                              },
                            }));
                          }}
                          placeholder="Custom Display Title"
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optional Member Fields Toggles */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Optional Member Fields</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'enableBirthdays' as const, label: 'Track Birthdates & Age' },
                      { key: 'enableAnniversaries' as const, label: 'Track Wedding Anniversaries' },
                      { key: 'enableSkillsTracking' as const, label: 'Track Skills & Ministry Talents' },
                      { key: 'enableEmergencyContacts' as const, label: 'Require Emergency Contact Info' },
                      { key: 'enablePastoralNotes' as const, label: 'Allow Confidential Pastoral Notes' },
                      { key: 'enableFamilyRelationships' as const, label: 'Track Family Members & Spouses' },
                    ].map((field) => (
                      <label
                        key={field.key}
                        className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-800"
                      >
                        <input
                          type="checkbox"
                          checked={formData.memberSettings[field.key]}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateSettingsState((prev) => ({
                              ...prev,
                              memberSettings: { ...prev.memberSettings, [field.key]: checked },
                            }));
                          }}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                        />
                        <span>{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 5: ATTENDANCE SETTINGS */}
            {/* ========================================================= */}
            {activeSection === 'attendance' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Attendance Configuration</h4>
                  <p className="text-xs text-slate-500">
                    Configure attendance session types, statuses, guest headcounts, and default views.
                  </p>
                </div>

                {/* Session Types */}
                <div className="space-y-2">
                  <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Enabled Attendance Gathering Types</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {formData.attendanceSettings.attendanceTypes.map((type, idx) => (
                      <label
                        key={type.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={type.isEnabled}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            updateSettingsState((prev) => ({
                              ...prev,
                              attendanceSettings: {
                                ...prev.attendanceSettings,
                                attendanceTypes: prev.attendanceSettings.attendanceTypes.map((t, i) =>
                                  i === idx ? { ...t, isEnabled: isChecked } : t
                                ),
                              },
                            }));
                          }}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                        />
                        <span>{type.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Statuses and Options */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Tracking Options</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.attendanceSettings.enableGuestTracking}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateSettingsState((prev) => ({
                            ...prev,
                            attendanceSettings: { ...prev.attendanceSettings, enableGuestTracking: checked },
                          }));
                        }}
                        className="w-4 h-4 rounded text-amber-500"
                      />
                      <span>Track Visitor / First-Time Guest Count</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.attendanceSettings.enableNotes}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          updateSettingsState((prev) => ({
                            ...prev,
                            attendanceSettings: { ...prev.attendanceSettings, enableNotes: checked },
                          }));
                        }}
                        className="w-4 h-4 rounded text-amber-500"
                      />
                      <span>Allow Session Summary & Notes</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 6: NOTIFICATION SETTINGS */}
            {/* ========================================================= */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Church Notification Channels & Triggers</h4>
                  <p className="text-xs text-slate-500">
                    Control which communication channels are active and select automated notification preferences.
                  </p>
                </div>

                {/* Channels Switches */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                  <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Active Communication Channels</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'whatsapp' as const, label: 'WhatsApp', icon: MessageSquare, activeColor: 'bg-emerald-500 text-white' },
                      { key: 'email' as const, label: 'Email', icon: Mail, activeColor: 'bg-sky-500 text-white' },
                      { key: 'push' as const, label: 'Push App', icon: Bell, activeColor: 'bg-amber-500 text-slate-950' },
                      { key: 'sms' as const, label: 'Text SMS', icon: Phone, activeColor: 'bg-purple-500 text-white' },
                    ].map((channel) => {
                      const Icon = channel.icon;
                      const isEnabled = formData.notificationSettings.channels[channel.key];

                      return (
                        <button
                          key={channel.key}
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            updateSettingsState((prev) => ({
                              ...prev,
                              notificationSettings: {
                                ...prev.notificationSettings,
                                channels: {
                                  ...prev.notificationSettings.channels,
                                  [channel.key]: !isEnabled,
                                },
                              },
                            }))
                          }
                          className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition ${
                            isEnabled
                              ? 'bg-white border-slate-300 shadow-md ring-1 ring-slate-300'
                              : 'bg-slate-100 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Icon className={`w-4 h-4 ${isEnabled ? 'text-amber-500' : 'text-slate-400'}`} />
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${
                              isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {isEnabled ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-900">{channel.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preference Triggers */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Notification Triggers & Alerts</h5>
                  <div className="space-y-2">
                    {[
                      { key: 'eventReminders' as const, label: 'Upcoming Worship & Event Reminders' },
                      { key: 'birthdayNotifications' as const, label: 'Member Birthday & Anniversary Greetings' },
                      { key: 'prayerNotifications' as const, label: 'Urgent Prayer Request Notifications' },
                      { key: 'attendanceNotifications' as const, label: 'Absent Member Follow-Up Notices' },
                      { key: 'sundaySchoolNotifications' as const, label: 'Sunday School Lessons & Memory Verse Alerts' },
                      { key: 'generalAnnouncements' as const, label: 'Pastoral Bulletins & General Church Announcements' },
                    ].map((pref) => (
                      <label
                        key={pref.key}
                        className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-800"
                      >
                        <span>{pref.label}</span>
                        <input
                          type="checkbox"
                          checked={formData.notificationSettings.preferences[pref.key]}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateSettingsState((prev) => ({
                              ...prev,
                              notificationSettings: {
                                ...prev.notificationSettings,
                                preferences: {
                                  ...prev.notificationSettings.preferences,
                                  [pref.key]: checked,
                                },
                              },
                            }));
                          }}
                          className="w-4 h-4 rounded text-amber-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Smart Notifications Rules & Administration */}
                <div className="pt-4 border-t border-slate-200">
                  <AdminNotificationSettingsModule
                    currentChurch={currentChurch}
                    currentUser={currentUser}
                    members={members}
                  />
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 7: LOCALIZATION */}
            {/* ========================================================= */}
            {activeSection === 'localization' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Language, Currency & Time Zone</h4>
                  <p className="text-xs text-slate-500">
                    Configure local formatting respected across your congregation's bulletins and reports.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Language */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Primary Language</label>
                    <select
                      value={formData.localization.language}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          localization: { ...prev.localization, language: e.target.value as any },
                        }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.label} ({lang.native})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Currency */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Default Currency</label>
                    <select
                      value={formData.localization.currency}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const code = e.target.value;
                        const match = CURRENCIES.find((c) => c.code === code);
                        updateSettingsState((prev) => ({
                          ...prev,
                          localization: {
                            ...prev.localization,
                            currency: code,
                            currencySymbol: match?.symbol || '₹',
                          },
                        }));
                      }}
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    >
                      {CURRENCIES.map((cur) => (
                        <option key={cur.code} value={cur.code}>
                          {cur.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Timezone */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Campus Time Zone</label>
                    <select
                      value={formData.localization.timezone}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          localization: { ...prev.localization, timezone: e.target.value },
                        }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Format */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Date Format</label>
                    <select
                      value={formData.localization.dateFormat}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          localization: { ...prev.localization, dateFormat: e.target.value as any },
                        }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 26/08/2026 - Indian/UK Standard)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 08/26/2026 - US Standard)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-08-26 - ISO Standard)</option>
                    </select>
                  </div>

                  {/* Time Format */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Time Format</label>
                    <select
                      value={formData.localization.timeFormat}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          localization: { ...prev.localization, timeFormat: e.target.value as any },
                        }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    >
                      <option value="12h">12-Hour AM/PM (e.g. 09:30 AM)</option>
                      <option value="24h">24-Hour Military (e.g. 09:30, 18:00)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 8: APPEARANCE */}
            {/* ========================================================= */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Branding & Visual Consistency</h4>
                  <p className="text-xs text-slate-500">
                    Customize branding accents while maintaining clean application UI consistency.
                  </p>
                </div>

                {/* Accent Color Palette */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Brand Accent Color</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {COLOR_PALETTE.map((color) => {
                      const isSelected = formData.appearance.accentColor === color.hex;
                      return (
                        <button
                          key={color.hex}
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            updateSettingsState((prev) => ({
                              ...prev,
                              appearance: { ...prev.appearance, accentColor: color.hex },
                            }))
                          }
                          className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400'
                              : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full shadow-sm shrink-0" style={{ backgroundColor: color.hex }} />
                          <span className="truncate">{color.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Header Title Display Mode */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700">Header Title Display Format</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'full' as const, label: 'Full Church Name', sample: formData.profile.name },
                      { id: 'short' as const, label: 'Short Name Only', sample: formData.profile.shortName || 'NCA' },
                      { id: 'with_tagline' as const, label: 'Full Name + Tagline', sample: `${formData.profile.name}` },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        disabled={!canEdit}
                        onClick={() =>
                          updateSettingsState((prev) => ({
                            ...prev,
                            appearance: { ...prev.appearance, headerTitleDisplay: mode.id },
                          }))
                        }
                        className={`p-3 rounded-2xl border text-left transition ${
                          formData.appearance.headerTitleDisplay === mode.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <p className="text-xs font-bold leading-tight">{mode.label}</p>
                        <p className="text-[10px] opacity-75 truncate mt-1">{mode.sample}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 9: SECURITY & PERMISSIONS */}
            {/* ========================================================= */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Security, Access & Directory Privacy</h4>
                  <p className="text-xs text-slate-500">
                    Review role privileges and configure congregation privacy policies.
                  </p>
                </div>

                {/* Role Matrix Overview Card */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Role Privilege Hierarchy</h5>
                    <span className="text-[10px] text-slate-500">RBAC Engine</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 flex items-center justify-between">
                      <div>
                        <strong>Platform Super Admin:</strong> Universal multi-church administration
                      </div>
                      <span className="font-mono text-[10px] font-bold bg-purple-200 px-2 py-0.5 rounded">All Churches</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between">
                      <div>
                        <strong>Senior Pastor / Church Admin:</strong> Full settings & operational control
                      </div>
                      <span className="font-mono text-[10px] font-bold bg-amber-200 px-2 py-0.5 rounded">This Church</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 flex items-center justify-between">
                      <div>
                        <strong>Assistant Pastor:</strong> View and ministry management access
                      </div>
                      <span className="font-mono text-[10px] font-bold bg-blue-200 px-2 py-0.5 rounded">Ministry Scope</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between">
                      <div>
                        <strong>Ministry Leader / Volunteer / Member:</strong> Restricted from admin settings
                      </div>
                      <span className="font-mono text-[10px] font-bold bg-slate-200 px-2 py-0.5 rounded">Restricted</span>
                    </div>
                  </div>
                </div>

                {/* Privacy Preferences */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Member Directory Visibility</label>
                    <select
                      value={formData.security.directoryVisibility}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          security: { ...prev.security, directoryVisibility: e.target.value as any },
                        }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    >
                      <option value="members_only">Registered Members Only (Recommended)</option>
                      <option value="leaders_only">Leaders & Pastoral Staff Only</option>
                      <option value="public">Public Congregation View</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Prayer Request Moderation</label>
                    <select
                      value={formData.security.prayerModeration}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          security: { ...prev.security, prayerModeration: e.target.value as any },
                        }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    >
                      <option value="auto_publish">Auto-Publish with Confidentiality Tags</option>
                      <option value="pastor_approval">Require Pastoral Staff Approval Before Wall Listing</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Roster Duty Visibility</label>
                    <select
                      value={formData.security.rosterVisibility}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          security: { ...prev.security, rosterVisibility: e.target.value as any },
                        }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    >
                      <option value="all_members">Visible to All Church Members</option>
                      <option value="volunteers_only">Visible Only to Active Volunteers</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Session Lock Duration</label>
                    <select
                      value={formData.security.sessionTimeout}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          security: { ...prev.security, sessionTimeout: e.target.value as any },
                        }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    >
                      <option value="1d">1 Day (Recommended for mobile)</option>
                      <option value="1h">1 Hour</option>
                      <option value="30m">30 Minutes</option>
                      <option value="indefinite">Stay Logged In Until Signout</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* SECTION 10: SYSTEM PREFERENCES & MODULE AVAILABILITY (SuperAdmin Only) */}
            {/* ========================================================= */}
            {activeSection === 'preferences' && isSuperAdmin && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">System Preferences & Church Module Control</h4>
                  <p className="text-xs text-slate-500">
                    Enable or disable specific modules for <strong>{formData.profile.name}</strong>. Disabled modules are hidden from navigation and direct access while preserving all existing records safely.
                  </p>
                </div>

                {/* Module Toggles Matrix */}
                <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h5 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                        Feature Toggles / Module Availability
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        Active Tenant: <strong className="text-white">{formData.profile.name}</strong>
                      </p>
                    </div>

                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Multi-Tenant Safe
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: 'dashboard' as const, label: 'Dashboard & Analytics', desc: 'Church KPIs, attendance trends & growth', icon: LayoutDashboard },
                      { key: 'reports' as const, label: 'Reports & Export Engine', desc: 'Filtered reports, trends & print exports', icon: BarChart3 },
                      { key: 'visitors' as const, label: 'Visitor Management', desc: 'Visitor follow-ups, calls & retention', icon: UserPlus },
                      { key: 'directory' as const, label: 'Members Directory', desc: 'Church members, families & profiles', icon: Users },
                      { key: 'ministries' as const, label: 'Ministries & Teams', desc: 'Church departments, squads & activities', icon: Landmark },
                      { key: 'groups' as const, label: 'Small Groups & Life Groups', desc: 'Cell groups, Bible studies & group rosters', icon: Users },
                      { key: 'prayers' as const, label: 'Prayer Wall', desc: 'Intercessory requests & praise updates', icon: HeartHandshake },
                      { key: 'pastoral' as const, label: 'Pastoral Care & Visits', desc: 'Pastoral visitation, member counseling & care logs', icon: Heart },
                      { key: 'calendar' as const, label: 'Events & Calendar', desc: 'Schedules, RSVPs & reminders', icon: Calendar },
                      { key: 'sundayschool' as const, label: 'Sunday School', desc: 'Children classes, verses & badges', icon: GraduationCap },
                      { key: 'attendance' as const, label: 'Attendance Tracker', desc: 'Sunday service & headcount logging', icon: UserCheck },
                      { key: 'volunteers' as const, label: 'Volunteers Manager', desc: 'Ministry teams & skill matching', icon: HeartHandshake },
                      { key: 'roster' as const, label: 'Service Duty Roster', desc: 'Sunday duty schedules & confirmations', icon: Calendar },
                      { key: 'whatsapp' as const, label: 'WhatsApp Messaging Hub', desc: 'One-click WhatsApp notices & templates', icon: MessageSquare },
                      { key: 'announcements' as const, label: 'Bulletins & Announcements', desc: 'Pastoral announcements & notices', icon: Megaphone },
                      { key: 'notifications' as const, label: 'Alerts & Broadcasts', desc: 'Push notifications & emergency alerts', icon: Bell },
                      { key: 'saas' as const, label: 'Multi-Tenant SaaS Console', desc: 'Church switcher & user accounts', icon: Building2 },
                    ].map((mod) => {
                      const Icon = mod.icon;
                      const isEnabled = formData.preferences.moduleToggles[mod.key] !== false;

                      return (
                        <div
                          key={mod.key}
                          className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                            isEnabled
                              ? 'bg-slate-800/80 border-slate-700 text-white'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 ${
                              isEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-600'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{mod.label}</p>
                              <p className="text-[10px] text-slate-400 truncate">{mod.desc}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => {
                              const nextToggles = {
                                ...formData.preferences.moduleToggles,
                                [mod.key]: !isEnabled,
                              };
                              const updatedSettings: CompleteChurchSettings = {
                                ...formData,
                                preferences: {
                                  ...formData.preferences,
                                  moduleToggles: nextToggles,
                                },
                                updatedAt: new Date().toISOString(),
                                updatedBy: currentUser.name,
                              };
                              updateSettingsState((prev) => ({
                                ...prev,
                                preferences: {
                                  ...prev.preferences,
                                  moduleToggles: nextToggles,
                                },
                              }));
                              onSaveSettings(updatedSettings);
                              setSaveSuccessToast(true);
                              setTimeout(() => setSaveSuccessToast(false), 3000);
                            }}
                            className={`px-3 py-1 rounded-xl text-[10px] font-extrabold transition shrink-0 ${
                              isEnabled
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {isEnabled ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Default Preferences */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Default Landing Tab for Members</label>
                    <select
                      value={formData.preferences.defaultLandingTab}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          preferences: { ...prev.preferences, defaultLandingTab: e.target.value },
                        }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    >
                      <option value="directory">Members Directory</option>
                      <option value="prayers">Prayer Wall</option>
                      <option value="calendar">Events & Calendar</option>
                      <option value="attendance">Attendance Tracker</option>
                      <option value="announcements">Bulletins & Announcements</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Default Member Sorting Order</label>
                    <select
                      value={formData.preferences.defaultMemberSort}
                      disabled={!canEdit}
                      onChange={(e) =>
                        updateSettingsState((prev) => ({
                          ...prev,
                          preferences: { ...prev.preferences, defaultMemberSort: e.target.value as any },
                        }))
                      }
                      className="w-full p-2.5 bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-xs"
                    >
                      <option value="name_asc">Member Name (A &rarr; Z)</option>
                      <option value="name_desc">Member Name (Z &rarr; A)</option>
                      <option value="id_asc">Member ID Order (GV-001)</option>
                      <option value="joined_date_desc">Recently Joined First</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ADD / EDIT SERVICE MODAL DIALOG */}
      {/* ========================================================= */}
      {isServiceModalOpen && editingService && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700">
                  <Clock className="w-4 h-4" />
                </div>
                <h4 className="font-black text-sm text-slate-900">
                  {editingService.name ? 'Edit Service Schedule' : 'Add New Service Timing'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsServiceModalOpen(false);
                  setEditingService(null);
                }}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingService.name.trim()) return;
                handleAddOrUpdateService(editingService);
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Service Name *</label>
                <input
                  type="text"
                  required
                  value={editingService.name}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  placeholder="e.g. Sunday Morning Tamil Service"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Day of Week</label>
                  <select
                    value={editingService.day}
                    onChange={(e) => setEditingService({ ...editingService, day: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Start Time</label>
                  <input
                    type="text"
                    value={editingService.startTime}
                    onChange={(e) => setEditingService({ ...editingService, startTime: e.target.value })}
                    placeholder="09:00 AM"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">End Time (Optional)</label>
                  <input
                    type="text"
                    value={editingService.endTime || ''}
                    onChange={(e) => setEditingService({ ...editingService, endTime: e.target.value })}
                    placeholder="10:45 AM"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Campus Location</label>
                  <input
                    type="text"
                    value={editingService.location}
                    onChange={(e) => setEditingService({ ...editingService, location: e.target.value })}
                    placeholder="Main Sanctuary"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Service Description</label>
                <textarea
                  rows={2}
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder="Congregational praise and Word ministry..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingService.isActive}
                  onChange={(e) => setEditingService({ ...editingService, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span>Active weekly service</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsServiceModalOpen(false);
                    setEditingService(null);
                  }}
                  className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT MINISTRY MODAL DIALOG */}
      {/* ========================================================= */}
      {isMinistryModalOpen && editingMinistry && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <h4 className="font-black text-sm text-slate-900">
                  {editingMinistry.name ? 'Edit Ministry Department' : 'Create New Ministry'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMinistryModalOpen(false);
                  setEditingMinistry(null);
                }}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingMinistry.name.trim()) return;
                handleAddOrUpdateMinistry(editingMinistry);
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ministry Name *</label>
                <input
                  type="text"
                  required
                  value={editingMinistry.name}
                  onChange={(e) => setEditingMinistry({ ...editingMinistry, name: e.target.value })}
                  placeholder="e.g. Media & Live Stream Team"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Assign Leader from Member Directory */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ministry Leader</label>
                <select
                  value={editingMinistry.leaderMemberId || ''}
                  onChange={(e) => {
                    const memId = e.target.value;
                    const matchedMem = members.find((m) => m.id === memId);
                    if (matchedMem) {
                      setEditingMinistry({
                        ...editingMinistry,
                        leaderMemberId: matchedMem.id,
                        leaderName: `${matchedMem.firstName} ${matchedMem.lastName}`,
                        leaderEmail: matchedMem.email,
                        leaderPhone: matchedMem.phone,
                      });
                    } else {
                      setEditingMinistry({
                        ...editingMinistry,
                        leaderMemberId: '',
                      });
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="">Select from Church Member Directory...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Leader Name (Manual)</label>
                  <input
                    type="text"
                    value={editingMinistry.leaderName}
                    onChange={(e) => setEditingMinistry({ ...editingMinistry, leaderName: e.target.value })}
                    placeholder="e.g. Ministry Coordinator"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Leader Phone</label>
                  <input
                    type="text"
                    value={editingMinistry.leaderPhone || ''}
                    onChange={(e) => setEditingMinistry({ ...editingMinistry, leaderPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Ministry Color Palette */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Theme Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setEditingMinistry({ ...editingMinistry, color: c.hex })}
                      className={`w-7 h-7 rounded-xl border-2 transition ${
                        editingMinistry.color === c.hex ? 'border-slate-900 scale-110 shadow' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ministry Icon</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {MINISTRY_ICON_OPTIONS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = editingMinistry.icon === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setEditingMinistry({ ...editingMinistry, icon: item.name })}
                        className={`p-2 rounded-xl border flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-slate-900 text-amber-400 border-slate-900'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                        title={item.label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={editingMinistry.description}
                  onChange={(e) => setEditingMinistry({ ...editingMinistry, description: e.target.value })}
                  placeholder="Purpose, responsibilities, and team role..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Meeting / Practice Schedule</label>
                <input
                  type="text"
                  value={editingMinistry.meetingSchedule || ''}
                  onChange={(e) => setEditingMinistry({ ...editingMinistry, meetingSchedule: e.target.value })}
                  placeholder="e.g. Thursday Rehearsal 6:30 PM"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingMinistry.isActive}
                  onChange={(e) => setEditingMinistry({ ...editingMinistry, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500"
                />
                <span>Active church ministry department</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsMinistryModalOpen(false);
                    setEditingMinistry(null);
                  }}
                  className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow"
                >
                  Save Ministry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
