/**
 * PKM Phase P34: Browser Extension Client Bridge
 * Transport layer allowing popup and background service workers to communicate
 * securely with the PKM web application using postMessage / BroadcastChannel.
 */

import {
  CAPTURE_PROTOCOL_VERSION,
  BridgeMessage,
  CapturePayload,
  CaptureSubmitResult,
  BridgeStatusPayload,
} from '../../pkm/extensionBridge/captureProtocol';

export interface ExtensionClientConfig {
  appUrl: string; // Target PKM web app origin / URL
  pairingSecret: string;
  clientInstanceId: string;
  clientName: string;
}

export class ExtensionBridgeClient {
  private config: ExtensionClientConfig;

  constructor(config?: Partial<ExtensionClientConfig>) {
    this.config = {
      appUrl: config?.appUrl || 'http://localhost:3000',
      pairingSecret: config?.pairingSecret || '',
      clientInstanceId:
        config?.clientInstanceId ||
        `ext-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      clientName: config?.clientName || 'Browser Extension',
    };
  }

  public updateConfig(newConfig: Partial<ExtensionClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): ExtensionClientConfig {
    return { ...this.config };
  }

  /**
   * Executes a request to the PKM application via BroadcastChannel or postMessage window target
   */
  public async sendRequest<T = any, R = any>(
    type: BridgeMessage['type'],
    payload?: T,
    timeoutMs: number = 4000
  ): Promise<R> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const message: BridgeMessage<T> = {
      protocol: CAPTURE_PROTOCOL_VERSION,
      type,
      requestId,
      pairingSecret: this.config.pairingSecret,
      clientInstanceId: this.config.clientInstanceId,
      payload,
      timestamp: Date.now(),
    };

    // Strategy 1: Try BroadcastChannel if available in browser
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('keepnotes_capture_bridge');
        const responsePromise = new Promise<R>((resolve, reject) => {
          const timer = setTimeout(() => {
            bc.close();
            reject(new Error(`TIMEOUT: No response from PKM app within ${timeoutMs}ms.`));
          }, timeoutMs);

          bc.onmessage = (event) => {
            const resp = event.data as BridgeMessage;
            if (resp && resp.requestId === requestId) {
              clearTimeout(timer);
              bc.close();
              if (resp.payload && (resp.payload as any).error) {
                reject(new Error((resp.payload as any).error));
              } else {
                resolve(resp.payload as R);
              }
            }
          };
        });

        bc.postMessage(message);
        return await responsePromise;
      } catch (_bcErr) {
        // Fallback to window/tab messaging
      }
    }

    // Strategy 2: Window postMessage if inside an iframe or paired tab
    if (typeof window !== 'undefined' && window.opener) {
      return new Promise<R>((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener('message', listener);
          reject(new Error(`TIMEOUT: PKM window response timed out.`));
        }, timeoutMs);

        const listener = (event: MessageEvent) => {
          const resp = event.data as BridgeMessage;
          if (resp && resp.requestId === requestId) {
            clearTimeout(timer);
            window.removeEventListener('message', listener);
            if (resp.payload && (resp.payload as any).error) {
              reject(new Error((resp.payload as any).error));
            } else {
              resolve(resp.payload as R);
            }
          }
        };

        window.addEventListener('message', listener);
        window.opener.postMessage(message, '*');
      });
    }

    throw new Error('PKM_UNREACHABLE: No active PKM tab or BroadcastChannel detected.');
  }

  public async performHandshake(): Promise<{
    authenticated: boolean;
    appTitle: string;
    vaultLocked: boolean;
    error?: string;
  }> {
    return this.sendRequest('HANDSHAKE_REQUEST', {
      clientName: this.config.clientName,
    });
  }

  public async checkStatus(): Promise<BridgeStatusPayload> {
    return this.sendRequest('STATUS_REQUEST');
  }

  public async submitCapture(payload: CapturePayload): Promise<CaptureSubmitResult> {
    return this.sendRequest('CAPTURE_SUBMIT_REQUEST', payload);
  }
}
