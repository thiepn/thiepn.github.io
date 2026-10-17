/**
 * Helper to store capability dispatcher ref for iframe bridges
 */
import { CapabilityDispatcher } from '../bridge/capabilityDispatcher';

export const capabilityDispatcherRef: { current: CapabilityDispatcher | null } = {
  current: null,
};
