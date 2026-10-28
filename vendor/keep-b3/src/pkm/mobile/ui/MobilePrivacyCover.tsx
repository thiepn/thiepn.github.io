/**
 * P47 — Mobile App Switcher Privacy Cover
 * 
 * Renders a frosted security cover when the mobile app enters the OS multitasking switcher.
 */

import React, { useState, useEffect } from 'react';
import { Shield, Lock } from 'lucide-react';
import { mobileLifecycleService } from '../mobileLifecycleService';

export const MobilePrivacyCover: React.FC = () => {
  const [visible, setVisible] = useState(mobileLifecycleService.isPrivacyOverlayActive());

  useEffect(() => {
    const unsub = mobileLifecycleService.subscribeOverlay(setVisible);
    return unsub;
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-900/95 backdrop-blur-2xl text-white select-none pointer-events-auto animate-in fade-in duration-75">
      <div className="flex flex-col items-center gap-3 p-6 text-center max-w-xs">
        <div className="p-3.5 bg-zinc-800 border border-zinc-700 rounded-2xl shadow-xl">
          <Shield className="w-8 h-8 text-indigo-400" />
        </div>
        <h3 className="text-base font-semibold text-zinc-100">KeepNotes Vault Protected</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Content is obscured in the task switcher to protect privacy.
        </p>
      </div>
    </div>
  );
};
