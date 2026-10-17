/**
 * Phase P41: Web Worker Sandbox Runtime
 * Spawns an isolated Web Worker with environment hardening, strict watchdog timeouts,
 * and structured RPC message passing.
 */

import { PluginId, PluginManifest, PluginPermission } from '../types';

export interface WorkerRpcRequest {
  id: string;
  protocol: 'pkm-plugin/1';
  method: string;
  params: any;
}

export interface WorkerRpcResponse {
  id: string;
  protocol: 'pkm-plugin/1';
  result?: any;
  error?: string;
}

export interface WorkerSandboxOptions {
  pluginId: PluginId;
  manifest: PluginManifest;
  grantedPermissions: PluginPermission[];
  workerCode: string;
  onRpcRequest: (req: WorkerRpcRequest) => Promise<any>;
  onLog: (level: 'debug' | 'info' | 'warn' | 'error', message: string, details?: any) => void;
  onCrash: (reason: string) => void;
}

export class PluginWorkerSandbox {
  private worker: Worker | null = null;
  private blobUrl: string | null = null;
  private isTerminated = false;
  private activePendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timer: any }>();
  private heartbeatTimer: any = null;

  constructor(private options: WorkerSandboxOptions) {}

  public async start(): Promise<void> {
    if (this.worker) return;

    // Wrap the worker code in a security harness that strips unauthorized networking and APIs
    const hardenedWorkerScript = `
      // PKM Plugin Sandbox Runtime (protocol pkm-plugin/1)
      (function() {
        const PLUGIN_ID = ${JSON.stringify(this.options.pluginId)};
        const GRANTED_PERMISSIONS = ${JSON.stringify(this.options.grantedPermissions)};
        
        // Disable dangerous or non-permitted global networking APIs
        try {
          if (typeof fetch !== 'undefined') {
            self.fetch = function() {
              return Promise.reject(new Error("Security Error: Network access is disabled for plugins in this PKM environment."));
            };
          }
          if (typeof XMLHttpRequest !== 'undefined') {
            self.XMLHttpRequest = function() {
              throw new Error("Security Error: XMLHttpRequest is disabled for plugins.");
            };
          }
          if (typeof WebSocket !== 'undefined') {
            self.WebSocket = function() {
              throw new Error("Security Error: WebSockets are disabled for plugins.");
            };
          }
          if (typeof EventSource !== 'undefined') {
            self.EventSource = function() {
              throw new Error("Security Error: EventSource is disabled for plugins.");
            };
          }
          if (typeof indexedDB !== 'undefined') {
            // Shadow direct IndexedDB access to prevent origin storage tampering
            Object.defineProperty(self, 'indexedDB', {
              get: function() {
                throw new Error("Security Error: Direct IndexedDB access is prohibited. Use api.storage APIs.");
              }
            });
          }
        } catch (e) {}

        // RPC Bridge dispatcher
        let pendingCallbacks = new Map();
        let messageCounter = 0;

        function callHost(method, params) {
          const reqId = "req_" + (++messageCounter) + "_" + Math.random().toString(36).substring(2, 7);
          return new Promise((resolve, reject) => {
            pendingCallbacks.set(reqId, { resolve, reject });
            self.postMessage({
              protocol: 'pkm-plugin/1',
              type: 'rpc_call',
              id: reqId,
              method: method,
              params: params
            });
          });
        }

        // Plugin Public API Object exposed to worker code
        const pkmApi = {
          pluginId: PLUGIN_ID,
          hasPermission: function(perm) {
            return GRANTED_PERMISSIONS.includes(perm);
          },
          commands: {
            register: function(cmd) {
              return callHost('commands.register', cmd);
            }
          },
          notes: {
            getSelectedText: function() {
              return callHost('notes.getSelectedText', {});
            },
            replaceSelectedText: function(newText) {
              return callHost('notes.replaceSelectedText', { newText: newText });
            },
            getCurrentNote: function() {
              return callHost('notes.getCurrentNote', {});
            },
            mutateCurrentNote: function(expectedVersion, operations) {
              return callHost('notes.mutateCurrentNote', { expectedVersion: expectedVersion, operations: operations });
            },
            getMetadataIndex: function(filter) {
              return callHost('notes.getMetadataIndex', { filter: filter });
            }
          },
          search: {
            queryMetadata: function(query) {
              return callHost('search.queryMetadata', { query: query });
            }
          },
          storage: {
            get: function(key) {
              return callHost('storage.get', { key: key });
            },
            set: function(key, value) {
              return callHost('storage.set', { key: key, value: value });
            },
            delete: function(key) {
              return callHost('storage.delete', { key: key });
            },
            listKeys: function() {
              return callHost('storage.listKeys', {});
            }
          },
          log: {
            info: function(msg, details) {
              self.postMessage({ protocol: 'pkm-plugin/1', type: 'log', level: 'info', message: msg, details: details });
            },
            warn: function(msg, details) {
              self.postMessage({ protocol: 'pkm-plugin/1', type: 'log', level: 'warn', message: msg, details: details });
            },
            error: function(msg, details) {
              self.postMessage({ protocol: 'pkm-plugin/1', type: 'log', level: 'error', message: msg, details: details });
            }
          }
        };

        // Message handler from Host
        self.onmessage = function(e) {
          const data = e.data;
          if (!data || data.protocol !== 'pkm-plugin/1') return;

          if (data.type === 'rpc_response') {
            const cb = pendingCallbacks.get(data.id);
            if (cb) {
              pendingCallbacks.delete(data.id);
              if (data.error) cb.reject(new Error(data.error));
              else cb.resolve(data.result);
            }
          } else if (data.type === 'invoke_command') {
            if (typeof self.onCommand === 'function') {
              Promise.resolve(self.onCommand(data.commandId, data.context, pkmApi))
                .then(function(res) {
                  self.postMessage({ protocol: 'pkm-plugin/1', type: 'command_result', id: data.id, result: res });
                })
                .catch(function(err) {
                  self.postMessage({ protocol: 'pkm-plugin/1', type: 'command_result', id: data.id, error: err.message || String(err) });
                });
            } else {
              self.postMessage({ protocol: 'pkm-plugin/1', type: 'command_result', id: data.id, error: "No onCommand handler declared by plugin worker." });
            }
          } else if (data.type === 'vault_event') {
            if (typeof self.onVaultEvent === 'function') {
              try {
                self.onVaultEvent(data.event, pkmApi);
              } catch (err) {}
            }
          } else if (data.type === 'ping') {
            self.postMessage({ protocol: 'pkm-plugin/1', type: 'pong', id: data.id });
          }
        };

        // Execute user worker code inside enclosed scope
        try {
          ${this.options.workerCode}
          
          if (typeof onActivate === 'function') {
            onActivate(pkmApi);
          }
          self.postMessage({ protocol: 'pkm-plugin/1', type: 'activated' });
        } catch (initErr) {
          self.postMessage({ protocol: 'pkm-plugin/1', type: 'error', message: "Initialization error: " + initErr.message, stack: initErr.stack });
        }
      })();
    `;

    const blob = new Blob([hardenedWorkerScript], { type: 'application/javascript' });
    this.blobUrl = URL.createObjectURL(blob);
    this.worker = new Worker(this.blobUrl);

    this.worker.onmessage = async (e) => {
      const data = e.data;
      if (!data || data.protocol !== 'pkm-plugin/1') return;

      if (data.type === 'rpc_call') {
        try {
          const result = await this.options.onRpcRequest({
            id: data.id,
            protocol: 'pkm-plugin/1',
            method: data.method,
            params: data.params,
          });
          if (this.worker && !this.isTerminated) {
            this.worker.postMessage({
              protocol: 'pkm-plugin/1',
              type: 'rpc_response',
              id: data.id,
              result,
            });
          }
        } catch (err: any) {
          if (this.worker && !this.isTerminated) {
            this.worker.postMessage({
              protocol: 'pkm-plugin/1',
              type: 'rpc_response',
              id: data.id,
              error: err.message || 'Unknown RPC execution error',
            });
          }
        }
      } else if (data.type === 'command_result') {
        const pending = this.activePendingRequests.get(data.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.activePendingRequests.delete(data.id);
          if (data.error) pending.reject(new Error(data.error));
          else pending.resolve(data.result);
        }
      } else if (data.type === 'pong') {
        const pending = this.activePendingRequests.get(data.id);
        if (pending) {
          clearTimeout(pending.timer);
          this.activePendingRequests.delete(data.id);
          pending.resolve(true);
        }
      } else if (data.type === 'log') {
        this.options.onLog(data.level || 'info', data.message, data.details);
      } else if (data.type === 'activated') {
        this.options.onLog('info', `Plugin "${this.options.manifest.name}" activated in worker sandbox.`);
      } else if (data.type === 'error') {
        this.options.onLog('error', data.message, data.stack);
        this.options.onCrash(data.message);
      }
    };

    this.worker.onerror = (err) => {
      const msg = err.message || 'Uncaught exception in plugin worker';
      this.options.onLog('error', `Worker crash: ${msg}`);
      this.options.onCrash(msg);
    };
  }

  public async invokeCommand(commandId: string, context: any, timeoutMs = 8000): Promise<any> {
    if (!this.worker || this.isTerminated) {
      throw new Error(`Plugin ${this.options.pluginId} worker is not running.`);
    }

    const reqId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.activePendingRequests.delete(reqId);
        this.options.onCrash(`Command execution timed out after ${timeoutMs}ms (Watchdog Triggered).`);
        this.terminate();
        reject(new Error(`Plugin command timed out after ${timeoutMs}ms (Watchdog terminated worker).`));
      }, timeoutMs);

      this.activePendingRequests.set(reqId, { resolve, reject, timer });

      this.worker?.postMessage({
        protocol: 'pkm-plugin/1',
        type: 'invoke_command',
        id: reqId,
        commandId,
        context,
      });
    });
  }

  public notifyVaultEvent(event: { type: string; resourceId: string; timestamp: number }): void {
    if (!this.worker || this.isTerminated) return;
    this.worker.postMessage({
      protocol: 'pkm-plugin/1',
      type: 'vault_event',
      event,
    });
  }

  public async ping(timeoutMs = 3000): Promise<boolean> {
    if (!this.worker || this.isTerminated) return false;
    const reqId = `ping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.activePendingRequests.delete(reqId);
        resolve(false);
      }, timeoutMs);

      this.activePendingRequests.set(reqId, {
        resolve: () => resolve(true),
        reject: () => resolve(false),
        timer,
      });

      this.worker?.postMessage({
        protocol: 'pkm-plugin/1',
        type: 'ping',
        id: reqId,
      });
    });
  }

  public terminate(): void {
    this.isTerminated = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    for (const [, req] of this.activePendingRequests) {
      clearTimeout(req.timer);
      req.reject(new Error('Plugin worker terminated.'));
    }
    this.activePendingRequests.clear();

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }
}
