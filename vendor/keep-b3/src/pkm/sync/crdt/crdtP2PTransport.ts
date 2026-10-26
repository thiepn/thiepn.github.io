/**
 * KEEP CRDT P2P WebRTC Transport Adapter
 * Manages WebRTC RTCPeerConnection, DataChannels, BroadcastChannel local loopback,
 * pairing tokens, SAS authentication, and encrypted CRDT delta transport.
 */

import {
  generateEphemeralECDHKeyPair,
  deriveSessionKeyAndSAS,
  encryptPayload,
  decryptPayload,
  computeSHA256Hex,
  generateHumanPairingCode,
  P2PEphemeralKeyPair,
} from '../../p2p/p2pCrypto';
import { p2pDeviceManager } from '../../p2p/p2pDeviceManager';
import { crdtSyncCoordinator } from './crdtSyncCoordinator';
import { CRDTProtocolMessage } from './crdtTypes';

export interface CRDTPairingToken {
  version: '1';
  deviceId: string;
  deviceName: string;
  pairingCode: string;
  publicKeyBase64: string;
  sdpOffer?: string;
  iceCandidates?: RTCIceCandidateInit[];
  createdAt: number;
}

export type CRDTP2PTransportListener = (event: {
  type: 'connecting' | 'connected' | 'disconnected' | 'sas_ready' | 'error';
  sasPhrase?: string;
  sasCode?: number;
  peerId?: string;
  peerName?: string;
  error?: string;
}) => void;

export class CRDTP2PTransport {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private localKeyPair: P2PEphemeralKeyPair | null = null;
  private sessionKey: CryptoKey | null = null;
  private activePeerId: string | null = null;
  private activePeerName: string | null = null;
  private listeners: Set<CRDTP2PTransportListener> = new Set();
  private isHost: boolean = false;

  constructor() {
    this.initBroadcastChannel();
  }

  public subscribe(listener: CRDTP2PTransportListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: Parameters<CRDTP2PTransportListener>[0]) {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        console.warn('Transport listener error:', err);
      }
    }
  }

  /**
   * Initializes local BroadcastChannel for same-origin multi-tab or local loop simulation
   */
  private initBroadcastChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('keep_crdt_sync_bus_v1');
        this.broadcastChannel.onmessage = (e) => {
          this.handleBroadcastMessage(e.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported in this environment');
      }
    }
  }

  /**
   * Creates a new pairing offer token (including ECDH public key and pairing code)
   */
  public async createPairingOffer(): Promise<{
    pairingCode: string;
    tokenString: string;
    qrPayload: string;
  }> {
    this.isHost = true;
    this.localKeyPair = await generateEphemeralECDHKeyPair();
    const pairingCode = generateHumanPairingCode();
    const localDeviceId = p2pDeviceManager.getLocalDeviceId();
    const localDeviceName = p2pDeviceManager.getLocalDeviceName();

    // Prepare WebRTC Peer Connection if available
    let sdpOffer: string | undefined;
    if (typeof RTCPeerConnection !== 'undefined') {
      try {
        this.peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        this.dataChannel = this.peerConnection.createDataChannel('keep-crdt-sync', {
          ordered: true,
        });
        this.setupDataChannel(this.dataChannel);

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        sdpOffer = JSON.stringify(offer);
      } catch (e) {
        console.warn('WebRTC creation warning (using local fallback):', e);
      }
    }

    const token: CRDTPairingToken = {
      version: '1',
      deviceId: localDeviceId,
      deviceName: localDeviceName,
      pairingCode,
      publicKeyBase64: this.localKeyPair.publicKeyBase64,
      sdpOffer,
      createdAt: Date.now(),
    };

    const tokenString = btoa(JSON.stringify(token));
    const qrPayload = `keep-sync://pair?token=${encodeURIComponent(tokenString)}`;

    return { pairingCode, tokenString, qrPayload };
  }

  /**
   * Accepts a pairing offer token from a remote peer
   */
  public async acceptPairingOffer(tokenString: string): Promise<{
    answerTokenString: string;
    sasPhrase: string;
    sasCode: number;
  }> {
    this.isHost = false;
    let token: CRDTPairingToken;
    try {
      const decoded = tokenString.startsWith('keep-sync://')
        ? decodeURIComponent(tokenString.split('token=')[1] || '')
        : tokenString;
      token = JSON.parse(atob(decoded));
    } catch {
      throw new Error('Invalid or malformed pairing token');
    }

    this.localKeyPair = await generateEphemeralECDHKeyPair();
    const localDeviceId = p2pDeviceManager.getLocalDeviceId();
    const localDeviceName = p2pDeviceManager.getLocalDeviceName();

    // Derive session key and SAS
    const session = await deriveSessionKeyAndSAS(
      this.localKeyPair.keyPair.privateKey,
      token.publicKeyBase64
    );
    this.sessionKey = session.sessionKey;
    this.activePeerId = token.deviceId;
    this.activePeerName = token.deviceName;

    let sdpAnswer: string | undefined;
    if (typeof RTCPeerConnection !== 'undefined' && token.sdpOffer) {
      try {
        this.peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        this.peerConnection.ondatachannel = (e) => {
          this.dataChannel = e.channel;
          this.setupDataChannel(this.dataChannel);
        };

        const offerDesc = JSON.parse(token.sdpOffer);
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerDesc));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        sdpAnswer = JSON.stringify(answer);
      } catch (err) {
        console.warn('WebRTC answer creation error (falling back to loop):', err);
      }
    }

    const answerToken: CRDTPairingToken = {
      version: '1',
      deviceId: localDeviceId,
      deviceName: localDeviceName,
      pairingCode: token.pairingCode,
      publicKeyBase64: this.localKeyPair.publicKeyBase64,
      sdpOffer: sdpAnswer,
      createdAt: Date.now(),
    };

    // Register device in device manager
    p2pDeviceManager.registerDevice({
      id: token.deviceId,
      name: token.deviceName,
      publicKeyFingerprint: await computeSHA256Hex(token.publicKeyBase64),
      trustStatus: 'trusted',
    });

    this.emit({
      type: 'sas_ready',
      sasPhrase: session.sasPhrase,
      sasCode: session.sasCode,
      peerId: token.deviceId,
      peerName: token.deviceName,
    });

    // Notify coordinator
    crdtSyncCoordinator.attachTransport(
      token.deviceId,
      token.deviceName,
      (msg) => this.sendMessage(msg)
    );

    return {
      answerTokenString: btoa(JSON.stringify(answerToken)),
      sasPhrase: session.sasPhrase,
      sasCode: session.sasCode,
    };
  }

  /**
   * Completes pairing on Host side after receiving Answer Token
   */
  public async finalizeHostPairing(answerTokenString: string): Promise<{
    sasPhrase: string;
    sasCode: number;
  }> {
    if (!this.localKeyPair) throw new Error('Local key pair not initialized on host');

    const answerToken: CRDTPairingToken = JSON.parse(atob(answerTokenString));
    const session = await deriveSessionKeyAndSAS(
      this.localKeyPair.keyPair.privateKey,
      answerToken.publicKeyBase64
    );

    this.sessionKey = session.sessionKey;
    this.activePeerId = answerToken.deviceId;
    this.activePeerName = answerToken.deviceName;

    if (this.peerConnection && answerToken.sdpOffer) {
      try {
        const answerDesc = JSON.parse(answerToken.sdpOffer);
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerDesc));
      } catch (e) {
        console.warn('WebRTC remote description error:', e);
      }
    }

    p2pDeviceManager.registerDevice({
      id: answerToken.deviceId,
      name: answerToken.deviceName,
      publicKeyFingerprint: await computeSHA256Hex(answerToken.publicKeyBase64),
      trustStatus: 'trusted',
    });

    this.emit({
      type: 'sas_ready',
      sasPhrase: session.sasPhrase,
      sasCode: session.sasCode,
      peerId: answerToken.deviceId,
      peerName: answerToken.deviceName,
    });

    crdtSyncCoordinator.attachTransport(
      answerToken.deviceId,
      answerToken.deviceName,
      (msg) => this.sendMessage(msg)
    );

    return {
      sasPhrase: session.sasPhrase,
      sasCode: session.sasCode,
    };
  }

  /**
   * Sets up DataChannel event listeners and backpressure management
   */
  private setupDataChannel(channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = 64 * 1024; // 64KB buffer limit for flow control

    channel.onopen = () => {
      this.emit({
        type: 'connected',
        peerId: this.activePeerId || undefined,
        peerName: this.activePeerName || undefined,
      });
      // Send HELLO packet
      const localDeviceId = p2pDeviceManager.getLocalDeviceId();
      const localDeviceName = p2pDeviceManager.getLocalDeviceName();
      this.sendMessage({
        type: 'CRDT_HELLO',
        version: 'keep-crdt-sync/v1',
        deviceId: localDeviceId,
        deviceName: localDeviceName,
        vaultId: 'default-vault',
        nonce: Math.random().toString(36).slice(2),
      });
    };

    channel.onclose = () => {
      this.emit({ type: 'disconnected', peerId: this.activePeerId || undefined });
      crdtSyncCoordinator.detachTransport(this.activePeerId || undefined);
    };

    channel.onerror = (e) => {
      this.emit({ type: 'error', error: 'WebRTC DataChannel error' });
    };

    channel.onmessage = async (e) => {
      try {
        let rawJson: string;
        if (typeof e.data === 'string') {
          rawJson = e.data;
        } else {
          const dec = new TextDecoder();
          rawJson = dec.decode(e.data);
        }

        // Decrypt if encrypted with session key
        let payloadString = rawJson;
        if (this.sessionKey) {
          try {
            payloadString = await decryptPayload(rawJson, this.sessionKey);
          } catch {
            // If raw message without encryption
            payloadString = rawJson;
          }
        }

        const msg = JSON.parse(payloadString) as CRDTProtocolMessage;
        await crdtSyncCoordinator.handleIncomingMessage(msg);
      } catch (err) {
        console.error('Failed to parse incoming CRDT message:', err);
      }
    };
  }

  /**
   * Encrypts and transmits a CRDT protocol message across DataChannel (or BroadcastChannel fallback)
   */
  public async sendMessage(msg: CRDTProtocolMessage): Promise<void> {
    const rawJson = JSON.stringify(msg);
    let wireData: string = rawJson;

    if (this.sessionKey) {
      try {
        wireData = await encryptPayload(rawJson, this.sessionKey);
      } catch {
        wireData = rawJson;
      }
    }

    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(wireData);
    } else if (this.broadcastChannel) {
      // Local broadcast fallback
      const localDeviceId = p2pDeviceManager.getLocalDeviceId();
      this.broadcastChannel.postMessage({
        senderDeviceId: localDeviceId,
        payload: wireData,
      });
    }
  }

  /**
   * Handles incoming BroadcastChannel simulation packets
   */
  private async handleBroadcastMessage(data: any) {
    if (!data || !data.payload) return;
    const localDeviceId = p2pDeviceManager.getLocalDeviceId();
    if (data.senderDeviceId === localDeviceId) return; // ignore own broadcast

    try {
      let payloadString = data.payload;
      if (this.sessionKey) {
        try {
          payloadString = await decryptPayload(data.payload, this.sessionKey);
        } catch {
          payloadString = data.payload;
        }
      }

      const msg = JSON.parse(payloadString) as CRDTProtocolMessage;
      await crdtSyncCoordinator.handleIncomingMessage(msg);
    } catch (err) {
      // ignore foreign or malformed broadcast
    }
  }

  /**
   * Disconnects active session
   */
  public disconnect() {
    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {}
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }
    this.sessionKey = null;
    this.activePeerId = null;
    this.activePeerName = null;
    crdtSyncCoordinator.detachTransport();
    this.emit({ type: 'disconnected' });
  }
}

export const crdtP2PTransport = new CRDTP2PTransport();
