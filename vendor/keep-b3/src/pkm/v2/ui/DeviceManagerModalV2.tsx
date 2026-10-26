import React, { useState, useEffect } from 'react';
import {
  X,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Radio,
  Clock,
  ShieldCheck,
  Edit2,
  Check,
  Trash2,
  QrCode,
  ArrowRight,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  globalDeviceManagerV2,
  DeviceMetadataV2,
  globalP2PTransportAdapter,
  P2PPairingSessionV2
} from '../sync';

interface DeviceManagerModalV2Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceManagerModalV2: React.FC<DeviceManagerModalV2Props> = ({
  isOpen,
  onClose,
}) => {
  const [currentDevice, setCurrentDevice] = useState<DeviceMetadataV2>(globalDeviceManagerV2.getCurrentDevice());
  const [knownDevices, setKnownDevices] = useState<DeviceMetadataV2[]>(globalDeviceManagerV2.getKnownDevices());
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentDevice.deviceName);
  const [activeTab, setActiveTab] = useState<'devices' | 'p2p_pairing'>('devices');

  // P2P State
  const [p2pSession, setP2pSession] = useState<P2PPairingSessionV2 | null>(globalP2PTransportAdapter.getSession());
  const [remoteCodeInput, setRemoteCodeInput] = useState('');
  const [p2pError, setP2pError] = useState<string | null>(null);
  const [p2pSuccess, setP2pSuccess] = useState<string | null>(null);

  useEffect(() => {
    refreshDevices();
  }, [isOpen]);

  const refreshDevices = () => {
    setCurrentDevice(globalDeviceManagerV2.getCurrentDevice());
    setKnownDevices(globalDeviceManagerV2.getKnownDevices());
  };

  if (!isOpen) return null;

  const handleSaveName = () => {
    if (nameInput.trim()) {
      const updated = globalDeviceManagerV2.setDeviceName(nameInput.trim());
      setCurrentDevice(updated);
      setIsEditingName(false);
      refreshDevices();
    }
  };

  const handleRetire = (deviceId: string) => {
    const res = globalDeviceManagerV2.retireDevice(deviceId);
    if (res.success) {
      refreshDevices();
    }
  };

  const handleStartPairing = () => {
    const session = globalP2PTransportAdapter.initiatePairing('vault_keepnotes_v2');
    setP2pSession(session);
    setP2pError(null);
    setP2pSuccess(null);
  };

  const handleConnectRemoteCode = () => {
    if (!remoteCodeInput.trim()) return;
    const res = globalP2PTransportAdapter.completePairing('peer_dev_remote', 'Remote Device', 'vault_keepnotes_v2');
    if (res.success) {
      setP2pSuccess('Devices paired directly via WebRTC!');
      setP2pSession(globalP2PTransportAdapter.getSession());
    } else {
      setP2pError(res.error || 'Pairing failed.');
    }
  };

  const getPlatformIcon = (platform: string) => {
    if (platform.includes('mobile') || platform === 'mobile_ios' || platform === 'mobile_android') return Smartphone;
    if (platform.includes('desktop') || platform === 'desktop_macos' || platform === 'desktop_windows' || platform === 'desktop_linux') return Laptop;
    if (platform === 'pwa') return Tablet;
    return Globe;
  };

  const formatRelativeTime = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        id="device_manager_modal"
        className="flex flex-col w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 rounded-lg text-blue-700 dark:text-blue-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Devices & Cross-Device Sync
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage registered devices and direct peer-to-peer sync
              </p>
            </div>
          </div>
          <button
            id="close_device_manager_btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-5 pt-2 gap-4">
          <button
            id="tab_devices_btn"
            onClick={() => setActiveTab('devices')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'devices'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Known Devices ({knownDevices.length})
          </button>
          <button
            id="tab_p2p_btn"
            onClick={() => setActiveTab('p2p_pairing')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'p2p_pairing'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            P2P Direct Sync
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal">Beta</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {activeTab === 'devices' ? (
            <div className="space-y-4">
              {/* Current Device Highlight */}
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-600 text-white">
                      Current Device
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      ID: {currentDevice.deviceId}
                    </span>
                  </div>
                  <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                    Protocol v{currentDevice.protocolVersion}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 w-full max-w-sm">
                      <input
                        id="device_name_input"
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="flex-1 px-2.5 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        placeholder="Device Name (e.g. MacBook Pro)"
                      />
                      <button
                        id="save_device_name_btn"
                        onClick={handleSaveName}
                        className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {currentDevice.deviceName}
                      </h4>
                      <button
                        id="edit_device_name_btn"
                        onClick={() => {
                          setNameInput(currentDevice.deviceName);
                          setIsEditingName(true);
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Edit device name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <span className="text-xs text-zinc-500">
                    Last active: {formatRelativeTime(currentDevice.lastSyncTimestamp)}
                  </span>
                </div>
              </div>

              {/* Known Devices List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Other Paired & Known Devices
                </h4>
                {knownDevices
                  .filter(d => !d.isCurrentDevice)
                  .map((d) => {
                    const Icon = getPlatformIcon(d.platform);
                    const isStale = d.status === 'stale';
                    const isRetired = d.status === 'retired';

                    return (
                      <div
                        key={d.deviceId}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${
                          isRetired
                            ? 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60'
                            : 'bg-white dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{d.deviceName}</span>
                              {isRetired && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400">
                                  Retired
                                </span>
                              )}
                              {isStale && !isRetired && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                  Offline &gt;30d
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono">
                              Last sync: {formatRelativeTime(d.lastSyncTimestamp)}
                            </div>
                          </div>
                        </div>

                        <div>
                          {!isRetired ? (
                            <button
                              id={`retire_device_${d.deviceId}`}
                              onClick={() => handleRetire(d.deviceId)}
                              className="px-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 hover:border-rose-300 transition-colors"
                              title="Retire this device"
                            >
                              Retire Device
                            </button>
                          ) : (
                            <span className="text-[11px] text-zinc-400 italic">Excluded from sync</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-500 leading-relaxed">
                <strong className="text-zinc-700 dark:text-zinc-300">Device Retirement Guarantee:</strong> Retiring a device removes it from active sync coordination and assists safe tombstone garbage collection. Retiring a device does <em>not</em> remotely wipe any data stored on that device.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                <strong>Direct Device-to-Device (P2P) Sync:</strong> Synchronize directly over local Wi-Fi / WebRTC without intermediary Git servers. Both devices must be open and connected to the same session.
              </div>

              {p2pSession?.status === 'connected' ? (
                <div className="p-6 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl text-center">
                  <ShieldCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Direct P2P Channel Active
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    Connected with {p2pSession.peerDeviceName || 'Paired Peer'}. Changes sync directly peer-to-peer.
                  </p>
                  <button
                    id="p2p_disconnect_btn"
                    onClick={() => {
                      globalP2PTransportAdapter.disconnect();
                      setP2pSession(null);
                    }}
                    className="mt-4 px-3 py-1.5 text-xs bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-zinc-700 dark:text-zinc-300 font-medium"
                  >
                    Disconnect Channel
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Share Code */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                      Pair From This Device
                    </h5>
                    {p2pSession?.pairingCode ? (
                      <div className="text-center py-4">
                        <div className="text-2xl font-mono font-bold tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                          {p2pSession.pairingCode}
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Enter this 6-digit pairing code on your other device to connect.
                        </p>
                      </div>
                    ) : (
                      <button
                        id="generate_pairing_code_btn"
                        onClick={handleStartPairing}
                        className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" />
                        Generate Pairing Code
                      </button>
                    )}
                  </div>

                  {/* Enter Remote Code */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                      Enter Code From Other Device
                    </h5>
                    <div className="space-y-2">
                      <input
                        id="remote_pairing_code_input"
                        type="text"
                        maxLength={6}
                        value={remoteCodeInput}
                        onChange={(e) => setRemoteCodeInput(e.target.value)}
                        placeholder="6-digit code"
                        className="w-full px-3 py-2 text-center font-mono text-sm border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                      <button
                        id="connect_remote_code_btn"
                        onClick={handleConnectRemoteCode}
                        className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        Connect &amp; Pair
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {p2pError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                  {p2pError}
                </div>
              )}
              {p2pSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                  {p2pSuccess}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
