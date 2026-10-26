import React from 'react';
import { useAppUpdate } from '../usePlatformCapabilities';
import { DownloadCloud, RefreshCw, X } from 'lucide-react';

export const PwaUpdatePrompt: React.FC = () => {
  const { updateStatus, applyUpdate } = useAppUpdate();
  const [dismissed, setDismissed] = React.useState(false);

  if (!updateStatus.hasUpdate || dismissed) {
    return null;
  }

  return (
    <div
      id="pwa-update-banner"
      className="fixed bottom-4 right-4 z-40 max-w-sm w-full bg-stone-900 text-stone-100 border border-stone-700 rounded-xl p-4 shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div className="p-2 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-emerald-400 mt-0.5">
        <DownloadCloud className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold">Update Ready</h4>
        <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
          A new version ({updateStatus.version || 'V1.3'}) is available. Your active edits will be safely preserved.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <button
            id="apply-pwa-update-button"
            type="button"
            onClick={() => applyUpdate(false)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload & Apply
          </button>
          <button
            id="dismiss-pwa-update-button"
            type="button"
            onClick={() => setDismissed(true)}
            className="px-2.5 py-1.5 text-stone-400 hover:text-stone-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Later
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-stone-500 hover:text-stone-300 p-1 cursor-pointer"
        aria-label="Dismiss update"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
