/**
 * PKM Phase P34: Extension Package Exporter
 * Generates ready-to-load unpacked browser extension bundles and installation assets.
 */

import { ExtensionBridgeConfig } from './captureProtocol';

export function generateExtensionManifestJSON(targetBrowser: 'chromium' | 'firefox' = 'chromium'): string {
  if (targetBrowser === 'firefox') {
    return JSON.stringify(
      {
        manifest_version: 2,
        name: 'PKM Web Clipper & Universal Capture',
        version: '1.0.0',
        description: 'Fast, private web clipper and fleeting note capture bridge for your offline-first PKM vault.',
        permissions: ['activeTab', 'contextMenus', 'storage', 'http://*/*', 'https://*/*'],
        browser_action: {
          default_popup: 'popup.html',
          default_title: 'Clip to PKM',
        },
        background: {
          scripts: ['serviceWorker.js'],
        },
        commands: {
          'quick-capture-command': {
            suggested_key: {
              default: 'Ctrl+Shift+K',
              mac: 'Command+Shift+K',
            },
            description: 'Open PKM Web Clipper popup',
          },
        },
        browser_specific_settings: {
          gecko: {
            id: 'pkm-web-clipper@local.vault',
            strict_min_version: '109.0',
          },
        },
      },
      null,
      2
    );
  }

  return JSON.stringify(
    {
      manifest_version: 3,
      name: 'PKM Web Clipper & Universal Capture',
      version: '1.0.0',
      description: 'Fast, private web clipper and fleeting note capture bridge for your offline-first PKM vault.',
      permissions: ['activeTab', 'contextMenus', 'storage'],
      host_permissions: ['http://*/*', 'https://*/*'],
      action: {
        default_popup: 'popup.html',
        default_title: 'Clip to PKM',
      },
      background: {
        service_worker: 'serviceWorker.js',
      },
      commands: {
        'quick-capture-command': {
          suggested_key: {
            default: 'Ctrl+Shift+K',
            mac: 'Command+Shift+K',
          },
          description: 'Open PKM Web Clipper popup',
        },
      },
    },
    null,
    2
  );
}

/**
 * Downloads a standalone configuration / installation package text file
 */
export function downloadExtensionSetupGuide(config: ExtensionBridgeConfig): void {
  if (typeof window === 'undefined' || !window.document) return;

  const content = `# PKM Browser Extension Setup Instructions

## 1. Connection Details
* App Origin: ${window.location.origin}
* Pairing Secret: ${config.pairingSecret}
* Protocol Version: pkm-capture/1

## 2. Fast Pairing
1. In your browser's extension manager (chrome://extensions or about:debugging), load the unpacked extension.
2. Open the PKM Web Clipper popup on any webpage.
3. Open Settings inside the popup and paste your pairing secret:
   ${config.pairingSecret}
4. Click "Save Configuration". The badge will change to a green "Ready" indicator.
`;

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'PKM_Extension_Setup.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
