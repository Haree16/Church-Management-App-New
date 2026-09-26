import React, { useState } from 'react';
import { Member, PrayerRequest, ChurchTenant } from '../types';
import { exportDataAsJson, exportMembersToCsv, resetAllDataToDefault } from '../utils/storage';
import { Download, Database, RotateCcw, FileSpreadsheet, X, Check, Printer } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  currentChurch?: ChurchTenant;
  members?: Member[];
  prayers?: PrayerRequest[];
  onClose: () => void;
  onResetData: () => void;
  onOpenImport?: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  currentChurch,
  members = [],
  prayers = [],
  onClose,
  onResetData,
  onOpenImport,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const safeMembers = members || [];
  const safePrayers = prayers || [];

  const handleDownloadCsv = () => {
    const csvContent = exportMembersToCsv(safeMembers);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(currentChurch?.name || 'Church').replace(/\s+/g, '_')}_Member_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJsonBackup = () => {
    const jsonStr = exportDataAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(currentChurch?.name || 'Church').replace(/\s+/g, '_')}_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintDirectory = () => {
    window.print();
  };

  const handleReset = () => {
    if (confirm(`Are you sure you want to restore the default records for ${currentChurch?.name || 'this church'}? Any custom records added will be replaced with defaults.`)) {
      resetAllDataToDefault();
      onResetData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-5 flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-900 p-0.5 overflow-hidden border border-amber-400 shrink-0">
              <img 
                src={currentChurch?.logoUrl?.trim() || "/church_logo.jpg"} 
                alt="Church Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/church_logo.jpg')) {
                    target.src = '/church_logo.jpg';
                  }
                }}
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Data Management & Directory Export</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{currentChurch?.name || 'New Creation Assembly Church'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Body */}
        <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <p className="text-slate-500 dark:text-slate-400">
            Easily backup your church directory, export member contacts to Excel CSV, or print a physical membership sheet.
          </p>

          {onOpenImport && (
            <button
              onClick={() => {
                onClose();
                onOpenImport();
              }}
              className="w-full p-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border border-amber-400 rounded-2xl flex items-center justify-between transition shadow-sm group"
            >
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-6 h-6 text-slate-950 group-hover:scale-110 transition shrink-0" />
                <div className="text-left">
                  <span className="font-extrabold block text-sm">Bulk Import Members (CSV / Excel)</span>
                  <span className="text-xs text-slate-900/80 font-medium">Upload member list, validate records, detect duplicates & create accounts</span>
                </div>
              </div>
              <span className="bg-slate-950 text-amber-400 px-3 py-1 rounded-xl text-xs font-bold shrink-0">
                Import &rarr;
              </span>
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Export CSV */}
            <button
              onClick={handleDownloadCsv}
              className="p-4 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl flex flex-col items-start gap-2 text-left transition shadow-xs group"
            >
              <div className="flex items-center justify-between w-full">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition" />
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <span className="font-bold block text-sm">Export Members CSV</span>
                <span className="text-xs text-emerald-600/80 dark:text-emerald-400/80">Compatible with Excel, Google Sheets, & MailChimp</span>
              </div>
            </button>

            {/* Download JSON Backup */}
            <button
              onClick={handleDownloadJsonBackup}
              className="p-4 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl flex flex-col items-start gap-2 text-left transition shadow-xs group"
            >
              <div className="flex items-center justify-between w-full">
                <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition" />
                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <span className="font-bold block text-sm">Full App JSON Backup</span>
                <span className="text-xs text-indigo-600/80 dark:text-indigo-400/80">Includes members, prayer requests & service rosters</span>
              </div>
            </button>
          </div>

          {/* Print Directory Button */}
          <button
            onClick={handlePrintDirectory}
            className="w-full p-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Print Membership Directory Sheet</span>
          </button>

          {/* Reset to Initial Sample Data */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 p-3.5 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-rose-800 dark:text-rose-300 text-xs block">Restore Sample Data</span>
                <span className="text-[11px] text-rose-600/90 dark:text-rose-400/90 block">Resets members and prayers back to initial defaults.</span>
              </div>
              <button
                onClick={handleReset}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shrink-0 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
