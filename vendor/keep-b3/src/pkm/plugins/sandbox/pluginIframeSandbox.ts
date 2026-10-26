/**
 * Phase P41: Sandboxed Iframe Manager for Plugin Workspace Panels
 * Renders plugin UI inside an isolated iframe with sandbox="allow-scripts" (strictly NO allow-same-origin),
 * preventing direct access to the parent DOM, localStorage, IndexedDB, and cookies.
 */

import { PluginId, PluginManifest, PluginPermission } from '../types';

export interface IframeSandboxOptions {
  pluginId: PluginId;
  manifest: PluginManifest;
  grantedPermissions: PluginPermission[];
  htmlContent: string;
  theme: 'dark' | 'light';
  onRpcRequest: (method: string, params: any) => Promise<any>;
  onLog: (level: 'info' | 'warn' | 'error', message: string) => void;
  onCloseRequested?: () => void;
}

export function generateHardenedPluginHtml(options: IframeSandboxOptions): string {
  const { pluginId, manifest, grantedPermissions, htmlContent, theme } = options;

  // Safe CSS tokens corresponding to our PKM design system
  const themeStyles =
    theme === 'dark'
      ? `
      :root {
        --bg-primary: #18181b;
        --bg-secondary: #27272a;
        --bg-muted: #3f3f46;
        --text-primary: #f4f4f5;
        --text-secondary: #a1a1aa;
        --text-muted: #71717a;
        --accent: #6366f1;
        --accent-hover: #4f46e5;
        --border: #3f3f46;
        --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
    `
      : `
      :root {
        --bg-primary: #ffffff;
        --bg-secondary: #f4f4f5;
        --bg-muted: #e4e4e7;
        --text-primary: #18181b;
        --text-secondary: #52525b;
        --text-muted: #a1a1aa;
        --accent: #4f46e5;
        --accent-hover: #4338ca;
        --border: #e4e4e7;
        --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${manifest.name} (Sandboxed View)</title>
  <style>
    ${themeStyles}
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: var(--font-sans);
      background-color: var(--bg-primary);
      color: var(--text-primary);
      padding: 16px;
      font-size: 14px;
      line-height: 1.5;
      overflow-x: hidden;
    }
    button, input, select, textarea {
      font-family: inherit;
      font-size: inherit;
    }
  </style>
  <script>
    // Plugin Client Runtime Bridge
    (function() {
      const PLUGIN_ID = ${JSON.stringify(pluginId)};
      const GRANTED_PERMS = ${JSON.stringify(grantedPermissions)};
      let reqCounter = 0;
      const pendingMap = new Map();

      // Disable dangerous network globals
      try {
        if (typeof fetch !== 'undefined') {
          window.fetch = function() {
            return Promise.reject(new Error("Security Violation: Network access is disabled for plugins."));
          };
        }
        if (typeof XMLHttpRequest !== 'undefined') {
          window.XMLHttpRequest = function() {
            throw new Error("Security Violation: XMLHttpRequest is disabled for plugins.");
          };
        }
        if (typeof WebSocket !== 'undefined') {
          window.WebSocket = function() {
            throw new Error("Security Violation: WebSockets are disabled.");
          };
        }
      } catch (e) {}

      // Handle Escape key to allow keyboard focus escape
      window.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          window.parent.postMessage({
            protocol: 'pkm-plugin/1',
            type: 'escape_focus',
            pluginId: PLUGIN_ID
          }, '*');
        }
      });

      // Public API for iframe UI
      window.pkm = {
        pluginId: PLUGIN_ID,
        call: function(method, params) {
          const reqId = "iframe_req_" + (++reqCounter) + "_" + Math.random().toString(36).substring(2, 6);
          return new Promise(function(resolve, reject) {
            pendingMap.set(reqId, { resolve, reject });
            window.parent.postMessage({
              protocol: 'pkm-plugin/1',
              type: 'iframe_rpc_call',
              id: reqId,
              pluginId: PLUGIN_ID,
              method: method,
              params: params
            }, '*');
          });
        },
        storage: {
          get: function(key) { return window.pkm.call('storage.get', { key }); },
          set: function(key, val) { return window.pkm.call('storage.set', { key, value: val }); },
          delete: function(key) { return window.pkm.call('storage.delete', { key }); }
        },
        notes: {
          getCurrentNote: function() { return window.pkm.call('notes.getCurrentNote', {}); },
          getSelectedText: function() { return window.pkm.call('notes.getSelectedText', {}); },
          getMetadataIndex: function(filter) { return window.pkm.call('notes.getMetadataIndex', { filter }); }
        },
        log: function(msg, level) {
          window.parent.postMessage({
            protocol: 'pkm-plugin/1',
            type: 'iframe_log',
            pluginId: PLUGIN_ID,
            level: level || 'info',
            message: msg
          }, '*');
        }
      };

      window.addEventListener('message', function(e) {
        const data = e.data;
        if (!data || data.protocol !== 'pkm-plugin/1') return;

        if (data.type === 'iframe_rpc_response') {
          const cb = pendingMap.get(data.id);
          if (cb) {
            pendingMap.delete(data.id);
            if (data.error) cb.reject(new Error(data.error));
            else cb.resolve(data.result);
          }
        }
      });
    })();
  </script>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
}
