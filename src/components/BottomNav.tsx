import React from 'react';
import { Camera, ListFilter, Map as MapIcon } from 'lucide-react';
import { ViewTab } from '../types';

interface BottomNavProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  entriesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  entriesCount,
}) => {
  const handleTabClick = (tab: ViewTab) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
    setActiveTab(tab);
  };

  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="Mobile Navigation"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),8px)] pt-2 px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.7)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Capture Tab */}
        <button
          id="mobile-tab-capture"
          onClick={() => handleTabClick('camera')}
          className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl min-w-[72px] transition-all duration-150 active:scale-95 touch-manipulation ${
            activeTab === 'camera'
              ? 'text-sky-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'camera'
                ? 'bg-sky-500/20 text-sky-400 shadow-sm shadow-sky-500/20 ring-1 ring-sky-500/40'
                : 'text-slate-400'
            }`}
          >
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Capture</span>
        </button>

        {/* Logbook Tab */}
        <button
          id="mobile-tab-logbook"
          onClick={() => handleTabClick('entries')}
          className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl min-w-[72px] transition-all duration-150 active:scale-95 touch-manipulation relative ${
            activeTab === 'entries'
              ? 'text-sky-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl relative transition-all ${
              activeTab === 'entries'
                ? 'bg-sky-500/20 text-sky-400 shadow-sm shadow-sky-500/20 ring-1 ring-sky-500/40'
                : 'text-slate-400'
            }`}
          >
            <ListFilter className="w-5 h-5" />
            {entriesCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-sky-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-slate-950">
                {entriesCount > 99 ? '99+' : entriesCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Logbook</span>
        </button>

        {/* Map View Tab */}
        <button
          id="mobile-tab-map"
          onClick={() => handleTabClick('map')}
          className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl min-w-[72px] transition-all duration-150 active:scale-95 touch-manipulation relative ${
            activeTab === 'map'
              ? 'text-sky-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition-all ${
              activeTab === 'map'
                ? 'bg-sky-500/20 text-sky-400 shadow-sm shadow-sky-500/20 ring-1 ring-sky-500/40'
                : 'text-slate-400'
            }`}
          >
            <MapIcon className="w-5 h-5" />
          </div>
          <span className="text-[11px] mt-1 tracking-tight">Map View</span>
        </button>
      </div>
    </nav>
  );
};
