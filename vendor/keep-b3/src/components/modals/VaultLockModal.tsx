import React, { useState } from 'react';
import { Lock, Key, AlertCircle, ShieldCheck, Unlock, Eye, EyeOff } from 'lucide-react';
import { vaultEncryptionService } from '../../pkm';

interface VaultLockModalProps {
  isOpen: boolean;
  onUnlocked: () => void;
}

export const VaultLockModal: React.FC<VaultLockModalProps> = ({ isOpen, onUnlocked }) => {
  const [passphrase, setPassphrase] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeriving, setIsDeriving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) {
      setErrorMsg('Please enter your master passphrase');
      return;
    }

    setIsDeriving(true);
    setErrorMsg(null);

    // Yield to let React render the loading state
    setTimeout(async () => {
      try {
        const res = await vaultEncryptionService.unlockVault(passphrase.trim());
        if (res.success) {
          setPassphrase('');
          onUnlocked();
        } else {
          setErrorMsg(res.error || 'Incorrect master passphrase');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to unlock vault');
      } finally {
        setIsDeriving(false);
      }
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-lock-title"
      >
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 id="vault-lock-title" className="text-xl font-bold text-stone-900 dark:text-stone-100">
            Vault is Locked
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Your notes, tags, searches, and attachments are protected with zero-knowledge AES-256-GCM encryption.
          </p>
        </div>

        {/* Security Badge */}
        <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 flex items-center gap-2.5 text-xs text-stone-600 dark:text-stone-300">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Authenticated AES-256-GCM • Argon2id Key Derivation</span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Master Passphrase
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                placeholder="Enter master passphrase..."
                value={passphrase}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  setErrorMsg(null);
                }}
                disabled={isDeriving}
                className="w-full pl-9 pr-10 py-2.5 bg-stone-50 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all font-mono"
              />
              <Key className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isDeriving || !passphrase.trim()}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {isDeriving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deriving Key & Authenticating...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Unlock Vault</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-[11px] text-stone-400">
            Keys are derived locally in browser WebAssembly and are never transmitted to any server.
          </p>
        </div>
      </div>
    </div>
  );
};
