import React from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200 dark:bg-slate-900">
        <button
          onClick={onClose}
          className="absolute right-3 top-4 z-50 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close sidebar</span>
        </button>

        <Sidebar onClose={onClose} className="border-r-0" />
      </div>
    </div>
  );
}
