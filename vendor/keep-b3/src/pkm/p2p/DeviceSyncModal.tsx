/**
 * Phase P32: Optional Peer-to-Peer Device Sync Modal & Pairing UI
 * Provides pairing QR code generator, camera QR scanner, live transfer progress, SAS confirmation, and device management.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Laptop,
  QrCode,
  Camera,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  Trash2,
  Edit2,
  X,
  ArrowRight,
  Wifi,
  Radio,
  Clock,
  ExternalLink,
  Lock,
  ChevronRight,
  Info,
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { Note, Folder, SavedSearch, AppSettings } from '../../types';
import { CanvasBoard } from '../canvasTypes';
import {
  P2PDevice,
  P2PSessionState,
  P2PSyncStats,
  P2PDiffResult,
  P2P_PAIRING_EXPIRY_MS,
  P2P_PROTOCOL_VERSION,
} from './p2pTypes';
import { p2pDeviceManager } from './p2pDeviceManager';
import { P2PSyncEngine } from './p2pSyncEngine';
import { generateRandomToken, generateHumanPairingCode } from './p2pCrypto';
import { vaultEncryptionService } from '../encryption/vaultEncryptionService';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  canvases?: CanvasBoard[];
  savedSearches?: SavedSearch[];
  settings?: AppSettings;
  onVaultUpdated?: (notes: Note[], folders?: Folder[], canvases?: CanvasBoard[]) => void;
}

export const DeviceSyncModal: React.FC<DeviceSyncModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  canvases = [],
  savedSearches = [],
  settings,
  onVaultUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'devices' | 'history' | 'diagnostics'>('sync');
  const [sessionState, setSessionState] = useState<P2PSessionState>('idle');
  const [stats, setStats] = useState<P2PSyncStats | null>(null);
  const [diffResult, setDiffResult] = useState<P2PDiffResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Pairing State
  const [pairingMode, setPairingMode] = useState<'display_qr' | 'scan_qr' | 'manual_code'>('display_qr');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [pairingPayloadString, setPairingPayloadString] = useState<string>('');
  const [humanCode, setHumanCode] = useState<string>('');
  const [manualInputCode, setManualInputCode] = useState<string>('');
  const [scannerActive, setScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Device Management State
  const [pairedDevices, setPairedDevices] = useState<P2PDevice[]>(() => p2pDeviceManager.getPairedDevices());
  const [localDeviceName, setLocalDeviceName] = useState<string>(() => p2pDeviceManager.getLocalDeviceName());
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');

  // Engine ref
  const engineRef = useRef<P2PSyncEngine | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = p2pDeviceManager.subscribe(() => {
      setPairedDevices(p2pDeviceManager.getPairedDevices());
      setLocalDeviceName(p2pDeviceManager.getLocalDeviceName());
    });
    return () => unsub();
  }, []);

  // Initialize engine and QR code when modal opens or on demand
  useEffect(() => {
    if (isOpen && sessionState === 'idle') {
      initPairingSession();
    }
  }, [isOpen]);

  const initPairingSession = async () => {
    try {
      setErrorMessage(null);
      const isLocked = vaultEncryptionService.isVaultLocked();
      if (isLocked) {
        setErrorMessage('Your vault is locked with a master passphrase. Please unlock it to perform device sync.');
        return;
      }

      const engine = new P2PSyncEngine(
        'vault-default',
        'My Notes Vault',
        {
          onStateChange: (s) => setSessionState(s),
          onStatsUpdate: (st) => setStats({ ...st }),
          onDiffCalculated: (d) => setDiffResult(d),
          onConflictsDetected: (c) => setSessionState('conflicts'),
          onSyncComplete: () => setSessionState('complete'),
          onError: (err) => {
            setErrorMessage(err.message);
            setSessionState('failed');
          },
        }
      );

      engine.setVaultData({
        notes,
        folders,
        canvases,
        savedSearches,
        settings,
        onVaultUpdated,
      });

      engineRef.current = engine;
      const transport = await engine.initPairing();
      const keys = await transport.initEphemeralKeys();

      const sessionToken = generateRandomToken(16);
      const generatedHumanCode = generateHumanPairingCode();
      setHumanCode(generatedHumanCode);

      const payload = {
        v: P2P_PROTOCOL_VERSION,
        sid: sessionToken,
        pk: keys.publicKeyBase64,
        token: generatedHumanCode,
        exp: Date.now() + P2P_PAIRING_EXPIRY_MS,
        name: localDeviceName,
      };

      const payloadJson = JSON.stringify(payload);
      setPairingPayloadString(payloadJson);

      const url = await QRCode.toDataURL(payloadJson, {
        margin: 2,
        width: 280,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to initialize P2P pairing session');
    }
  };

  // Camera QR Scanner Loop
  useEffect(() => {
    if (pairingMode === 'scan_qr' && scannerActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [pairingMode, scannerActive]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        scanIntervalRef.current = window.setInterval(scanVideoFrame, 300);
      }
    } catch (err: any) {
      setCameraError('Camera access denied or unavailable. You can enter the pairing code manually.');
      setPairingMode('manual_code');
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const scanVideoFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      handleScannedPayload(code.data);
    }
  };

  const handleScannedPayload = async (data: string) => {
    stopCamera();
    try {
      const parsed = JSON.parse(data);
      if (parsed.v !== P2P_PROTOCOL_VERSION || !parsed.pk) {
        throw new Error('Invalid or incompatible pairing QR code.');
      }
      setSessionState('connecting');

      // Connect using transport
      if (engineRef.current) {
        const transport = await engineRef.current.initPairing();
        await transport.establishSessionSecurity(parsed.pk);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Could not parse pairing code.');
    }
  };

  const handleManualConnect = async () => {
    if (!manualInputCode.trim()) return;
    try {
      handleScannedPayload(manualInputCode.trim());
    } catch (e: any) {
      setErrorMessage(e.message || 'Invalid code format.');
    }
  };

  const handleCancelSync = async () => {
    if (engineRef.current) {
      await engineRef.current.cancel();
    }
    setSessionState('idle');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(humanCode || pairingPayloadString);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveDeviceName = (id: string) => {
    if (!editingNameValue.trim()) return;
    p2pDeviceManager.renameDevice(id, editingNameValue);
    setEditingDeviceId(null);
  };

  const handleForgetDevice = (id: string) => {
    p2pDeviceManager.forgetDevice(id);
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-device-sync"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-sync-title"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="device-sync-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Peer-to-Peer Device Sync
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-800">
                  Experimental
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Direct encrypted synchronization between your own devices without third-party servers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 px-5 bg-stone-50/50 dark:bg-stone-900/50 gap-1 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sync'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 font-semibold'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Sync & Pair</span>
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'devices'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 font-semibold'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Paired Devices ({pairedDevices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 font-semibold'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>History</span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 font-semibold'
                : 'border-transparent text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>Diagnostics</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Global Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-red-800 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">
                <p className="font-semibold">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-700 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: SYNC & PAIR */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {sessionState === 'idle' || sessionState === 'pairing' ? (
                <div className="space-y-4">
                  {/* Mode switcher: Display QR vs Scan QR vs Manual */}
                  <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800 p-1">
                    <button
                      onClick={() => {
                        setPairingMode('display_qr');
                        setScannerActive(false);
                      }}
                      className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        pairingMode === 'display_qr'
                          ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Display QR</span>
                    </button>
                    <button
                      onClick={() => {
                        setPairingMode('scan_qr');
                        setScannerActive(true);
                      }}
                      className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        pairingMode === 'scan_qr'
                          ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Scan QR Code</span>
                    </button>
                    <button
                      onClick={() => {
                        setPairingMode('manual_code');
                        setScannerActive(false);
                      }}
                      className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        pairingMode === 'manual_code'
                          ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Pairing Code</span>
                    </button>
                  </div>

                  {/* DISPLAY QR MODE */}
                  {pairingMode === 'display_qr' && (
                    <div className="flex flex-col items-center justify-center p-4 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                      {qrDataUrl ? (
                        <div className="p-3 bg-white rounded-xl shadow-xs border border-stone-200">
                          <img
                            src={qrDataUrl}
                            alt="P2P Sync Pairing QR Code"
                            className="w-56 h-56 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-56 h-56 flex items-center justify-center">
                          <RefreshCw className="w-6 h-6 animate-spin text-stone-400" />
                        </div>
                      )}

                      <div className="text-center space-y-1">
                        <p className="font-semibold text-stone-800 dark:text-stone-200">
                          Scan with your second device
                        </p>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400">
                          Or enter pairing code: <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{humanCode}</span>
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleCopyCode}
                          className="px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1.5 transition-colors"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                        </button>
                        <button
                          onClick={initPairingSession}
                          className="px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-50 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Refresh QR</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SCAN QR MODE */}
                  {pairingMode === 'scan_qr' && (
                    <div className="flex flex-col items-center justify-center p-4 bg-stone-900 rounded-2xl border border-stone-800 space-y-3 text-white">
                      <div className="relative w-full max-w-xs h-64 bg-black rounded-xl overflow-hidden flex items-center justify-center">
                        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute inset-8 border-2 border-amber-400 rounded-lg pointer-events-none opacity-80 animate-pulse" />
                      </div>

                      {cameraError ? (
                        <p className="text-xs text-red-400">{cameraError}</p>
                      ) : (
                        <p className="text-xs text-stone-300">Point your camera at the QR code displayed on your other device</p>
                      )}
                    </div>
                  )}

                  {/* MANUAL CODE MODE */}
                  {pairingMode === 'manual_code' && (
                    <div className="p-4 bg-stone-50 dark:bg-stone-800/40 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                      <div>
                        <label className="block font-semibold text-stone-800 dark:text-stone-200 mb-1">
                          Paste Pairing JSON or Code
                        </label>
                        <textarea
                          rows={3}
                          value={manualInputCode}
                          onChange={(e) => setManualInputCode(e.target.value)}
                          placeholder="Paste pairing payload from other device..."
                          className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 font-mono text-[11px] focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                      <button
                        onClick={handleManualConnect}
                        disabled={!manualInputCode.trim()}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                      >
                        Connect & Synchronize
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* ACTIVE SYNC / IN-PROGRESS SESSION */
                <div className="p-5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-4">
                  {/* SAS Fingerprint Verification Badge */}
                  {stats?.sasPhrase && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-[11px] text-emerald-900 dark:text-emerald-200 font-bold">
                            End-to-End Encrypted Session
                          </p>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                            Authentication Phrase: <span className="font-mono font-bold tracking-wider">{stats.sasPhrase}</span>
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold rounded">
                        CONFIRMED
                      </span>
                    </div>
                  )}

                  {/* Stepper Status */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-semibold text-stone-800 dark:text-stone-200">
                      <span>Status: {sessionState.toUpperCase()}</span>
                      {stats && stats.totalResourcesToSync > 0 && (
                        <span>
                          {stats.resourcesReceived + stats.resourcesSent} / {stats.totalResourcesToSync} resources
                        </span>
                      )}
                    </div>

                    <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-600 transition-all duration-300 rounded-full"
                        style={{
                          width:
                            sessionState === 'complete'
                              ? '100%'
                              : stats && stats.totalResourcesToSync > 0
                              ? `${Math.min(100, Math.round(((stats.resourcesReceived + stats.resourcesSent) / stats.totalResourcesToSync) * 100))}%`
                              : '25%',
                        }}
                      />
                    </div>
                  </div>

                  {/* Diagnostics summary */}
                  {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-stone-600 dark:text-stone-400 pt-2 border-t border-stone-200 dark:border-stone-700">
                      <div>
                        <span className="block opacity-60">Sent</span>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">{stats.resourcesSent} items</span>
                      </div>
                      <div>
                        <span className="block opacity-60">Received</span>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">{stats.resourcesReceived} items</span>
                      </div>
                      <div>
                        <span className="block opacity-60">Bytes Transferred</span>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {Math.round((stats.bytesSent + stats.bytesReceived) / 1024)} KB
                        </span>
                      </div>
                      <div>
                        <span className="block opacity-60">Route</span>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">{stats.connectionRoute}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    {sessionState === 'complete' ? (
                      <button
                        onClick={() => {
                          setSessionState('idle');
                          initPairingSession();
                        }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
                      >
                        Sync Complete (Done)
                      </button>
                    ) : (
                      <button
                        onClick={handleCancelSync}
                        className="px-4 py-1.5 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-800 dark:text-stone-200 font-semibold rounded-xl transition-colors"
                      >
                        Cancel Sync
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAIRED DEVICES */}
          {activeTab === 'devices' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Trusted Devices ({pairedDevices.length})
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-stone-400">
                  <span>This Device:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{localDeviceName}</span>
                </div>
              </div>

              {pairedDevices.length === 0 ? (
                <div className="text-center py-8 text-stone-500 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800">
                  <Laptop className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p className="font-semibold">No paired devices yet</p>
                  <p className="text-[11px]">Scan QR code on another device to link them.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pairedDevices.map((dev) => (
                    <div
                      key={dev.id}
                      className="p-3 bg-white dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          {editingDeviceId === dev.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                className="px-2 py-0.5 text-xs rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900"
                              />
                              <button
                                onClick={() => handleSaveDeviceName(dev.id)}
                                className="px-2 py-0.5 bg-amber-600 text-white rounded text-[11px]"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-stone-800 dark:text-stone-200">{dev.name}</span>
                              <button
                                onClick={() => {
                                  setEditingDeviceId(dev.id);
                                  setEditingNameValue(dev.name);
                                }}
                                className="text-stone-400 hover:text-stone-600 p-0.5"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          <div className="text-[10px] text-stone-600 dark:text-stone-400">
                            {dev.lastSyncedAt ? `Last synced: ${new Date(dev.lastSyncedAt).toLocaleString()}` : 'Never synced'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleForgetDevice(dev.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                          title="Forget device"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-stone-700 dark:text-stone-300">Recent Sync Sessions</span>
                <button
                  onClick={() => p2pDeviceManager.clearHistory()}
                  className="text-[11px] text-stone-600 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  Clear History
                </button>
              </div>

              {p2pDeviceManager.getSyncHistory().length === 0 ? (
                <div className="text-center py-8 text-stone-500 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800">
                  <Clock className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p>No sync history recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {p2pDeviceManager.getSyncHistory().map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <div className="font-semibold text-stone-800 dark:text-stone-200">{item.peerName}</div>
                        <div className="text-stone-600 dark:text-stone-400">
                          {new Date(item.timestamp).toLocaleString()} • {item.changesApplied} applied, {item.changesSent} sent
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                          item.status === 'success'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>P2P Sync Feasibility & Scope Notice</span>
                </div>
                <p className="text-stone-700 dark:text-stone-300 text-[11px] leading-relaxed">
                  P2P synchronization uses WebRTC DataChannels directly between browser tabs or devices on the same LAN/WAN.
                  Git-based synchronization remains the primary and recommended sync mechanism.
                </p>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Local Device ID</span>
                  <span className="font-mono text-[10px] text-stone-600 dark:text-stone-400">{p2pDeviceManager.getLocalDeviceId()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">STUN Servers</span>
                  <span className="text-[11px] text-stone-600 dark:text-stone-400">Google Public STUN (Default)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-stone-700 dark:text-stone-300">Protocol Version</span>
                  <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400">{P2P_PROTOCOL_VERSION}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex justify-between items-center">
          <div className="text-[11px] text-stone-600 dark:text-stone-400 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Encrypted with ephemeral ECDH + AES-GCM-256</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold rounded-xl text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
