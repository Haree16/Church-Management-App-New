import React, { useState, useEffect } from 'react';
import { Smartphone, Download, CheckCircle, Share2, Sparkles, Shield, Wifi, X, QrCode } from 'lucide-react';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setDeferredPrompt(null);
      }
    } else {
      // Fallback instruction for Android Chrome
      alert('To install on Android:\n1. Tap the 3-dots menu (⋮) in Chrome browser.\n2. Tap "Add to Home screen" or "Install app".');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 text-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Android Green Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-5 flex items-center justify-between border-b border-emerald-500/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 p-2 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-white">Android Mobile App</h2>
                <span className="text-[10px] font-semibold bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded-full">v3.2</span>
              </div>
              <p className="text-[11px] text-slate-400">New Creation Assembly Church</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-300 max-h-[75vh] overflow-y-auto">
          {/* App Card Preview */}
          <div className="flex items-center gap-3 p-3.5 bg-slate-800 border border-slate-700 rounded-2xl">
            <img 
              src="/church_logo.jpg" 
              alt="NCA Logo" 
              className="w-12 h-12 rounded-xl object-cover border border-amber-400/40 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-sm truncate">New Creation Assembly</h3>
              <p className="text-[11px] text-slate-400">Android PWA / WebAPK</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-medium px-1.5 py-0.2 rounded">Fast & Offline</span>
                <span className="text-[10px] bg-slate-700 text-slate-300 font-medium px-1.5 py-0.2 rounded">No App Store Login Required</span>
              </div>
            </div>
          </div>

          {/* Quick Install Action */}
          {installSuccess || isInstalled ? (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-2xl flex items-center gap-2 text-emerald-300">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-xs font-semibold">Installed on Android! You can open this app from your Android home screen.</p>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-2xl shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>Install to Android Home Screen</span>
            </button>
          )}

          {/* Android Features Checklist */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider text-[11px]">Android App Capabilities:</h4>
            
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <Wifi className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Instant Real-time Cloud Sync:</strong>
                  <p className="text-slate-400 text-[11px]">Prayers, events, Sunday school, and rosters sync live across all pastors and members.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">100% Native Android Feel:</strong>
                  <p className="text-slate-400 text-[11px]">Runs without browser bars, supports full swipe gestures, and launches directly from Android app drawer.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <Share2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Direct WhatsApp Integration:</strong>
                  <p className="text-slate-400 text-[11px]">Send 1-click prayer alerts and Sunday reminders straight into Android WhatsApp.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Android Manual Install Steps */}
          <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-2xl text-[11px] text-amber-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Manual Install on Android Phone (Chrome / Samsung Internet):
            </p>
            <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-300">
              <li>Open this page in <strong className="text-white">Google Chrome</strong> on your Android phone.</li>
              <li>Tap the three dots icon <span className="font-bold font-mono text-amber-400">⋮</span> in top right corner.</li>
              <li>Tap <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
