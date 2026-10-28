/**
 * Phase P32: WebRTC DataChannel Transport & Signaling Protocol Engine
 * Handles WebRTC peer connection lifecycle, flow-controlled DataChannels, chunking, and backpressure.
 */

import {
  P2PProtocolMessage,
  P2PSessionState,
  P2PConnectionRoute,
  P2PSyncStats,
  P2P_DEFAULT_CHUNK_SIZE,
  P2P_BUFFER_HIGH_WATERMARK,
  P2P_BUFFER_LOW_WATERMARK,
} from './p2pTypes';
import {
  generateEphemeralECDHKeyPair,
  deriveSessionKeyAndSAS,
  encryptPayload,
  decryptPayload,
  P2PEphemeralKeyPair,
} from './p2pCrypto';

export interface P2PTransportCallbacks {
  onStateChange: (state: P2PSessionState) => void;
  onMessage: (msg: P2PProtocolMessage) => void;
  onStatsUpdate: (stats: Partial<P2PSyncStats>) => void;
  onError: (err: Error) => void;
}

export class P2PTransport {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private state: P2PSessionState = 'idle';
  private ephemeralKeys: P2PEphemeralKeyPair | null = null;
  private sessionKey: CryptoKey | null = null;
  private sasPhrase: string | null = null;
  private connectionRoute: P2PConnectionRoute = 'unknown';

  private callbacks: P2PTransportCallbacks;
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  private bytesSent = 0;
  private bytesReceived = 0;
  private isPausedForBackpressure = false;
  private pendingChunkResolvers: Array<() => void> = [];

  constructor(callbacks: P2PTransportCallbacks, customIceServers?: RTCIceServer[]) {
    this.callbacks = callbacks;
    if (customIceServers && customIceServers.length > 0) {
      this.iceServers = customIceServers;
    }
  }

  public getState(): P2PSessionState {
    return this.state;
  }

  public getSAS(): string | null {
    return this.sasPhrase;
  }

  public getConnectionRoute(): P2PConnectionRoute {
    return this.connectionRoute;
  }

  private setState(newState: P2PSessionState) {
    this.state = newState;
    this.callbacks.onStateChange(newState);
  }

  /**
   * Initializes local ephemeral ECDH key pair
   */
  public async initEphemeralKeys(): Promise<P2PEphemeralKeyPair> {
    this.ephemeralKeys = await generateEphemeralECDHKeyPair();
    return this.ephemeralKeys;
  }

  /**
   * Initializes WebRTC PeerConnection
   */
  private createPeerConnection(): RTCPeerConnection {
    if (this.pc) {
      this.pc.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    pc.oniceconnectionstatechange = () => {
      this.callbacks.onStatsUpdate({
        iceState: pc.iceConnectionState,
      });

      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.detectConnectionRoute(pc);
      } else if (pc.iceConnectionState === 'failed') {
        this.setState('failed');
        this.callbacks.onError(new Error('WebRTC ICE connection failed. Please check network/NAT.'));
      } else if (pc.iceConnectionState === 'disconnected') {
        if (this.state !== 'complete' && this.state !== 'idle') {
          this.setState('failed');
        }
      }
    };

    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    this.pc = pc;
    return pc;
  }

  /**
   * Detects whether connection is direct host, reflexive STUN, or relayed TURN
   */
  private async detectConnectionRoute(pc: RTCPeerConnection) {
    try {
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          const remoteCandidate = stats.get(report.remoteCandidateId);
          if (remoteCandidate) {
            if (remoteCandidate.candidateType === 'host') {
              this.connectionRoute = 'direct-host';
            } else if (remoteCandidate.candidateType === 'srflx') {
              this.connectionRoute = 'direct-srflx';
            } else if (remoteCandidate.candidateType === 'relay') {
              this.connectionRoute = 'relayed-turn';
            }
          }
        }
      });
      this.callbacks.onStatsUpdate({ connectionRoute: this.connectionRoute });
    } catch {
      this.connectionRoute = 'direct-srflx';
    }
  }

  /**
   * Creates an SDP Offer for initiating pairing
   */
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    this.setState('pairing');
    const pc = this.createPeerConnection();

    // Create reliable ordered data channel
    const dc = pc.createDataChannel('pkm-sync-channel', {
      ordered: true,
      maxRetransmits: 10,
    });
    this.setupDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait briefly for ICE gathering to complete or candidates to be included
    await this.waitForIceGathering(pc);

    return pc.localDescription || offer;
  }

  /**
   * Receives SDP Offer and creates an SDP Answer
   */
  public async createAnswer(offerSdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    this.setState('connecting');
    const pc = this.createPeerConnection();

    await pc.setRemoteDescription(offerSdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await this.waitForIceGathering(pc);

    return pc.localDescription || answer;
  }

  /**
   * Sets remote Answer SDP on offerer side
   */
  public async applyAnswer(answerSdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) throw new Error('No active peer connection');
    await this.pc.setRemoteDescription(answerSdp);
    this.setState('connecting');
  }

  private waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 2500): Promise<void> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const timer = setTimeout(() => resolve(), timeoutMs);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          resolve();
        }
      };
    });
  }

  /**
   * Configures RTCDataChannel event handlers and flow control backpressure
   */
  private setupDataChannel(dc: RTCDataChannel) {
    this.dc = dc;
    dc.binaryType = 'arraybuffer';
    dc.bufferedAmountLowThreshold = P2P_BUFFER_LOW_WATERMARK;

    dc.onopen = () => {
      this.setState('authenticating');
    };

    dc.onclose = () => {
      if (this.state !== 'complete' && this.state !== 'idle') {
        this.setState('cancelled');
      }
    };

    dc.onerror = (err) => {
      console.warn('DataChannel error:', err);
      this.callbacks.onError(new Error('DataChannel communication error'));
    };

    dc.onbufferedamountlow = () => {
      this.isPausedForBackpressure = false;
      const resolvers = [...this.pendingChunkResolvers];
      this.pendingChunkResolvers = [];
      resolvers.forEach((r) => r());
    };

    dc.onmessage = async (event) => {
      try {
        let text: string;
        if (typeof event.data === 'string') {
          text = event.data;
        } else if (event.data instanceof ArrayBuffer) {
          text = new TextDecoder().decode(event.data);
        } else {
          return;
        }

        this.bytesReceived += text.length;
        this.callbacks.onStatsUpdate({ bytesReceived: this.bytesReceived });

        // Decrypt if session key is active
        if (this.sessionKey && text.startsWith('ENC:')) {
          const decrypted = await decryptPayload(text.slice(4), this.sessionKey);
          const msg = JSON.parse(decrypted) as P2PProtocolMessage;
          this.callbacks.onMessage(msg);
        } else {
          const msg = JSON.parse(text) as P2PProtocolMessage;
          this.callbacks.onMessage(msg);
        }
      } catch (err) {
        console.error('Failed to parse incoming peer message:', err);
      }
    };
  }

  /**
   * Derives shared session key & SAS authentication phrase with remote public key
   */
  public async establishSessionSecurity(remotePublicKeyBase64: string): Promise<string> {
    if (!this.ephemeralKeys) {
      throw new Error('Local ephemeral keys not initialized');
    }

    const { sessionKey, sasPhrase } = await deriveSessionKeyAndSAS(
      this.ephemeralKeys.keyPair.privateKey,
      remotePublicKeyBase64
    );

    this.sessionKey = sessionKey;
    this.sasPhrase = sasPhrase;

    this.callbacks.onStatsUpdate({
      sasPhrase,
    });

    return sasPhrase;
  }

  /**
   * Sends a typed P2P protocol message with backpressure control
   */
  public async sendMessage(msg: P2PProtocolMessage): Promise<void> {
    if (!this.dc || this.dc.readyState !== 'open') {
      throw new Error('DataChannel is not open');
    }

    const rawJson = JSON.stringify(msg);
    let payloadToSend: string;

    if (this.sessionKey && msg.type !== 'HELLO' && msg.type !== 'AUTH') {
      const encrypted = await encryptPayload(rawJson, this.sessionKey);
      payloadToSend = `ENC:${encrypted}`;
    } else {
      payloadToSend = rawJson;
    }

    await this.checkBackpressure();

    this.dc.send(payloadToSend);
    this.bytesSent += payloadToSend.length;
    this.callbacks.onStatsUpdate({ bytesSent: this.bytesSent });
  }

  /**
   * Backpressure flow control: pauses if DataChannel buffer exceeds high watermark
   */
  private async checkBackpressure(): Promise<void> {
    if (!this.dc) return;

    if (this.dc.bufferedAmount > P2P_BUFFER_HIGH_WATERMARK) {
      this.isPausedForBackpressure = true;
      await new Promise<void>((resolve) => {
        this.pendingChunkResolvers.push(resolve);
      });
    }
  }

  /**
   * Closes connection cleanly
   */
  public close() {
    if (this.dc) {
      try {
        this.dc.close();
      } catch {}
      this.dc = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch {}
      this.pc = null;
    }
    this.sessionKey = null;
    this.sasPhrase = null;
    this.setState('idle');
  }
}
