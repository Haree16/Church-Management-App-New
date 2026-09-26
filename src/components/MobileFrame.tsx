import React from 'react';
import { Wifi, Signal, Battery, Smartphone } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  isMobileFrame,
  onToggleFrame
}) => {
  if (!isMobileFrame) {
    return <div className="min-h-full flex flex-col flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">{children}</div>;
  }

  // Current simulated mobile time (Android style 12-hr format)
  const timeString = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-200/70 dark:bg-slate-950 py-4 px-2 sm:px-4 flex flex-col items-center justify-center font-sans transition-colors">
      {/* Android Phone Frame Outer Shell */}
      <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-[36px] border-[8px] border-slate-300 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col relative my-2 ring-1 ring-black/10 dark:ring-white/10">
        
        {/* Android Material Status Bar */}
        <div className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-white px-5 pt-2 pb-1.5 flex items-center justify-between z-40 select-none border-b border-slate-200 dark:border-slate-800/40">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 tracking-tight">{timeString}</span>
            <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded font-bold">5G</span>
          </div>
          
          {/* Centered Android Punch-hole Selfie Camera */}
          <div className="w-3.5 h-3.5 bg-black rounded-full ring-2 ring-slate-300 dark:ring-slate-800/80 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-blue-900/50"></div>
          </div>

          {/* Android Status Icons */}
          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-300">
            <Signal className="w-3 h-3 text-slate-600 dark:text-slate-200" />
            <Wifi className="w-3 h-3 text-slate-600 dark:text-slate-200" />
            <div className="flex items-center space-x-0.5">
              <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">98%</span>
              <Battery className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 fill-current" />
            </div>
          </div>
        </div>

        {/* Android App Screen Body */}
        <div className="bg-slate-50 dark:bg-slate-950 flex-1 overflow-y-auto h-[680px] sm:h-[720px] flex flex-col relative">
          {children}
        </div>

        {/* Android 14/15 Gesture Navigation Bar */}
        <div className="bg-slate-100 dark:bg-slate-950 py-2.5 flex items-center justify-center z-40 border-t border-slate-200 dark:border-slate-800/40">
          <div className="w-32 h-1 bg-slate-400 dark:bg-slate-500 rounded-full"></div>
        </div>
      </div>

      {/* Frame Toggle Button */}
      <div className="mt-2 text-center">
        <button
          onClick={onToggleFrame}
          className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1.5 mx-auto bg-slate-900/80 px-3.5 py-1.5 rounded-full border border-slate-800 transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Toggle Android Phone Frame / Full Responsive View</span>
        </button>
      </div>
    </div>
  );
};

