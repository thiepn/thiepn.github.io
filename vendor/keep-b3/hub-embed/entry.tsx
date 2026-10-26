/**
 * Mount the ORIGINAL KEEP B3 App (and its complete React/crypto source graph)
 * inside a native same-origin Hub workspace. No iframe or copied record store.
 * Unbuilt candidate: must not be called until full source dependencies qualify.
 */
import React, { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from '../src/App';
import { createEmptyOriginalKeepHubDatabase } from '../src/services/storage';
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

/**
 * Owner-initiated first-use enrollment on the current Hub origin.
 * Uses the ORIGINAL storage v1 schema, never initializes note content.
 * Calling this cannot mount React, unlock a vault or replace existing data.
 */
export async function createOriginalKeepEmptyHubWorkspace(authority: KeepHubMountAuthority): Promise<void> {
  if (!authority || authority.revoked.aborted || !authority.mayMount() ||
      activeHandle || document.querySelector('[data-keep-original-react-active="true"]'))
    throw new Error('KEEP enrollment requires an authorized inactive Hub owner session.');
  await createEmptyOriginalKeepHubDatabase(authority.revoked);
  if (authority.revoked.aborted || !authority.mayMount())
    throw new Error('KEEP owner session expired after local enrollment.');
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
    // Release the ORIGINAL vault's key, async unlock generation, timers and global
    // activity listeners; no second key store or Hub crypto implementation.
    vaultEncryptionService.endHubSession();
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
    vaultEncryptionService.beginHubSession();
    root.render(<StrictMode><App /></StrictMode>);
    return handle;
  } catch (error) {
    handle.unmount();
    throw error;
  }
}
