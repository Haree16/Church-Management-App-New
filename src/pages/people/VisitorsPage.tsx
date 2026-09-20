import React, { useState, useEffect, useMemo } from 'react';
import { visitorService, CreateVisitorPayload } from '@/services/visitorService';
import { followUpService } from '@/services/followUpService';
import { Visitor, VisitorStatus, FollowUp } from '@/types/database';
import { VisitorFormDialog } from '@/components/people/VisitorFormDialog';
import { ConvertVisitorDialog } from '@/components/people/ConvertVisitorDialog';
import { DuplicatePersonCheckModal } from '@/components/people/DuplicatePersonCheckModal';
import { Visitor360Profile } from '@/components/visitors/Visitor360Profile';
import { VisitorPipelineWidget } from '@/components/visitors/VisitorPipelineWidget';
import { FollowUpQueueView } from '@/components/visitors/FollowUpQueueView';
import { VisitorDashboardView } from '@/components/visitors/VisitorDashboardView';
import { AutomatedVisitorFollowUpDashboard } from '@/components/visitors/AutomatedVisitorFollowUpDashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  UserPlus,
  AlertTriangle,
  Users,
  LayoutGrid,
  List,
  BarChart2,
  CheckSquare,
  Filter,
  X,
  ChevronRight,
  Heart,
} from 'lucide-react';
import { toast } from 'sonner';

type VisitorViewMode = 'dashboard' | 'pipeline' | 'directory' | 'followups' | 'automated-followups';

interface VisitorsPageProps {
  currentChurch?: any;
  currentUser?: any;
}

export function VisitorsPage({ currentChurch: propChurch, currentUser: propUser }: VisitorsPageProps = {}) {
  const auth = useAuth();
  const activeChurch = propChurch || auth?.activeChurch;
  const user = propUser || auth?.user;

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [viewMode, setViewMode] = useState<VisitorViewMode>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Visitor 360 State
  const [selectedVisitor360, setSelectedVisitor360] = useState<Visitor | null>(null);

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [convertingVisitor, setConvertingVisitor] = useState<Visitor | null>(null);
  const [visitorToDelete, setVisitorToDelete] = useState<Visitor | null>(null);

  // Duplicate Check Modal State
  const [duplicateMatches, setDuplicateMatches] = useState<{ visitors: Visitor[]; members: any[] } | null>(null);
  const [pendingPayload, setPendingPayload] = useState<CreateVisitorPayload | null>(null);

  const loadData = async () => {
    if (!activeChurch) return;
    setIsLoading(true);
    setError(null);
    try {
      const visitorsData = await visitorService.getVisitors(activeChurch.id);
      const followUpsData = await followUpService.getFollowUps(activeChurch.id);
      setVisitors(visitorsData);
      setFollowUps(followUpsData);

      setSelectedVisitor360((prev) => {
        if (!prev) return null;
        const updated = visitorsData.find((v) => v.id === prev.id);
        return updated || prev;
      });
    } catch (err: any) {
      console.error('Failed to load visitor data:', err);
      setError(err.message || 'Failed to load guest records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeChurch]);

  const handleCreateVisitorRequest = async (payload: CreateVisitorPayload) => {
    if (!activeChurch) return;

    // Perform duplicate check
    const matches = await visitorService.checkPossibleDuplicates(activeChurch.id, {
      phone: payload.phone,
      email: payload.email,
      first_name: payload.first_name,
      last_name: payload.last_name,
    });

    if (matches.visitors.length > 0 || matches.members.length > 0) {
      setPendingPayload(payload);
      setDuplicateMatches(matches);
      return;
    }

    await proceedWithVisitorCreation(payload);
  };

  const proceedWithVisitorCreation = async (payload: CreateVisitorPayload) => {
    if (!activeChurch) return;
    const created = await visitorService.createVisitor(activeChurch.id, payload);
    setVisitors((prev) => [created, ...prev]);
    toast.success(`Sunday Guest "${payload.first_name} ${payload.last_name}" recorded successfully!`);
    setDuplicateMatches(null);
    setPendingPayload(null);
    loadData();
  };

  const handleUpdateVisitor = async (payload: CreateVisitorPayload) => {
    if (!activeChurch || !editingVisitor) return;
    const updated = await visitorService.updateVisitor(activeChurch.id, editingVisitor.id, payload);
    setVisitors((prev) => prev.map((v) => (v.id === editingVisitor.id ? updated : v)));
    toast.success('Visitor record updated.');
    setEditingVisitor(null);
    if (selectedVisitor360?.id === editingVisitor.id) {
      setSelectedVisitor360(updated);
    }
  };

  const handleStatusChange = async (visitorId: string, newStatus: VisitorStatus) => {
    if (!activeChurch) return;
    try {
      const updated = await visitorService.updateVisitor(activeChurch.id, visitorId, { status: newStatus });
      setVisitors((prev) => prev.map((v) => (v.id === visitorId ? updated : v)));
      toast.success(`Visitor stage updated to ${newStatus.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error('Failed to update stage.');
    }
  };

  const handleConvertVisitor = async (visitorId: string, memberPayload: any) => {
    if (!activeChurch) return;
    await visitorService.convertVisitorToMember(activeChurch.id, visitorId, memberPayload);
    toast.success('Visitor successfully converted to Member!');
    setConvertingVisitor(null);
    loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!activeChurch || !visitorToDelete) return;
    try {
      await visitorService.deleteVisitor(activeChurch.id, visitorToDelete.id);
      setVisitors((prev) => prev.filter((v) => v.id !== visitorToDelete.id));
      toast.success('Visitor record deleted.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete visitor.');
    } finally {
      setVisitorToDelete(null);
    }
  };

  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      const name = `${v.first_name} ${v.last_name}`.toLowerCase();
      const email = (v.email || '').toLowerCase();
      const phone = (v.phone || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch = term === '' || name.includes(term) || email.includes(term) || phone.includes(term);
      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [visitors, searchTerm, statusFilter]);

  const getStatusBadge = (status: VisitorStatus) => {
    switch (status) {
      case 'new':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">New Guest</span>;
      case 'contact_pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">Contact Pending</span>;
      case 'contacted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-950 text-sky-300 border border-sky-800">Contacted</span>;
      case 'follow_up_scheduled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">Follow-up Scheduled</span>;
      case 'follow_up_completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800">Follow-up Completed</span>;
      case 'returned_visitor':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-950 text-teal-300 border border-teal-800">Returned Visitor</span>;
      case 'regular_attendee':
      case 'regular_attender':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">Regular Attendee</span>;
      case 'became_member':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-950 text-violet-300 border border-violet-800">Became Member</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">{status.replace(/_/g, ' ')}</span>;
    }
  };

  return (
    <div className="space-y-4 text-slate-100 w-full max-w-full overflow-hidden">
      {/* Top Banner Header matching CMS dark design */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Visitor Management & Follow-up
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
              Capture Sunday guest cards, automate pastoral care follow-ups, track return visits, and convert guests into covenant members.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1.5 shrink-0"
        >
          <UserPlus className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span>+ Record Sunday Guest</span>
        </button>
      </div>

      {/* Main View Switcher Tabs matching CMS dark design */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none max-w-full pb-0.5">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
              viewMode === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4 shrink-0" />
            <span>Dashboard & Analytics</span>
          </button>

          <button
            onClick={() => setViewMode('pipeline')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
              viewMode === 'pipeline'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Stage Pipeline</span>
          </button>

          <button
            onClick={() => setViewMode('directory')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
              viewMode === 'directory'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <List className="w-4 h-4 shrink-0" />
            <span>Guest Directory ({visitors.length})</span>
          </button>

          <button
            onClick={() => setViewMode('followups')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
              viewMode === 'followups'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span>Follow-ups Queue ({followUps.length})</span>
          </button>

          <button
            onClick={() => setViewMode('automated-followups')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
              viewMode === 'automated-followups'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Automated Follow-ups</span>
          </button>
        </div>
      </div>

      {/* Render Active View */}
      {viewMode === 'automated-followups' && (
        <AutomatedVisitorFollowUpDashboard
          currentChurch={activeChurch || { id: 'church-1', name: 'My Church' }}
          currentUser={user}
          visitors={visitors}
        />
      )}

      {viewMode === 'dashboard' && (
        <VisitorDashboardView
          visitors={visitors}
          followUps={followUps}
          onSelectVisitor={(v) => setSelectedVisitor360(v)}
          onOpenAddVisitor={() => setIsAddOpen(true)}
        />
      )}

      {viewMode === 'pipeline' && (
        <VisitorPipelineWidget
          visitors={visitors}
          onSelectVisitor={(v) => setSelectedVisitor360(v)}
          onStatusChange={handleStatusChange}
        />
      )}

      {viewMode === 'followups' && (
        <FollowUpQueueView
          churchId={activeChurch?.id || ''}
          currentUserId={user?.id}
          onSelectVisitor={(visitorId) => {
            const v = visitors.find((x) => x.id === visitorId);
            if (v) setSelectedVisitor360(v);
          }}
        />
      )}

      {viewMode === 'directory' && (
        <div className="space-y-4">
          {/* Search & Action Bar */}
          <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-xl space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by visitor name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 text-white placeholder-slate-400 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar scrollbar-none text-xs -mx-0.5 px-0.5">
              <span className="text-slate-400 font-medium px-1 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" /> Stage:
              </span>
              {[
                { key: 'ALL', label: 'All Guests' },
                { key: 'new', label: 'New Guest' },
                { key: 'contact_pending', label: 'Contact Pending' },
                { key: 'contacted', label: 'Contacted' },
                { key: 'follow_up_scheduled', label: 'Follow-up Scheduled' },
                { key: 'returned_visitor', label: 'Returned Visitor' },
                { key: 'became_member', label: 'Became Member' },
              ].map((st) => (
                <button
                  key={st.key}
                  onClick={() => setStatusFilter(st.key)}
                  className={`px-2.5 py-1 rounded-lg border font-medium shrink-0 transition ${
                    statusFilter === st.key
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-extrabold'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>
                Showing <strong className="text-white">{filteredVisitors.length}</strong> of{' '}
                <strong className="text-white">{visitors.length}</strong> recorded guest cards
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">Loading guest records...</div>
            ) : filteredVisitors.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm space-y-3">
                <UserCheck className="w-12 h-12 text-slate-500 mx-auto" />
                <p className="font-semibold text-white">No visitors found.</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {searchTerm || statusFilter !== 'ALL'
                    ? 'No visitor records match your selected search or filters.'
                    : 'Get started by recording your first Sunday guest connection!'}
                </p>
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow hover:bg-amber-400 transition"
                >
                  + Add Visitor Card
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filteredVisitors.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVisitor360(v)}
                    className="p-4 hover:bg-slate-800/60 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-base flex items-center justify-center shadow-md shrink-0">
                        {v.first_name?.[0]}
                        {v.last_name?.[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-white text-sm">
                            {v.first_name} {v.last_name}
                          </span>
                          {getStatusBadge(v.status)}
                          {(v.visit_count || 1) > 1 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
                              🔁 {v.visit_count} Visits
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                          {v.phone && <span>📞 {v.phone}</span>}
                          {v.email && <span>✉️ {v.email}</span>}
                          <span>📅 First visit: {v.first_visit_date || v.visit_date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedVisitor360(v)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
                      >
                        View 360° Profile
                      </button>

                      {v.status !== 'became_member' && (
                        <button
                          onClick={() => setConvertingVisitor(v)}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-xl transition flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Convert
                        </button>
                      )}

                      <button
                        onClick={() => setVisitorToDelete(v)}
                        className="px-2.5 py-1.5 text-xs font-bold text-rose-400 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/80 rounded-xl transition flex items-center gap-1"
                        title="Delete Guest Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visitor 360° Modal */}
      {selectedVisitor360 && (
        <Visitor360Profile
          visitor={selectedVisitor360}
          isOpen={!!selectedVisitor360}
          onClose={() => setSelectedVisitor360(null)}
          onUpdate={loadData}
          onConvert={(v) => {
            setSelectedVisitor360(null);
            setConvertingVisitor(v);
          }}
          onEdit={(v) => {
            setSelectedVisitor360(null);
            setEditingVisitor(v);
          }}
          onDelete={(v) => {
            setSelectedVisitor360(null);
            setVisitorToDelete(v);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!visitorToDelete} onOpenChange={(open) => !open && setVisitorToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 text-white border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500" /> Delete Guest Record?
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              This will permanently delete the visitor record for{' '}
              <strong className="text-white">
                {visitorToDelete?.first_name} {visitorToDelete?.last_name}
              </strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setVisitorToDelete(null)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} className="bg-rose-600 hover:bg-rose-500 text-white font-bold">
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Guest Dialog */}
      <VisitorFormDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleCreateVisitorRequest}
        mode="create"
      />

      {/* Edit Guest Dialog */}
      {editingVisitor && (
        <VisitorFormDialog
          isOpen={!!editingVisitor}
          onClose={() => setEditingVisitor(null)}
          onSave={handleUpdateVisitor}
          initialData={editingVisitor}
          mode="edit"
        />
      )}

      {/* Convert Visitor Dialog */}
      {convertingVisitor && (
        <ConvertVisitorDialog
          isOpen={!!convertingVisitor}
          onClose={() => setConvertingVisitor(null)}
          visitor={convertingVisitor}
          onConvert={handleConvertVisitor}
        />
      )}

      {/* Duplicate Check Modal */}
      {duplicateMatches && (
        <DuplicatePersonCheckModal
          isOpen={!!duplicateMatches}
          onClose={() => {
            setDuplicateMatches(null);
            setPendingPayload(null);
          }}
          duplicates={duplicateMatches}
          onProceedAnyway={() => {
            if (pendingPayload) proceedWithVisitorCreation(pendingPayload);
          }}
          onSelectExistingVisitor={(v) => {
            setDuplicateMatches(null);
            setPendingPayload(null);
            setIsAddOpen(false);
            setSelectedVisitor360(v);
          }}
        />
      )}
    </div>
  );
}
