import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Church, ChurchSettings, ServiceTiming } from '@/types/database';
import { DEMO_SETTINGS } from '@/lib/mockData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { CreateChurchDialog } from '@/components/church/CreateChurchDialog';
import {
  Building2,
  Clock,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST - Chennai, Kolkata, Mumbai, New Delhi)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (Dubai)' },
  { value: 'Asia/Singapore', label: 'Singapore, Hong Kong' },
  { value: 'Europe/London', label: 'London, GMT / BST' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Australia/Sydney', label: 'Sydney, Melbourne' },
];

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function ChurchSettingsPage() {
  const { activeChurch, currentRole, createChurch, updateChurch } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [churchForm, setChurchForm] = useState<Partial<Church>>({
    name: activeChurch?.name || '',
    tagline: activeChurch?.tagline || '',
    logo_url: activeChurch?.logo_url || '',
    email: activeChurch?.email || '',
    phone: activeChurch?.phone || '',
    website: activeChurch?.website || '',
    address: activeChurch?.address || '',
    city: activeChurch?.city || '',
    state: activeChurch?.state || '',
    postal_code: activeChurch?.postal_code || '',
    country: activeChurch?.country || 'India',
    timezone: activeChurch?.timezone || 'Asia/Kolkata',
  });

  const [serviceTimings, setServiceTimings] = useState<ServiceTiming[]>(DEMO_SETTINGS.service_timings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeChurch) {
      setChurchForm({
        name: activeChurch.name || '',
        tagline: activeChurch.tagline || '',
        logo_url: activeChurch.logo_url || '',
        email: activeChurch.email || '',
        phone: activeChurch.phone || '',
        website: activeChurch.website || '',
        address: activeChurch.address || '',
        city: activeChurch.city || '',
        state: activeChurch.state || '',
        postal_code: activeChurch.postal_code || '',
        country: activeChurch.country || 'India',
        timezone: activeChurch.timezone || 'Asia/Kolkata',
      });

      // Load settings from Supabase if configured
      if (isSupabaseConfigured()) {
        const fetchSettings = async () => {
          const { data } = await supabase
            .from('church_settings')
            .select('*')
            .eq('church_id', activeChurch.id)
            .single();

          if (data?.service_timings) {
            setServiceTimings(data.service_timings);
          }
        };
        fetchSettings();
      }
    }
  }, [activeChurch]);

  const handleInputChange = (field: keyof Church, value: string) => {
    setChurchForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddServiceTiming = () => {
    const newTiming: ServiceTiming = {
      id: `st-${Date.now()}`,
      name: 'Sunday Morning Service',
      day: 'Sunday',
      time: '10:00 AM',
      type: 'In-Person & Online',
    };
    setServiceTimings((prev) => [...prev, newTiming]);
  };

  const handleUpdateServiceTiming = (id: string, field: keyof ServiceTiming, value: string) => {
    setServiceTimings((prev) =>
      prev.map((timing) => (timing.id === id ? { ...timing, [field]: value } : timing))
    );
  };

  const handleRemoveServiceTiming = (id: string) => {
    setServiceTimings((prev) => prev.filter((timing) => timing.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChurch) return;

    setIsSaving(true);
    try {
      // 1. Update church profile in context & persistent storage
      await updateChurch(activeChurch.id, churchForm);

      // 2. Upsert church settings in Supabase if configured
      if (isSupabaseConfigured()) {
        const { error: settingsErr } = await supabase
          .from('church_settings')
          .upsert({
            church_id: activeChurch.id,
            service_timings: serviceTimings,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'church_id' });

        if (settingsErr) console.error('Settings upsert warning:', settingsErr);
      }

      toast.success('Church profile and service timings updated successfully!');
    } catch (err: any) {
      console.error('Save settings error:', err);
      toast.error(err.message || 'Failed to update church settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = currentRole === 'church_admin' || currentRole === 'super_admin' || currentRole === 'pastor';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Church Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure church profile, branding, contact info, timezone, and public service schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!canEdit && (
            <Badge variant="secondary" className="text-xs gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              View Only Mode
            </Badge>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 gap-1.5 text-xs border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/30"
          >
            <Plus className="h-4 w-4 text-sky-600" />
            Create New Church
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canEdit || isSaving}
            isLoading={isSaving}
            className="h-9 gap-2"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Main Information & Services */}
        <div className="space-y-6 lg:col-span-2">
          {/* General Church Profile */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-600" />
                Church Profile & Identity
              </CardTitle>
              <CardDescription className="text-xs">
                General identification used on public bulletins, member apps, and official receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Church Name *
                  </label>
                  <Input
                    value={churchForm.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g. Grace Valley Community Church"
                    disabled={!canEdit}
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Motto / Tagline
                  </label>
                  <Input
                    value={churchForm.tagline || ''}
                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                    placeholder="e.g. Loving God, Loving People, Serving the World"
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Logo Image URL
                  </label>
                  <Input
                    value={churchForm.logo_url || ''}
                    onChange={(e) => handleInputChange('logo_url', e.target.value)}
                    placeholder="https://.../logo.png"
                    icon={<ImageIcon className="h-4 w-4" />}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details & Address */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sky-600" />
                Location & Contact Information
              </CardTitle>
              <CardDescription className="text-xs">
                Physical church campus and administrative communication channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Official Email
                  </label>
                  <Input
                    type="email"
                    value={churchForm.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="office@gracevalley.org"
                    icon={<Mail className="h-4 w-4" />}
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <Input
                    value={churchForm.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    icon={<Phone className="h-4 w-4" />}
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Website URL
                  </label>
                  <Input
                    value={churchForm.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://gracevalley.org"
                    icon={<Globe className="h-4 w-4" />}
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Street Address
                  </label>
                  <Input
                    value={churchForm.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="No. 12, Mount Road, Anna Salai"
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    City
                  </label>
                  <Input
                    value={churchForm.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Chennai"
                    disabled={!canEdit}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      State / Province
                    </label>
                    <Input
                      value={churchForm.state || ''}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="Tamil Nadu"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Postal Code
                    </label>
                    <Input
                      value={churchForm.postal_code || ''}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      placeholder="600002"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Timings Manager */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-sky-600" />
                  Weekly Service Timings
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage weekly worship gatherings, prayer nights, and youth services.
                </CardDescription>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddServiceTiming}
                  className="h-8 gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Service
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {serviceTimings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-slate-800">
                  No service timings configured yet. Click "Add Service" to create your schedule.
                </div>
              ) : (
                serviceTimings.map((timing, index) => (
                  <div
                    key={timing.id || index}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-400">
                        Service Title
                      </label>
                      <Input
                        value={timing.name}
                        onChange={(e) => handleUpdateServiceTiming(timing.id, 'name', e.target.value)}
                        placeholder="e.g. Sunday Morning Service"
                        disabled={!canEdit}
                        className="bg-white dark:bg-slate-800"
                      />
                    </div>

                    <div className="w-full sm:w-36 space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-400">
                        Day
                      </label>
                      <Select
                        value={timing.day}
                        onValueChange={(val) => handleUpdateServiceTiming(timing.id, 'day', val)}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-800">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-full sm:w-32 space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-400">
                        Time
                      </label>
                      <Input
                        value={timing.time}
                        onChange={(e) => handleUpdateServiceTiming(timing.id, 'time', e.target.value)}
                        placeholder="09:00 AM"
                        disabled={!canEdit}
                        className="bg-white dark:bg-slate-800"
                      />
                    </div>

                    <div className="w-full sm:w-44 space-y-1">
                      <label className="text-[10px] font-semibold uppercase text-slate-400">
                        Format / Type
                      </label>
                      <Input
                        value={timing.type}
                        onChange={(e) => handleUpdateServiceTiming(timing.id, 'type', e.target.value)}
                        placeholder="In-Person & Online"
                        disabled={!canEdit}
                        className="bg-white dark:bg-slate-800"
                      />
                    </div>

                    {canEdit && (
                      <div className="pt-4 sm:pt-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveServiceTiming(timing.id)}
                          className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Timezone, Preview & Tenant Info */}
        <div className="space-y-6">
          {/* Timezone & Localization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Time Zone & Region</CardTitle>
              <CardDescription className="text-xs">
                Used for scheduling events and notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Primary Time Zone
                </label>
                <Select
                  value={churchForm.timezone || 'America/Chicago'}
                  onValueChange={(val) => handleInputChange('timezone', val)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Primary Currency
                </label>
                <Input value="INR (₹)" disabled className="bg-slate-50 dark:bg-slate-800/60" />
              </div>
            </CardContent>
          </Card>

          {/* Live Branding Preview */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-800/40">
              <CardTitle className="text-sm font-semibold">Branding Card Preview</CardTitle>
              <CardDescription className="text-xs">
                Live card representation for members.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                {churchForm.logo_url ? (
                  <img
                    src={churchForm.logo_url}
                    alt="Logo"
                    className="h-12 w-12 rounded-xl object-cover ring-2 ring-slate-100 shadow-sm"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 font-bold text-white shadow-sm">
                    <Building2 className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {churchForm.name || 'New Creation Assembly Church'}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {churchForm.tagline || 'Community Church'}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>
                    {churchForm.address ? `${churchForm.address}, ${churchForm.city || ''}` : 'Chennai, Tamil Nadu'}
                  </span>
                </div>
                {churchForm.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{churchForm.phone}</span>
                  </div>
                )}
                {churchForm.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{churchForm.website}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tenant Multi-Church Architecture Info */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 text-xs text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-300">
            <div className="flex items-center gap-2 font-semibold mb-1">
              <CheckCircle2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>Multi-Tenant Church Scope</span>
            </div>
            <p className="text-[11px] leading-relaxed text-sky-800 dark:text-sky-400">
              This church configuration is strictly isolated with unique UUID <code className="font-mono bg-sky-100 dark:bg-sky-900/40 px-1 py-0.5 rounded">{activeChurch?.id?.slice(0, 8)}...</code>.
              Other registered churches cannot access or alter these properties.
            </p>
          </div>
        </div>
      </form>

      <CreateChurchDialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createChurch}
      />
    </div>
  );
}
