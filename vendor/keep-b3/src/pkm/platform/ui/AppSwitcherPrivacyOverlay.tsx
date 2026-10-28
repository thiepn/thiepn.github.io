import React from 'react';
import { useAppLifecycle } from '../usePlatformCapabilities';
import { Lock } from 'lucide-react';

export const AppSwitcherPrivacyOverlay: React.FC = () => {
  const { isObscured } = useAppLifecycle();

  if (!isObscured) {
    return null;
  }

  return (
    <div
      id="app-switcher-privacy-overlay"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-900/95 backdrop-blur-md text-stone-100 p-6 select-none"
      aria-hidden="true"
    >
      <div className="w-16 h-16 rounded-2xl bg-stone-800 border border-stone-700 flex items-center justify-center mb-4 shadow-xl">
        <Lock className="w-8 h-8 text-amber-400" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Personal OS</h2>
      <p className="text-sm text-stone-400 mt-1">Screen protected for privacy</p>
    </div>
  );
};
