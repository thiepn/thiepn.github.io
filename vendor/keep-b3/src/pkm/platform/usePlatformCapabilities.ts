/**
 * V1.3 — React Hooks for Unified Platform Capabilities & Lifecycle
 */

import { useState, useEffect } from 'react';
import { PlatformCapabilities, AppLifecycleState } from './platformTypes';
import { platformRegistry } from './platformCapabilityRegistry';
import { platformLifecycleService } from './platformLifecycleService';
import { tabletWorkspaceEngine, AdaptiveWorkspaceState } from './tabletWorkspaceEngine';
import { pwaUpdateCoordinator, UpdateStatus } from './pwaUpdateCoordinator';

export function usePlatformCapabilities(): PlatformCapabilities {
  const [capabilities, setCapabilities] = useState<PlatformCapabilities>(() =>
    platformRegistry.getCapabilities()
  );

  useEffect(() => {
    return platformRegistry.subscribe((caps) => setCapabilities(caps));
  }, []);

  return capabilities;
}

export function useAppLifecycle(): { lifecycleState: AppLifecycleState; isObscured: boolean } {
  const [lifecycleState, setLifecycleState] = useState<AppLifecycleState>(() =>
    platformLifecycleService.getCurrentState()
  );

  useEffect(() => {
    return platformLifecycleService.subscribe((state) => setLifecycleState(state));
  }, []);

  return {
    lifecycleState,
    isObscured: platformLifecycleService.isObscured(),
  };
}

export function useAdaptiveWorkspace(): AdaptiveWorkspaceState {
  const [state, setState] = useState<AdaptiveWorkspaceState>(() =>
    tabletWorkspaceEngine.getState()
  );

  useEffect(() => {
    return tabletWorkspaceEngine.subscribe((s) => setState(s));
  }, []);

  return state;
}

export function useAppUpdate(): { updateStatus: UpdateStatus; applyUpdate: (force?: boolean) => boolean } {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(() =>
    pwaUpdateCoordinator.getStatus()
  );

  useEffect(() => {
    return pwaUpdateCoordinator.subscribe((s) => setUpdateStatus(s));
  }, []);

  return {
    updateStatus,
    applyUpdate: (force) => pwaUpdateCoordinator.applyUpdateNow(force),
  };
}
