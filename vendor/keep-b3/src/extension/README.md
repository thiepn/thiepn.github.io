# PKM Browser Extension Installation & Developer Guide

The PKM Browser Extension provides fast, privacy-preserving web clipping and fleeting notes into your offline-first PKM vault.

## How to Install (Unpacked Extension)

### Chromium (Google Chrome, Brave, Microsoft Edge, Arc, Opera)
1. Open your browser and navigate to `chrome://extensions` (or `edge://extensions` / `brave://extensions`).
2. Enable **Developer mode** using the toggle switch in the top right.
3. In the PKM web app, open **Settings > Browser Extension Integration** and click **Download Extension Files** (or build the package).
4. In your browser extensions manager, click **Load unpacked** and select the extension directory.
5. Click the extension icon in your toolbar, navigate to Settings, and paste your PKM pairing token.

### Mozilla Firefox
1. Navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select `src/extension/manifest.firefox.json`.
4. The extension will activate immediately with full context menu support.

## Keyboard Shortcuts
* **Ctrl+Shift+K** (Windows/Linux) or **Command+Shift+K** (macOS): Opens the Web Clipper popup instantly on any web page.
