import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { familyService, CreateFamilyPayload } from '@/services/familyService';
import { memberService } from '@/services/memberService';
import { Family, ChurchMember } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CanAccess } from '@/components/ui/can-access';
import { FamilyFormDialog } from '@/components/people/FamilyFormDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  HeartHandshake,
  Plus,
  Search,
  MapPin,
  Phone,
  Users,
  Edit2,
  Trash2,
  ArrowRight,
  Shield,
  User,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export function FamiliesPage() {
  const { activeChurch } = useAuth();
  const navigate = useNavigate();

  const [families, setFamilies] = useState<Family[]>([]);
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [familyToDelete, setFamilyToDelete] = useState<Family | null>(null);

  const loadData = async () => {
    if (!activeChurch) return;
    setIsLoading(true);
    setError(null);
    try {
      const [fams, mems] = await Promise.all([
        familyService.getFamilies(activeChurch.id),
        memberService.getMembers(activeChurch.id),
      ]);
      setFamilies(fams);
      setMembers(mems);
    } catch (err: any) {
      console.error('Failed to load families:', err);
      setError(err.message || 'Failed to load family households.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeChurch]);

  const handleCreateFamily = async (payload: CreateFamilyPayload) => {
    if (!activeChurch) return;
    const created = await familyService.createFamily(activeChurch.id, payload);
    setFamilies((prev) => [created, ...prev]);
    toast.success(`Family household "${payload.family_name}" created!`);
  };

  const handleUpdateFamily = async (payload: CreateFamilyPayload) => {
    if (!activeChurch || !editingFamily) return;
    const updated = await familyService.updateFamily(activeChurch.id, editingFamily.id, payload);
    setFamilies((prev) => prev.map((f) => (f.id === editingFamily.id ? updated : f)));
    toast.success(`Family household details updated!`);
    setEditingFamily(null);
  };

  const handleDeleteConfirm = async () => {
    if (!activeChurch || !familyToDelete) return;
    try {
      await familyService.deleteFamily(activeChurch.id, familyToDelete.id);
      setFamilies((prev) => prev.filter((f) => f.id !== familyToDelete.id));
      toast.success('Family household removed.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove family.');
    } finally {
      setFamilyToDelete(null);
    }
  };

  const filteredFamilies = families.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      f.family_name.toLowerCase().includes(term) ||
      (f.city || '').toLowerCase().includes(term) ||
      (f.phone || '').toLowerCase().includes(term) ||
      (f.address || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Family Households
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize congregation members into family units, manage household relationships, and shared contact details.
          </p>
        </div>

        <CanAccess permission="families:write">
          <Button
            size="sm"
            onClick={() => setIsAddOpen(true)}
            className="h-9 gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Plus className="h-4 w-4" />
            Add Family Household
          </Button>
        </CanAccess>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Search family name, address, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            className="h-9 text-xs"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{filteredFamilies.length}</span> households
        </div>
      </div>

      {/* Grid of Families */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : filteredFamilies.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="h-10 w-10 text-sky-600" />}
          title="No families found"
          description="Create your first household unit or adjust your search filter."
          actionLabel="Create Family Household"
          onAction={() => setIsAddOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredFamilies.map((family) => {
            const memberCount = family.members?.length || 1;
            return (
              <Card key={family.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <HeartHandshake className="h-5 w-5 text-sky-600" />
                      {family.family_name}
                    </CardTitle>
                    <Badge variant="blue" className="text-xs">
                      {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
                    </Badge>
                  </div>
                  {family.notes && (
                    <CardDescription className="text-xs line-clamp-1">{family.notes}</CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                  {family.primary_contact && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Primary: {family.primary_contact.display_name}
                      </span>
                    </div>
                  )}

                  {family.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {family.address}, {family.city} {family.state}
                      </span>
                    </div>
                  )}

                  {family.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{family.phone}</span>
                    </div>
                  )}

                  {/* Family Members Preview */}
                  {family.members && family.members.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Household Relationships
                      </span>
                      <div className="space-y-1">
                        {family.members.map((fm) => (
                          <div key={fm.id} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                            <span>{fm.profile?.display_name || 'Member'}</span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {fm.relationship}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingFamily(family)}
                      className="flex-1 h-8 text-xs gap-1"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFamilyToDelete(family)}
                      className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Family Dialog */}
      <FamilyFormDialog
        isOpen={isAddOpen || !!editingFamily}
        onClose={() => {
          setIsAddOpen(false);
          setEditingFamily(null);
        }}
        onSave={editingFamily ? handleUpdateFamily : handleCreateFamily}
        initialData={editingFamily}
        availableMembers={members}
        mode={editingFamily ? 'edit' : 'create'}
      />

      {/* Delete Family Dialog */}
      <Dialog open={!!familyToDelete} onOpenChange={(open) => !open && setFamilyToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Delete Family Household</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete <strong>{familyToDelete?.family_name}</strong>? Member records will remain intact but will be unlinked from this household.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFamilyToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete Household
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
