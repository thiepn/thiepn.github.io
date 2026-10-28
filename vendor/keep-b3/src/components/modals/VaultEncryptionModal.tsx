import React, { useState, useRef } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Clock,
  FileKey,
} from 'lucide-react';
import {
  vaultEncryptionService,
  exportEncryptedVaultPackage,
  importEncryptedVaultPackage,
  downloadEncryptedVaultFile,
  PortableVaultData,
} from '../../pkm';
import { Note, Folder, SavedSearch, AppSettings } from '../../types';

interface VaultEncryptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  savedSearches: SavedSearch[];
  settings: AppSettings;
  onVaultDataReload: (data: {
    notes: Note[];
    folders: Folder[];
    savedSearches: SavedSearch[];
    settings?: AppSettings;
  }) => Promise<void>;
  onLockVault: () => void;
}

export const VaultEncryptionModal: React.FC<VaultEncryptionModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  savedSearches,
  settings,
  onVaultDataReload,
  onLockVault,
}) => {
  const isEnabled = vaultEncryptionService.isEncryptionEnabled();
  const isUnlocked = vaultEncryptionService.isVaultUnlocked();
  const header = vaultEncryptionService.getVaultHeader();

  // Setup tab/state
  const [activeTab, setActiveTab] = useState<'status' | 'setup' | 'change_password' | 'export_import'>(
    isEnabled ? 'status' : 'setup'
  );

  // Setup wizard state
  const [setupPassphrase, setSetupPassphrase] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupAutoLock, setSetupAutoLock] = useState(15);
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Disable encryption state
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);

  // Export / Import state
  const [exportPassword, setExportPassword] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEnableEncryption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setupPassphrase.length < 6) {
      setErrorMsg('Master passphrase must be at least 6 characters long');
      return;
    }
    if (setupPassphrase !== setupConfirm) {
      setErrorMsg('Passphrase confirmation does not match');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await vaultEncryptionService.setupVaultEncryption(
        setupPassphrase,
        setupAutoLock,
        undefined,
        (p) => {
          setProgressMsg(p.step);
          setProgressPercent(p.percent);
        }
      );

      if (res.success) {
        setSuccessMsg('Full-vault client-side encryption successfully enabled!');
        setSetupPassphrase('');
        setSetupConfirm('');
        setActiveTab('status');
      } else {
        setErrorMsg(res.error || 'Failed to enable vault encryption');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Encryption setup error');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
      setProgressPercent(0);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('New passphrase must be at least 6 characters');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setErrorMsg('New passphrase confirmation does not match');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await vaultEncryptionService.changeMasterPassphrase(
        currentPassword,
        newPassword
      );
      if (res.success) {
        setSuccessMsg('Master passphrase successfully updated and re-wrapped!');
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setActiveTab('status');
      } else {
        setErrorMsg(res.error || 'Failed to change master passphrase');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change master passphrase');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisableEncryption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword.trim()) {
      setErrorMsg('Please enter your current master passphrase to confirm');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await vaultEncryptionService.disableVaultEncryption(disablePassword.trim());
      if (res.success) {
        setSuccessMsg('Vault encryption has been disabled. Vault is now stored unencrypted.');
        setDisablePassword('');
        setShowDisableForm(false);
        setActiveTab('setup');
      } else {
        setErrorMsg(res.error || 'Failed to disable encryption');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error disabling vault encryption');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportVaultFile = async () => {
    if (!exportPassword || exportPassword.length < 6) {
      setErrorMsg('Enter an export passphrase (at least 6 characters) to protect the .vault file');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const vaultData: PortableVaultData = {
        notes,
        folders,
        savedSearches,
        settings,
      };

      const encryptedJson = await exportEncryptedVaultPackage(vaultData, exportPassword);
      downloadEncryptedVaultFile(encryptedJson);
      setSuccessMsg('Encrypted .vault file successfully exported and downloaded!');
      setExportPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to export encrypted vault');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleImportVaultFile = async () => {
    if (!importFileContent) {
      setErrorMsg('Please select a .vault file to import');
      return;
    }
    if (!importPassword.trim()) {
      setErrorMsg('Please enter the decryption passphrase for this .vault file');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { vaultData } = await importEncryptedVaultPackage(importFileContent, importPassword);
      await onVaultDataReload({
        notes: vaultData.notes,
        folders: vaultData.folders || [],
        savedSearches: vaultData.savedSearches || [],
        settings: vaultData.settings,
      });

      setSuccessMsg(
        `Successfully decrypted and restored vault with ${vaultData.notes.length} notes and ${vaultData.folders?.length || 0} folders!`
      );
      setImportFileContent(null);
      setImportFileName(null);
      setImportPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to decrypt and import .vault file');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 flex flex-col max-h-[90vh] space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Full-Vault Client-Side Encryption
                {isEnabled ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                    Unencrypted
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Zero-Knowledge AES-256-GCM authenticated encryption with Argon2id KDF.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 text-xs font-semibold gap-2 pb-2">
          {isEnabled && (
            <button
              onClick={() => {
                setActiveTab('status');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'status'
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              Vault Security
            </button>
          )}

          {!isEnabled && (
            <button
              onClick={() => {
                setActiveTab('setup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'setup'
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              Enable Encryption
            </button>
          )}

          {isEnabled && (
            <button
              onClick={() => {
                setActiveTab('change_password');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'change_password'
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                  : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
              }`}
            >
              Change Passphrase
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab('export_import');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'export_import'
                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
            }`}
          >
            Encrypted .vault Backup
          </button>
        </div>

        {/* Tab 1: Vault Status & Controls */}
        {activeTab === 'status' && isEnabled && (
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Encryption State:
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Full-Vault Protected
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>Cipher Algorithm:</span>
                <span className="font-mono text-stone-800 dark:text-stone-200">
                  {header?.cipher.cipher} (256-bit)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>Key Derivation Function:</span>
                <span className="font-mono text-stone-800 dark:text-stone-200">
                  Argon2id (Memory: {header ? Math.round(header.kdf.memoryCost / 1024) : 64}MB, Iterations: {header?.kdf.timeCost || 3})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <span>Auto-Lock Timeout:</span>
                <div className="flex items-center gap-2">
                  <select
                    value={header?.autoLockMinutes || 15}
                    onChange={(e) => {
                      const mins = Number(e.target.value);
                      vaultEncryptionService.updateAutoLockMinutes(mins);
                      setSuccessMsg(`Auto-lock timeout updated to ${mins === 0 ? 'Disabled' : `${mins} minutes`}`);
                    }}
                    className="px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-800 dark:text-stone-200"
                  >
                    <option value={0}>Disabled (lock on tab close)</option>
                    <option value={1}>1 minute of inactivity</option>
                    <option value={5}>5 minutes of inactivity</option>
                    <option value={15}>15 minutes of inactivity</option>
                    <option value={30}>30 minutes of inactivity</option>
                    <option value={60}>60 minutes of inactivity</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onLockVault();
                  onClose();
                }}
                className="flex-1 py-2.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Lock className="w-3.5 h-3.5" /> Lock Vault Now
              </button>

              <button
                type="button"
                onClick={() => setShowDisableForm(!showDisableForm)}
                className="px-4 py-2.5 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Disable Encryption
              </button>
            </div>

            {/* Disable Form Accordion */}
            {showDisableForm && (
              <form onSubmit={handleDisableEncryption} className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 space-y-2.5 animate-fadeIn">
                <div className="text-xs font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Confirm Disabling Encryption
                </div>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80">
                  Disabling encryption will store notes in standard unencrypted format in your local browser database.
                </p>
                <input
                  type="password"
                  placeholder="Enter current master passphrase..."
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDisableForm(false)}
                    className="px-3 py-1 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || !disablePassword.trim()}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Confirm & Decrypt Storage
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Enable Vault Encryption Wizard */}
        {activeTab === 'setup' && !isEnabled && (
          <form onSubmit={handleEnableEncryption} className="space-y-4 overflow-y-auto pr-1">
            {/* Zero-Knowledge Warning Notice */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-1.5">
              <div className="font-semibold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Zero-Knowledge Privacy Guarantee & Recovery Notice
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Your passphrase is the ONLY key to your data. There are <strong>no backdoors, reset emails, or recovery servers</strong>. If you forget your passphrase, encrypted vault data cannot be recovered.
              </p>
            </div>

            {/* Passphrase Fields */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                  <span>Master Passphrase (min. 6 characters)</span>
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="text-stone-400 hover:text-stone-600 text-[11px] flex items-center gap-1"
                  >
                    {showSetupPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showSetupPassword ? 'Hide' : 'Show'}
                  </button>
                </label>
                <input
                  type={showSetupPassword ? 'text' : 'password'}
                  placeholder="Enter strong master passphrase..."
                  value={setupPassphrase}
                  onChange={(e) => setSetupPassphrase(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Confirm Master Passphrase
                </label>
                <input
                  type={showSetupPassword ? 'text' : 'password'}
                  placeholder="Re-enter master passphrase..."
                  value={setupConfirm}
                  onChange={(e) => setSetupConfirm(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  Auto-Lock Inactivity Timeout
                </label>
                <select
                  value={setupAutoLock}
                  onChange={(e) => setSetupAutoLock(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200"
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes (recommended)</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={0}>Disabled</option>
                </select>
              </div>
            </div>

            {/* Progress indicator */}
            {isProcessing && (
              <div className="space-y-1.5 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 text-xs">
                <div className="flex justify-between font-medium text-stone-700 dark:text-stone-300">
                  <span>{progressMsg || 'Processing...'}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || !setupPassphrase.trim() || setupPassphrase.length < 6}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Enable Full-Vault Encryption
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Change Master Passphrase */}
        {activeTab === 'change_password' && isEnabled && (
          <form onSubmit={handleChangePassword} className="space-y-4 overflow-y-auto pr-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Current Master Passphrase
              </label>
              <input
                type={showChangePassword ? 'text' : 'password'}
                placeholder="Enter current passphrase..."
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                New Master Passphrase (min. 6 characters)
              </label>
              <input
                type={showChangePassword ? 'text' : 'password'}
                placeholder="Enter new strong passphrase..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Confirm New Master Passphrase
              </label>
              <input
                type={showChangePassword ? 'text' : 'password'}
                placeholder="Re-enter new passphrase..."
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={isProcessing || !currentPassword.trim() || !newPassword.trim()}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" /> Re-Wrap & Update Passphrase
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: Encrypted .vault Backup Export & Import */}
        {activeTab === 'export_import' && (
          <div className="space-y-5 overflow-y-auto pr-1">
            {/* Export Section */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 space-y-3">
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-amber-500" />
                Export Standalone Encrypted Container (.vault)
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Creates a single, self-contained encrypted archive of your entire vault with AES-256-GCM authenticated ciphertext.
              </p>

              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="Set backup passphrase (min. 6 characters)..."
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-mono"
                />

                <button
                  type="button"
                  onClick={handleExportVaultFile}
                  disabled={isProcessing || !exportPassword || exportPassword.length < 6}
                  className="w-full py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white disabled:opacity-50 text-white dark:text-stone-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download .vault File
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 space-y-3">
              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-500" />
                Import & Decrypt .vault File
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".vault,.json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5"
                >
                  <FileKey className="w-3.5 h-3.5" /> Select .vault File
                </button>
                <div className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 truncate">
                  {importFileName || 'No file selected'}
                </div>
              </div>

              {importFileContent && (
                <div className="space-y-2 pt-1">
                  <input
                    type="password"
                    placeholder="Enter passphrase to decrypt selected .vault..."
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleImportVaultFile}
                    disabled={isProcessing || !importPassword.trim()}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Decrypt & Restore Vault
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
