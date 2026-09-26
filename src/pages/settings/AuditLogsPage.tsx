import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuditLog } from '@/types/database';
import { auditService } from '@/services/auditService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Shield,
  Search,
  RefreshCw,
  Clock,
  User,
  Activity,
  FileText,
  DollarSign,
  Heart,
  Baby,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';

export function AuditLogsPage() {
  const { activeChurch } = useAuth();
  const churchId = activeChurch?.id || 'a0000000-0000-0000-0000-000000000001';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getAuditLogs(churchId, resourceFilter);
      setLogs(data);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
      toast.error('Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [churchId, resourceFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesAction = l.action.toLowerCase().includes(q);
        const matchesResource = l.resource_type.toLowerCase().includes(q);
        const matchesIp = (l.ip_address || '').toLowerCase().includes(q);
        const matchesDetails = JSON.stringify(l.details || {}).toLowerCase().includes(q);
        if (!matchesAction && !matchesResource && !matchesIp && !matchesDetails) return false;
      }
      return true;
    });
  }, [logs, searchTerm]);

  const getResourceIcon = (res: string) => {
    switch (res) {
      case 'donations':
        return <DollarSign className="h-4 w-4 text-emerald-600" />;
      case 'members':
        return <User className="h-4 w-4 text-sky-600" />;
      case 'prayer_requests':
        return <Heart className="h-4 w-4 text-rose-600" />;
      case 'children':
        return <Baby className="h-4 w-4 text-emerald-600" />;
      case 'church_settings':
        return <Sliders className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-500" />;
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
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
            <Shield className="h-6 w-6 text-sky-600" />
            Security Audit Trail & Activity Logs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable audit record of financial transactions, member profile changes, prayer answers, and system configurations.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadLogs}
          className="h-9 gap-1.5 text-xs self-start sm:self-auto"
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Logs
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search action, actor, IP, or payload..."
              className="pl-8 h-8 text-xs bg-white dark:bg-slate-800"
            />
          </div>

          <Select value={resourceFilter} onValueChange={setResourceFilter}>
            <SelectTrigger className="h-8 text-xs w-48 bg-white dark:bg-slate-800">
              <SelectValue placeholder="Resource: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="members">Members</SelectItem>
              <SelectItem value="donations">Donations & Giving</SelectItem>
              <SelectItem value="prayer_requests">Prayer Requests</SelectItem>
              <SelectItem value="children">Children's Ministry</SelectItem>
              <SelectItem value="church_settings">Church Settings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          Showing <strong className="text-white font-bold">{filteredLogs.length}</strong> audit event{filteredLogs.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading audit trail...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<Shield className="h-10 w-10 text-slate-400" />}
                title="No audit events logged"
                description="Events will appear here as administrative actions and modifications occur."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="p-3 pl-4">Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Resource</th>
                    <th className="p-3">Event Details</th>
                    <th className="p-3 pr-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 pl-4 text-slate-500 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>

                      <td className="p-3">
                        <Badge variant="outline" className="font-mono text-[10px] text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40">
                          {log.action}
                        </Badge>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5 capitalize text-slate-700 dark:text-slate-300">
                          {getResourceIcon(log.resource_type)}
                          <span>{log.resource_type.replace('_', ' ')}</span>
                        </div>
                      </td>

                      <td className="p-3 font-sans text-xs text-slate-600 dark:text-slate-300 max-w-md truncate">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)}
                      </td>

                      <td className="p-3 pr-4 text-slate-400">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export default AuditLogsPage;
