import React, { useState } from 'react';
import { Download, X, Sparkles, Smartphone, Check } from 'lucide-react';

interface PWAInstallBannerProps {
  onInstall: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onInstall }) => {
  const [dismissed, setDismissed] = useState<boolean>(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-sky-950/90 via-slate-900/90 to-emerald-950/90 border-b border-sky-800/40 text-slate-100 px-3 py-2 text-xs flex items-center justify-between gap-2 shadow-lg">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
          <Smartphone className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0 truncate">
          <span className="font-semibold text-slate-100 mr-1.5">Install GeoPhoto PWA:</span>
          <span className="text-slate-400 hidden sm:inline">
            Access camera & GPS offline anytime right from your home screen.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onInstall}
          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-200 p-1"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
