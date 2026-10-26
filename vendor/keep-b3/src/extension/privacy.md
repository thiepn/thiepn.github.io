# PKM Web Clipper & Universal Capture Bridge — Privacy & Security Model

## 1. Zero Cloud Backend & Local-First Philosophy
* **No External Servers**: The extension communicates exclusively with your local or self-hosted PKM instance over localhost or explicit trusted origins using secure browser inter-process channels (`postMessage` and `BroadcastChannel`).
* **No Telemetry or Analytics**: The extension does not collect or transmit usage statistics, browsing history, or analytics.
* **No Third-Party AI Extraction**: All HTML-to-Markdown parsing and Readability filtering run deterministically inside your browser runtime.

## 2. Strict Input & Password Protection
* **Password Exemption**: The DOM parser explicitly strips and ignores `<input type="password">`, hidden form credentials, and sensitive autocomplete tokens.
* **Tracking Stripper**: URLs are normalized locally to strip tracking query parameters (`utm_source`, `utm_medium`, `utm_campaign`, `gclid`, `fbclid`, etc.) before persisting in notes.
* **Script Stripping**: All script tags, iframe embeds, and `javascript:` pseudo-schemes are sanitized before ingestion.

## 3. Cryptographic Pairing & Origin Hardening
* **Pairing Tokens**: Extension communication is protected by a high-entropy 256-bit pairing secret generated inside your PKM application.
* **Origin Whitelisting**: Messages from unwhitelisted origins are silently rejected.
* **Locked-Vault Safety**: If your PKM vault is locked with AES-GCM-256 encryption, the extension bridge stages captured content exclusively in transient volatile memory. It **never** writes unencrypted notes to disk or localStorage. When the vault is unlocked, queued captures are automatically committed to the encrypted store.

## 4. Minimal Extension Permissions
* `activeTab`: Grants access to extract text/HTML only when you explicitly click the extension popup or context menu.
* `contextMenus`: Adds right-click options for clipping selections, links, or images.
* `storage`: Caches your PKM app origin and temporary queue during browser suspensions.
