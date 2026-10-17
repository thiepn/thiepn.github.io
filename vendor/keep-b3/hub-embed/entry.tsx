/**
 * Mount the ORIGINAL KEEP B3 App (and its complete React/crypto source graph)
 * inside a native same-origin Hub workspace. No iframe or copied record store.
 * Unbuilt candidate: must not be called until full source dependencies qualify.
 */
import React, { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from '../src/App';
import { vaultEncryptionService } from '../src/pkm/encryption/vaultEncryptionService';
import '../src/index.css';

/** A Hub account's authorization and privacy cancellation, NOT a vault key. */
export interface KeepHubMountAuthority {
  mayMount(): boolean;
  revoked: AbortSignal;
}
export interface KeepMountHandle {
  lock(): void;
  unmount(): void;
  isEncrypted(): boolean;
  isUnlocked(): boolean;
}

const ACTIVE_FLAG = 'data-keep-original-react-active';
let activeHandle: KeepMountHandle | null = null;

export function mountOriginalKeep(container: HTMLElement, authority: KeepHubMountAuthority): KeepMountHandle {
  if (!authority || authority.revoked.aborted || !authority.mayMount()) {
    throw new Error('Original KEEP mount requires live Hub owner authorization.');
  }
  if (!container.isConnected || container.childElementCount !== 0 || container.closest('[data-keep-owner]') || activeHandle ||
      document.querySelector(`[${ACTIVE_FLAG}="true"]`)) {
    throw new Error('Original KEEP requires one empty native workspace and a single source writer.');
  }

  // Mark the original source as authoritative BEFORE React starts running.
  container.setAttribute(ACTIVE_FLAG, 'true');
  document.dispatchEvent(new Event('keep-original-react-mounted'));
  let root: Root;
  try { root = createRoot(container); }
  catch (error) { container.removeAttribute(ACTIVE_FLAG); throw error; }
  let live = true;
  const lock = () => {
    // This is the ORIGINAL vault lock + cache purge, not a parallel key handler.
    if (vaultEncryptionService.isEncryptionEnabled()) vaultEncryptionService.lockVault();
  };
  const onRevoke = () => handle.unmount();
  const handle: KeepMountHandle = {
    lock,
    isEncrypted: () => vaultEncryptionService.isEncryptionEnabled(),
    isUnlocked: () => live && vaultEncryptionService.isVaultUnlocked(),
    unmount: () => {
      if (!live) return;
      live = false;
      authority.revoked.removeEventListener('abort', onRevoke);
      try { lock(); }
      finally {
        try { root.unmount(); }
        finally {
          activeHandle = null;
          container.removeAttribute(ACTIVE_FLAG);
          document.dispatchEvent(new Event('keep-original-react-unmounted'));
        }
      }
    },
  };
  activeHandle = handle;
  authority.revoked.addEventListener('abort', onRevoke, {once:true});
  try {
    if (authority.revoked.aborted || !authority.mayMount()) throw new Error('KEEP owner authorization expired.');
    root.render(<StrictMode><App /></StrictMode>);
    return handle;
  } catch (error) {
    handle.unmount();
    throw error;
  }
}
