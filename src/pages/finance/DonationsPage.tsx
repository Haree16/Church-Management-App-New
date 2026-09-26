import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Donation,
  DonationFund,
  PaymentMethod,
  DonationStatus,
} from '@/types/database';
import {
  financeService,
  CreateDonationPayload,
  UpdateDonationPayload,
  PAYMENT_METHODS,
} from '@/services/financeService';
import { DonationFormDialog } from '@/components/finance/DonationFormDialog';
import { BatchDonationDialog } from '@/components/finance/BatchDonationDialog';
import { DonationDetailModal } from '@/components/finance/DonationDetailModal';
import { ArchiveDonationDialog } from '@/components/finance/ArchiveDonationDialog';
import { FinanceAuditLogModal } from '@/components/finance/FinanceAuditLogModal';
import { GivingStatementModal } from '@/components/finance/GivingStatementModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { DEMO_MEMBERS } from '@/lib/mockData';
import {
  DollarSign,
  Plus,
  Layers,
  Search,
  Download,
  Printer,
  History,
  Calendar,
  Filter,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  User,
  CreditCard,
  Building,
  Shield,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export function DonationsPage() {
  const { activeChurch, currentRole, user, profile } = useAuth();
  const churchId = activeChurch?.id || 'a0000000-0000-0000-0000-000000000001';

  const [donations, setDonations] = useState<Donation[]>([]);
  const [funds, setFunds] = useState<DonationFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFund, setSelectedFund] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('completed');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog States
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);

  const [selectedDonationDetail, setSelectedDonationDetail] = useState<Donation | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [archivingDonation, setArchivingDonation] = useState<Donation | null>(null);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  const canManage = ['super_admin', 'church_admin'].includes(currentRole || '');
  const authorInfo = {
    userId: user?.id,
    userName: profile?.display_name || user?.email?.split('@')[0] || 'Finance Admin',
    userRole: currentRole ? currentRole.replace('_', ' ').toUpperCase() : 'Admin',
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dons, fnds] = await Promise.all([
        financeService.getDonations(churchId, currentRole, user?.id),
        financeService.getFunds(churchId, true),
      ]);
      setDonations(dons);
      setFunds(fnds);

      if (selectedDonationDetail) {
        const refreshed = dons.find((d) => d.id === selectedDonationDetail.id);
        if (refreshed) setSelectedDonationDetail(refreshed);
      }
    } catch (err) {
      console.error('Failed to load donations:', err);
      toast.error('Failed to fetch donations data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [churchId, currentRole, user?.id]);

  // Handlers
  const handleCreateOrUpdate = async (payload: CreateDonationPayload | UpdateDonationPayload) => {
    if (formMode === 'create') {
      await financeService.createDonation(churchId, payload as CreateDonationPayload, authorInfo);
    } else if (editingDonation) {
      await financeService.updateDonation(churchId, editingDonation.id, payload as UpdateDonationPayload, authorInfo);
    }
    await loadData();
  };

  const handleSaveBatch = async (payloads: CreateDonationPayload[]) => {
    await financeService.createBatchDonations(churchId, payloads, authorInfo);
    await loadData();
  };

  const handleArchive = async (reason: string) => {
    if (!archivingDonation) return;
    await financeService.archiveDonation(churchId, archivingDonation.id, reason, authorInfo);
    await loadData();
  };

  const handleDelete = async (donationId: string) => {
    await financeService.deleteDonation(churchId, donationId, authorInfo);
    toast.info('Donation permanently deleted.');
    if (selectedDonationDetail?.id === donationId) {
      setIsDetailModalOpen(false);
      setSelectedDonationDetail(null);
    }
    await loadData();
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredDonations.length === 0) {
      toast.error('No donation records matching filter criteria.');
      return;
    }

    const headers = ['Ref / Receipt #', 'Date', 'Donor Name', 'Donor Email', 'Amount', 'Currency', 'Fund Name', 'Payment Method', 'Tax Deductible', 'Status', 'Notes'];
    const rows = filteredDonations.map((d) => [
      `"${d.reference_number || d.id}"`,
      `"${d.donation_date}"`,
      `"${(d.donor_name || '').replace(/"/g, '""')}"`,
      `"${(d.donor_email || '').replace(/"/g, '""')}"`,
      `"${Number(d.amount).toFixed(2)}"`,
      `"${d.currency || 'INR'}"`,
      `"${d.fund_name}"`,
      `"${d.payment_method}"`,
      `"${d.is_tax_deductible ? 'Yes' : 'No'}"`,
      `"${d.status}"`,
      `"${(d.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `donations_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Donations ledger exported as CSV.');
  };

  // Filter Logic
  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      // 1. Status Filter
      if (selectedStatus !== 'all' && d.status !== selectedStatus) {
        return false;
      }

      // 2. Fund Filter
      if (selectedFund !== 'all') {
        if (d.fund_id && d.fund_id !== selectedFund && d.fund_name.toLowerCase() !== selectedFund.toLowerCase()) {
          return false;
        }
        if (!d.fund_id && d.fund_name.toLowerCase() !== selectedFund.toLowerCase()) {
          return false;
        }
      }

      // 3. Payment Method
      if (selectedMethod !== 'all' && d.payment_method !== selectedMethod) {
        return false;
      }

      // 4. Amount Range
      const amt = Number(d.amount);
      if (minAmount && amt < parseFloat(minAmount)) return false;
      if (maxAmount && amt > parseFloat(maxAmount)) return false;

      // 5. Date Range
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentYearStr = `${now.getFullYear()}`;
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      if (dateFilter === 'today' && d.donation_date !== todayStr) return false;
      if (dateFilter === 'this_month' && !d.donation_date.startsWith(currentMonthStr)) return false;
      if (dateFilter === 'this_year' && !d.donation_date.startsWith(currentYearStr)) return false;
      if (dateFilter === 'custom') {
        if (customStartDate && d.donation_date < customStartDate) return false;
        if (customEndDate && d.donation_date > customEndDate) return false;
      }

      // 6. Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesDonor = (d.donor_name || '').toLowerCase().includes(term);
        const matchesRef = (d.reference_number || '').toLowerCase().includes(term);
        const matchesFund = (d.fund_name || '').toLowerCase().includes(term);
        const matchesNotes = (d.notes || '').toLowerCase().includes(term);
        if (!matchesDonor && !matchesRef && !matchesFund && !matchesNotes) return false;
      }

      return true;
    });
  }, [donations, selectedStatus, selectedFund, selectedMethod, minAmount, maxAmount, dateFilter, customStartDate, customEndDate, searchTerm]);

  // Summary Metrics for currently filtered dataset
  const filteredMetrics = useMemo(() => {
    const total = filteredDonations.reduce((acc, d) => acc + Number(d.amount), 0);
    const donorSet = new Set<string>();
    filteredDonations.forEach((d) => donorSet.add(d.donor_name));
    const avg = filteredDonations.length > 0 ? total / filteredDonations.length : 0;
    return { total, donorsCount: donorSet.size, avg, count: filteredDonations.length };
  }, [filteredDonations]);

  // Pagination
  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage) || 1;
  const paginatedDonations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDonations.slice(start, start + itemsPerPage);
  }, [filteredDonations, currentPage]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            Donations & Contributions Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Secure accounting records, Sunday batch envelope entry, donor tax receipts, and audit logs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAuditModalOpen(true)}
                className="h-9 gap-1.5 text-xs"
              >
                <History className="h-4 w-4" />
                Audit Trail
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsStatementModalOpen(true)}
                className="h-9 gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-200"
              >
                <FileText className="h-4 w-4 text-emerald-600" />
                Giving Statements
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsBatchDialogOpen(true)}
                className="h-9 gap-1.5 text-xs bg-slate-50 dark:bg-slate-800"
              >
                <Layers className="h-4 w-4 text-emerald-600" />
                Fast Batch Entry
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setEditingDonation(null);
                  setFormMode('create');
                  setIsFormDialogOpen(true);
                }}
                className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
              >
                <Plus className="h-4 w-4" />
                Record Donation
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-emerald-100 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Total Filtered Amount</span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
              ${filteredMetrics.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400">{filteredMetrics.count} transactions matching</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Unique Donors</span>
              <User className="h-4 w-4 text-sky-600" />
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
              {filteredMetrics.donorsCount}
            </p>
            <span className="text-[10px] text-slate-400">Contributing households / guests</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Average Gift</span>
              <CreditCard className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
              ${filteredMetrics.avg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[10px] text-slate-400">Average per transaction</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Active Funds</span>
              <Building className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1">
              {funds.filter((f) => f.is_active).length}
            </p>
            <span className="text-[10px] text-slate-400">Chart of accounts & ministries</span>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Filter Controls Toolbar */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search */}
          <div className="sm:col-span-4 relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search donor name, check/ref #, memo..."
              className="pl-8 h-8 text-xs bg-white dark:bg-slate-800"
            />
          </div>

          {/* Fund Filter */}
          <div className="sm:col-span-3">
            <Select
              value={selectedFund}
              onValueChange={(val) => {
                setSelectedFund(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800">
                <SelectValue placeholder="Fund: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designated Funds</SelectItem>
                {funds.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} ({f.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="sm:col-span-3">
            <Select
              value={selectedMethod}
              onValueChange={(val) => {
                setSelectedMethod(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800">
                <SelectValue placeholder="Method: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Methods</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="sm:col-span-2">
            <Select
              value={selectedStatus}
              onValueChange={(val) => {
                setSelectedStatus(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800">
                <SelectValue placeholder="Status: Completed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed Active</SelectItem>
                <SelectItem value="archived">Archived / Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Date Filters & Export */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={dateFilter}
              onValueChange={(val) => {
                setDateFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-7 text-[11px] w-36 bg-white dark:bg-slate-800">
                <SelectValue placeholder="Period: All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="this_year">This Tax Year</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === 'custom' && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-7 text-[11px] w-32 bg-white dark:bg-slate-800"
                />
                <span className="text-slate-400">to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-7 text-[11px] w-32 bg-white dark:bg-slate-800"
                />
              </div>
            )}

            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="Min $"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="h-7 text-[11px] w-20 bg-white dark:bg-slate-800 font-mono"
              />
              <span className="text-slate-400">-</span>
              <Input
                type="number"
                placeholder="Max $"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="h-7 text-[11px] w-20 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              className="h-7 text-xs gap-1.5 bg-white dark:bg-slate-800"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={loadData}
              className="h-7 text-xs gap-1"
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Donations Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
          Loading contributions ledger...
        </div>
      ) : paginatedDonations.length === 0 ? (
        <EmptyState
          icon={<DollarSign className="h-10 w-10 text-emerald-600" />}
          title={
            searchTerm || selectedFund !== 'all' || selectedMethod !== 'all' || minAmount || maxAmount
              ? 'No matching donations found'
              : 'No donations recorded yet'
          }
          description="Record tithes, offering envelopes, and pledges to keep church finances organized."
          actionLabel={canManage ? 'Record First Donation' : undefined}
          onAction={canManage ? () => {
            setEditingDonation(null);
            setFormMode('create');
            setIsFormDialogOpen(true);
          } : undefined}
        />
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="p-3 pl-4">Donor / Member</th>
                    <th className="p-3">Designated Fund</th>
                    <th className="p-3">Payment Method</th>
                    <th className="p-3">Ref / Check #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Amount ($)</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedDonations.map((tx) => {
                    const methodObj = PAYMENT_METHODS.find((m) => m.value === tx.payment_method);
                    return (
                      <tr
                        key={tx.id}
                        onClick={() => {
                          setSelectedDonationDetail(tx);
                          setIsDetailModalOpen(true);
                        }}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="p-3 pl-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {tx.donor_name}
                          </div>
                          {tx.member_id && (
                            <span className="text-[10px] text-slate-400">Member</span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {tx.fund?.color && (
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tx.fund.color }} />
                            )}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {tx.fund_name}
                            </span>
                          </div>
                        </td>

                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {methodObj?.label || tx.payment_method}
                        </td>

                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {tx.reference_number || '-'}
                        </td>

                        <td className="p-3 text-slate-500">
                          {formatDate(tx.donation_date)}
                        </td>

                        <td className="p-3">
                          <Badge
                            variant={tx.status === 'completed' ? 'emerald' : tx.status === 'archived' ? 'amber' : 'outline'}
                            className="text-[10px] capitalize"
                          >
                            {tx.status}
                          </Badge>
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                          ${Number(tx.amount).toFixed(2)}
                        </td>

                        <td className="p-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-emerald-600"
                              onClick={() => {
                                setSelectedDonationDetail(tx);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 text-xs text-slate-400">
              <span>
                Showing <strong className="text-white font-bold">{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong className="text-white font-bold">{Math.min(currentPage * itemsPerPage, filteredDonations.length)}</strong> of <strong className="text-white font-bold">{filteredDonations.length}</strong> records
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog Modals */}
      <DonationFormDialog
        isOpen={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        onSave={handleCreateOrUpdate}
        funds={funds}
        initialData={editingDonation}
        mode={formMode}
      />

      <BatchDonationDialog
        isOpen={isBatchDialogOpen}
        onClose={() => setIsBatchDialogOpen(false)}
        onSaveBatch={handleSaveBatch}
        funds={funds}
      />

      <DonationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDonationDetail(null);
        }}
        donation={selectedDonationDetail}
        onEdit={(d) => {
          setIsDetailModalOpen(false);
          setEditingDonation(d);
          setFormMode('edit');
          setIsFormDialogOpen(true);
        }}
        onArchive={(d) => {
          setIsDetailModalOpen(false);
          setArchivingDonation(d);
          setIsArchiveDialogOpen(true);
        }}
        onDelete={handleDelete}
        currentUserRole={currentRole}
      />

      <ArchiveDonationDialog
        isOpen={isArchiveDialogOpen}
        onClose={() => {
          setIsArchiveDialogOpen(false);
          setArchivingDonation(null);
        }}
        onConfirm={handleArchive}
        donationInfo={
          archivingDonation
            ? {
                donor: archivingDonation.donor_name,
                amount: Number(archivingDonation.amount),
                fund: archivingDonation.fund_name,
                refNumber: archivingDonation.reference_number,
              }
            : null
        }
      />

      <FinanceAuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        churchId={churchId}
      />

      <GivingStatementModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        churchId={churchId}
        funds={funds}
      />
    </div>
  );
}
export default DonationsPage;
